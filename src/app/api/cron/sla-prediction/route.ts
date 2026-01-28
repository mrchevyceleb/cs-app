import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import type { Ticket, SLAPredictionFactors, SLAPredictionInsert } from '@/types/database'

const JOB_NAME = 'sla-prediction'

// Configuration
const HIGH_RISK_THRESHOLD = 0.7 // 70% probability = high risk
const WARNING_HOURS_THRESHOLD = 4 // Warn if breach likely within 4 hours
const NOTIFY_ON_HIGH_RISK = true

interface TicketWithSla extends Ticket {
  sla_policy?: {
    id: string
    name: string
    first_response_hours: number
    resolution_hours: number
  } | null
}

interface PredictionResult {
  ticketId: string
  predictionType: 'first_response' | 'resolution'
  probability: number
  hoursUntilDue: number
  factors: SLAPredictionFactors
  recommendation: string
}

/**
 * Calculate breach probability based on various factors
 */
function calculateBreachProbability(
  hoursUntilDue: number,
  factors: SLAPredictionFactors
): number {
  // Base probability increases as deadline approaches
  let probability = 0

  // Time-based risk (exponential curve)
  if (hoursUntilDue <= 0) {
    probability = 1.0 // Already overdue
  } else if (hoursUntilDue <= 1) {
    probability = 0.85
  } else if (hoursUntilDue <= 2) {
    probability = 0.7
  } else if (hoursUntilDue <= 4) {
    probability = 0.5
  } else if (hoursUntilDue <= 8) {
    probability = 0.3
  } else if (hoursUntilDue <= 24) {
    probability = 0.15
  } else {
    probability = 0.05
  }

  // Adjust based on queue depth (more tickets = higher risk)
  if (factors.queue_depth) {
    if (factors.queue_depth > 50) probability += 0.15
    else if (factors.queue_depth > 20) probability += 0.1
    else if (factors.queue_depth > 10) probability += 0.05
  }

  // Adjust based on ticket complexity
  if (factors.ticket_complexity) {
    probability += factors.ticket_complexity * 0.1 // Max +0.1 for high complexity
  }

  // Adjust based on agent workload
  if (factors.agent_workload) {
    if (factors.agent_workload > 10) probability += 0.15
    else if (factors.agent_workload > 5) probability += 0.1
  }

  // Adjust based on historical breach rate
  if (factors.historical_breach_rate) {
    probability += factors.historical_breach_rate * 0.2 // Max +0.2 for 100% breach rate
  }

  // Cap at 1.0
  return Math.min(probability, 1.0)
}

/**
 * Generate recommendation based on prediction
 */
function generateRecommendation(
  probability: number,
  hoursUntilDue: number,
  predictionType: string
): string {
  if (probability >= 0.9) {
    return `URGENT: ${predictionType === 'first_response' ? 'First response' : 'Resolution'} SLA breach imminent. Immediate action required.`
  } else if (probability >= 0.7) {
    return `HIGH RISK: Consider prioritizing this ticket. ${hoursUntilDue.toFixed(1)} hours until ${predictionType === 'first_response' ? 'first response' : 'resolution'} deadline.`
  } else if (probability >= 0.5) {
    return `MODERATE RISK: Monitor this ticket closely. Breach possible if not addressed within ${hoursUntilDue.toFixed(1)} hours.`
  } else {
    return `LOW RISK: Currently on track for SLA compliance.`
  }
}

