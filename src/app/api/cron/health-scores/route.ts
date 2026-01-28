import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import type { CustomerHealthScore, CustomerHealthFactors, HealthRiskLevel, HealthTrend } from '@/types/database'

const JOB_NAME = 'health-scores'

interface HealthScoreResult {
  customerId: string
  score: number
  riskLevel: HealthRiskLevel
  trend: HealthTrend
  factors: CustomerHealthFactors
}

/**
 * Calculate customer health score based on various factors
 */
async function calculateHealthScore(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string
): Promise<HealthScoreResult | null> {
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Get ticket statistics
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, status, priority, created_at, updated_at')
    .eq('customer_id', customerId)
    .gte('created_at', ninetyDaysAgo.toISOString())

  if (ticketsError) {
    console.error(`[${JOB_NAME}] Error fetching tickets for ${customerId}:`, ticketsError)
    return null
  }

  const ticketList = tickets || []
  const totalTickets = ticketList.length
  const openTickets = ticketList.filter((t) => t.status === 'open' || t.status === 'pending').length
  const escalatedTickets = ticketList.filter((t) => t.status === 'escalated').length
  const resolvedTickets = ticketList.filter((t) => t.status === 'resolved').length

  // Get CSAT scores for this customer
  const { data: feedback } = await supabase
    .from('ticket_feedback')
    .select('rating, ticket_id')
    .not('rating', 'is', null)
    .in('ticket_id', ticketList.map((t) => t.id))

  const csatScores = feedback?.map((f) => f.rating).filter(Boolean) || []
  const avgCsat = csatScores.length > 0
    ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
    : null

  // Calculate days since last ticket
  const lastTicketDate = ticketList.length > 0
    ? new Date(Math.max(...ticketList.map((t) => new Date(t.created_at).getTime())))
    : null
  const daysSinceLastTicket = lastTicketDate
    ? Math.floor((now.getTime() - lastTicketDate.getTime()) / (24 * 60 * 60 * 1000))
    : null

  // Calculate resolution rate
  const resolutionRate = totalTickets > 0
    ? resolvedTickets / totalTickets
    : null

  // Start with base score
  let score = 70

  // Adjust based on CSAT (range: -20 to +20)
  if (avgCsat !== null) {
    score += Math.round((avgCsat - 3) * 10)
  }

  // Penalize for open tickets (-5 per open ticket, max -25)
  score -= Math.min(openTickets * 5, 25)

  // Penalize for escalations (-10 per escalation, max -30)
  score -= Math.min(escalatedTickets * 10, 30)

  // Bonus for resolved tickets (+1 per resolved, max +10)
  score += Math.min(resolvedTickets, 10)

  // Bonus for high resolution rate (+10 if > 80%)
  if (resolutionRate !== null && resolutionRate > 0.8) {
    score += 10
  }

  // Clamp to valid range
  score = Math.max(0, Math.min(100, score))

  // Determine risk level
  let riskLevel: HealthRiskLevel
  if (score >= 60) {
    riskLevel = 'healthy'
  } else if (score >= 40) {
    riskLevel = 'at_risk'
  } else {
    riskLevel = 'critical'
  }

  // Get previous score for trend calculation
  const { data: existingScore } = await supabase
    .from('customer_health_scores')
    .select('score')
    .eq('customer_id', customerId)
    .single()

  // Determine trend
  let trend: HealthTrend = 'stable'
  if (existingScore?.score !== null && existingScore?.score !== undefined) {
    const change = score - existingScore.score
    if (change >= 5) {
      trend = 'improving'
    } else if (change <= -5) {
      trend = 'declining'
    }
  }

  const factors: CustomerHealthFactors = {
    ticket_count: totalTickets,
    open_tickets: openTickets,
    escalation_count: escalatedTickets,
    avg_csat: avgCsat,
    days_since_last_ticket: daysSinceLastTicket ?? undefined,
    resolution_rate: resolutionRate ?? undefined,
  }

  return {
    customerId,
    score,
    riskLevel,
    trend,
    factors,
  }
}

/**
 * Trigger intervention for at-risk customers
 */