/**
 * POST /api/cron/sla-prediction
 * Predict SLA breaches and create alerts
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()

    // Get queue depth (open + pending tickets)
    const { count: queueDepth } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'pending'])

    // Get tickets that are:
    // 1. Not resolved or closed
    // 2. Have SLA policy
    // 3. Have either first_response_due_at or resolution_due_at set
    const { data: ticketsWithSla, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        *,
        sla_policy:sla_policies(id, name, first_response_hours, resolution_hours)
      `)
      .in('status', ['open', 'pending', 'escalated'])
      .not('sla_policy_id', 'is', null)
      .order('created_at', { ascending: true })

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    if (!ticketsWithSla || ticketsWithSla.length === 0) {
      logCronExecution(JOB_NAME, 'completed', {
        ticketsAnalyzed: 0,
        predictionsCreated: 0,
      })
      return NextResponse.json({
        success: true,
        ticketsAnalyzed: 0,
        predictionsCreated: 0,
        highRiskCount: 0,
      })
    }

    // Get agent workload (tickets per online agent)
    const { data: onlineAgents } = await supabase
      .from('agents')
      .select('id')
      .eq('status', 'online')

    const agentCount = onlineAgents?.length || 1
    const agentWorkload = Math.ceil((queueDepth || 0) / agentCount)

    // Calculate historical breach rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('first_response_breached, resolution_breached')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'resolved')

    const breachedCount = recentTickets?.filter(
      (t) => t.first_response_breached || t.resolution_breached
    ).length || 0
    const historicalBreachRate = recentTickets?.length
      ? breachedCount / recentTickets.length
      : 0

    const predictions: PredictionResult[] = []
    let predictionsCreated = 0
    let highRiskCount = 0
    let notificationsSent = 0
    let errors = 0

    // Analyze each ticket
    for (const ticket of ticketsWithSla as TicketWithSla[]) {
      try {
        const factors: SLAPredictionFactors = {
          queue_depth: queueDepth || 0,
          agent_workload: agentWorkload,
          historical_breach_rate: historicalBreachRate,
          time_of_day: now.toTimeString().slice(0, 5),
          day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        }

        // Check first response SLA
        if (ticket.first_response_due_at && !ticket.first_response_at) {
          const dueDate = new Date(ticket.first_response_due_at)
          const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)

          // Only predict for tickets due within 24 hours
          if (hoursUntilDue <= 24) {
            const probability = calculateBreachProbability(hoursUntilDue, factors)
            const recommendation = generateRecommendation(probability, hoursUntilDue, 'first_response')

            const prediction: PredictionResult = {
              ticketId: ticket.id,
              predictionType: 'first_response',
              probability,
              hoursUntilDue,
              factors,
              recommendation,
            }
            predictions.push(prediction)

            // Save prediction to database
            const predictionInsert: SLAPredictionInsert = {
              ticket_id: ticket.id,
              prediction_type: 'first_response',
              predicted_breach_probability: probability,
              predicted_breach_at: dueDate.toISOString(),
              hours_until_breach: hoursUntilDue,
              contributing_factors: factors,
              recommendation,
            }

            const { error: insertError } = await supabase
              .from('sla_predictions')
              .insert(predictionInsert)

            if (insertError) {
              console.error(`[${JOB_NAME}] Error saving prediction for ticket ${ticket.id}:`, insertError)
              errors++
            } else {
              predictionsCreated++
            }

            if (probability >= HIGH_RISK_THRESHOLD) {
              highRiskCount++

              // Send notification if enabled and not already notified
              if (NOTIFY_ON_HIGH_RISK && hoursUntilDue <= WARNING_HOURS_THRESHOLD) {
                // Check if we've already sent a notification for this prediction
                const { data: existingNotification } = await supabase
                  .from('sla_predictions')
                  .select('notification_sent')
                  .eq('ticket_id', ticket.id)
                  .eq('prediction_type', 'first_response')
                  .eq('notification_sent', true)
                  .gte('created_at', new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString())
                  .limit(1)

                if (!existingNotification || existingNotification.length === 0) {
                  // Create agent notification
                  if (ticket.assigned_agent_id) {
                    await supabase
                      .from('agent_notifications')
                      .insert({
                        agent_id: ticket.assigned_agent_id,
                        type: 'sla_warning',
                        title: 'SLA Breach Risk',
                        message: recommendation,
                        ticket_id: ticket.id,
                      })
                    notificationsSent++
                  }

                  // Mark as notified
                  await supabase
                    .from('sla_predictions')
                    .update({ notification_sent: true, notification_sent_at: now.toISOString() })
                    .eq('ticket_id', ticket.id)
                    .eq('prediction_type', 'first_response')
                    .order('created_at', { ascending: false })
                    .limit(1)
                }
              }
            }
          }
        }

        // Check resolution SLA
        if (ticket.resolution_due_at && ticket.status !== 'resolved') {
          const dueDate = new Date(ticket.resolution_due_at)
          const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)

          // Only predict for tickets due within 48 hours
          if (hoursUntilDue <= 48) {
            const probability = calculateBreachProbability(hoursUntilDue, factors)
            const recommendation = generateRecommendation(probability, hoursUntilDue, 'resolution')

            const prediction: PredictionResult = {
              ticketId: ticket.id,
              predictionType: 'resolution',
              probability,
              hoursUntilDue,
              factors,
              recommendation,
            }
            predictions.push(prediction)

            // Save prediction
            const predictionInsert: SLAPredictionInsert = {
              ticket_id: ticket.id,
              prediction_type: 'resolution',
              predicted_breach_probability: probability,
              predicted_breach_at: dueDate.toISOString(),
              hours_until_breach: hoursUntilDue,
              contributing_factors: factors,
              recommendation,
            }

            const { error: insertError } = await supabase
              .from('sla_predictions')
              .insert(predictionInsert)

            if (insertError) {
              console.error(`[${JOB_NAME}] Error saving prediction for ticket ${ticket.id}:`, insertError)
              errors++
            } else {
              predictionsCreated++
            }

            if (probability >= HIGH_RISK_THRESHOLD) {
              highRiskCount++
            }
          }
        }
      } catch (err) {
        console.error(`[${JOB_NAME}] Error analyzing ticket ${ticket.id}:`, err)
        errors++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      ticketsAnalyzed: ticketsWithSla.length,
      predictionsCreated,
      highRiskCount,
      notificationsSent,
      errors,
      queueDepth,
      agentWorkload,
      historicalBreachRate: (historicalBreachRate * 100).toFixed(1) + '%',
    })

    return NextResponse.json({
      success: true,
      ticketsAnalyzed: ticketsWithSla.length,
      predictionsCreated,
      highRiskCount,
      notificationsSent,
      errors,
      stats: {
        queueDepth,
        agentWorkload,
        historicalBreachRate: Math.round(historicalBreachRate * 100),
      },
    })
  } catch (error) {
    logCronExecution(JOB_NAME, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}