async function triggerAtRiskIntervention(
  supabase: ReturnType<typeof getServiceClient>,
  result: HealthScoreResult,
  now: Date
): Promise<void> {
  // Check if we've already sent an intervention recently (within 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: recentOutreach } = await supabase
    .from('proactive_outreach_log')
    .select('id')
    .eq('customer_id', result.customerId)
    .in('outreach_type', ['health_score_intervention', 'at_risk_alert'])
    .gte('created_at', sevenDaysAgo.toISOString())
    .limit(1)

  if (recentOutreach && recentOutreach.length > 0) {
    return // Already sent recent intervention
  }

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('id', result.customerId)
    .single()

  if (!customer) return

  // Get any open tickets for this customer
  const { data: openTickets } = await supabase
    .from('tickets')
    .select('id, subject, status')
    .eq('customer_id', result.customerId)
    .in('status', ['open', 'pending', 'escalated'])
    .order('created_at', { ascending: false })
    .limit(1)

  // Create internal notification for operators
  const { data: onlineAgents } = await supabase
    .from('agents')
    .select('id')
    .eq('status', 'online')
    .limit(1)

  if (onlineAgents && onlineAgents.length > 0) {
    const alertType = result.riskLevel === 'critical' ? 'CRITICAL' : 'WARNING'
    const trendInfo = result.trend === 'declining' ? ' (declining)' : ''

    await supabase
      .from('agent_notifications')
      .insert({
        agent_id: onlineAgents[0].id,
        type: 'escalation',
        title: `${alertType}: Customer Health Alert${trendInfo}`,
        message: `Customer ${customer.name || customer.email} has a health score of ${result.score} (${result.riskLevel}). ${openTickets && openTickets.length > 0 ? `Open ticket: ${openTickets[0].subject}` : 'No open tickets.'}`,
        ticket_id: openTickets?.[0]?.id || null,
      })
  }

  // Log the intervention
  await supabase
    .from('proactive_outreach_log')
    .insert({
      customer_id: result.customerId,
      ticket_id: openTickets?.[0]?.id || null,
      outreach_type: result.riskLevel === 'critical' ? 'at_risk_alert' : 'health_score_intervention',
      channel: 'internal',
      message_content: `Health score alert: ${result.score} (${result.riskLevel}, ${result.trend})`,
      trigger_reason: `Health score ${result.riskLevel}, trend ${result.trend}`,
      trigger_data: {
        score: result.score,
        risk_level: result.riskLevel,
        trend: result.trend,
        factors: result.factors,
      },
      delivery_status: 'sent',
      delivered_at: now.toISOString(),
    })

  // For critical customers with email, consider sending a proactive outreach
  if (result.riskLevel === 'critical' && customer.email) {
    // This could trigger an email, but we'll leave that as a manual action
    // to avoid over-automation. The operator notification above will alert staff.
  }
}

/**
 * POST /api/cron/health-scores
 * Calculate and update health scores for all active customers
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Get all customers with recent tickets
    const { data: customersWithTickets, error: customersError } = await supabase
      .from('tickets')
      .select('customer_id')
      .gte('created_at', ninetyDaysAgo.toISOString())

    if (customersError) {
      logCronExecution(JOB_NAME, 'failed', { error: customersError.message })
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      )
    }

    // Get unique customer IDs
    const customerIds = [...new Set(customersWithTickets?.map((t) => t.customer_id) || [])]

    logCronExecution(JOB_NAME, 'started', {
      customersToProcess: customerIds.length,
    })

    let processed = 0
    let updated = 0
    let errors = 0
    const criticalAlerts: string[] = []

    // Process each customer
    for (const customerId of customerIds) {
      try {
        const result = await calculateHealthScore(supabase, customerId)

        if (!result) {
          errors++
          continue
        }

        // Upsert health score
        const { error: upsertError } = await supabase
          .from('customer_health_scores')
          .upsert({
            customer_id: result.customerId,
            score: result.score,
            risk_level: result.riskLevel,
            trend: result.trend,
            factors: result.factors,
            last_calculated_at: now.toISOString(),
            updated_at: now.toISOString(),
          }, {
            onConflict: 'customer_id',
          })

        if (upsertError) {
          console.error(`[${JOB_NAME}] Error upserting score for ${customerId}:`, upsertError)
          errors++
          continue
        }

        updated++

        // Track critical and declining customers for interventions
        if (result.riskLevel === 'critical') {
          criticalAlerts.push(result.customerId)
        }

        // Trigger intervention for newly critical or rapidly declining customers
        if (result.riskLevel === 'critical' || result.trend === 'declining') {
          await triggerAtRiskIntervention(supabase, result, now)
        }

        processed++
      } catch (err) {
        console.error(`[${JOB_NAME}] Error processing customer ${customerId}:`, err)
        errors++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      processed,
      updated,
      errors,
      criticalCustomers: criticalAlerts.length,
    })

    return NextResponse.json({
      success: true,
      processed,
      updated,
      errors,
      criticalCustomers: criticalAlerts.length,
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
