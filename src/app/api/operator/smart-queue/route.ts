import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type {
  Ticket,
  Customer,
  TicketQueueScore,
  TicketQueueScoreInsert,
  QueueScoringFactors,
  CustomerHealthScore,
} from '@/types/database'

// Get admin Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  return createClient(supabaseUrl, serviceKey)
}

// Scoring weights
const WEIGHTS = {
  SLA_URGENCY: 0.35, // 35% weight for SLA urgency
  CUSTOMER_VALUE: 0.20, // 20% weight for customer health/value
  COMPLEXITY: 0.15, // 15% weight for ticket complexity
  WAIT_TIME: 0.20, // 20% weight for how long customer has been waiting
  SENTIMENT: 0.10, // 10% weight for detected sentiment
}

interface TicketWithCustomer extends Ticket {
  customer: Customer
  messages?: { id: string; content: string; created_at: string; sender_type: string }[]
}

interface SmartQueueItem {
  ticket: TicketWithCustomer
  score: TicketQueueScore
  healthScore?: CustomerHealthScore | null
  similarTickets?: { id: string; subject: string }[]
}

/**
 * Calculate SLA urgency score (0-100)
 * Higher = more urgent
 */
function calculateSlaUrgencyScore(ticket: Ticket): number {
  const now = new Date()
  let urgency = 0

  // Check first response SLA
  if (ticket.first_response_due_at && !ticket.first_response_at) {
    const dueDate = new Date(ticket.first_response_due_at)
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)

    if (hoursUntilDue <= 0) {
      urgency = 100 // Already breached
    } else if (hoursUntilDue <= 1) {
      urgency = 90
    } else if (hoursUntilDue <= 2) {
      urgency = 75
    } else if (hoursUntilDue <= 4) {
      urgency = 60
    } else if (hoursUntilDue <= 8) {
      urgency = 40
    } else {
      urgency = 20
    }
  }

  // Check resolution SLA (lower priority than first response)
  if (ticket.resolution_due_at && ticket.first_response_at) {
    const dueDate = new Date(ticket.resolution_due_at)
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (60 * 60 * 1000)

    if (hoursUntilDue <= 0) {
      urgency = Math.max(urgency, 95)
    } else if (hoursUntilDue <= 2) {
      urgency = Math.max(urgency, 80)
    } else if (hoursUntilDue <= 4) {
      urgency = Math.max(urgency, 65)
    } else if (hoursUntilDue <= 8) {
      urgency = Math.max(urgency, 50)
    }
  }

  // Boost based on priority
  const priorityBoost = {
    urgent: 20,
    high: 10,
    normal: 0,
    low: -10,
  }
  urgency += priorityBoost[ticket.priority] || 0

  // Boost for escalated status
  if (ticket.status === 'escalated') {
    urgency += 15
  }

  return Math.min(100, Math.max(0, urgency))
}

/**
 * Calculate customer value score (0-100)
 * Based on health score - lower health = higher priority (we want to save at-risk customers)
 */
function calculateCustomerValueScore(healthScore: CustomerHealthScore | null): number {
  if (!healthScore) {
    return 50 // Default for unknown customers
  }

  // Invert health score - unhealthy customers need more attention
  // Critical (0-40) -> High priority (60-100)
  // At risk (40-60) -> Medium priority (40-60)
  // Healthy (60-100) -> Lower priority (0-40)
  const invertedScore = 100 - healthScore.score

  // Add trend adjustment
  let trendAdjustment = 0
  if (healthScore.trend === 'declining') {
    trendAdjustment = 15 // Boost declining customers
  } else if (healthScore.trend === 'improving') {
    trendAdjustment = -5 // Slight reduction for improving
  }

  return Math.min(100, Math.max(0, invertedScore + trendAdjustment))
}

/**
 * Calculate ticket complexity score (0-100)
 * Based on message count, content length, etc.
 */
function calculateComplexityScore(
  ticket: TicketWithCustomer
): number {
  let complexity = 30 // Base complexity

  // More messages = more complex conversation
  const messageCount = ticket.messages?.length || 0
  if (messageCount > 10) complexity += 30
  else if (messageCount > 5) complexity += 20
  else if (messageCount > 2) complexity += 10

  // Escalated tickets are more complex
  if (ticket.status === 'escalated') {
    complexity += 20
  }

  // Technical tag suggests complexity
  if (ticket.tags?.includes('technical') || ticket.tags?.includes('bug')) {
    complexity += 15
  }

  return Math.min(100, complexity)
}

/**
 * Calculate wait time score (0-100)
 * Higher = waiting longer
 */
function calculateWaitTimeScore(ticket: Ticket): number {
  const now = new Date()
  const createdAt = new Date(ticket.created_at)
  const hoursWaiting = (now.getTime() - createdAt.getTime()) / (60 * 60 * 1000)

  if (hoursWaiting >= 48) return 100
  if (hoursWaiting >= 24) return 80
  if (hoursWaiting >= 12) return 60
  if (hoursWaiting >= 6) return 40
  if (hoursWaiting >= 2) return 20
  return 10
}

/**
 * Calculate sentiment score (0-100)
 * Higher = more negative sentiment (needs attention)
 */
function calculateSentimentScore(ticket: TicketWithCustomer): number {
  // Simple keyword-based sentiment detection
  // In production, you'd use Claude or another NLP model
  const negativeKeywords = [
    'urgent', 'asap', 'immediately', 'frustrated', 'angry', 'disappointed',
    'unacceptable', 'terrible', 'worst', 'cancel', 'refund', 'lawsuit',
    'complaint', 'horrible', 'awful', 'broken', 'not working', 'emergency'
  ]

  const lastMessage = ticket.messages?.[ticket.messages.length - 1]
  if (!lastMessage || lastMessage.sender_type !== 'customer') {
    return 30 // Default neutral
  }

  const content = lastMessage.content.toLowerCase()
  let sentimentScore = 30

  for (const keyword of negativeKeywords) {
    if (content.includes(keyword)) {
      sentimentScore += 10
    }
  }

  // Exclamation marks and caps suggest frustration
  const exclamationCount = (lastMessage.content.match(/!/g) || []).length
  sentimentScore += Math.min(exclamationCount * 5, 20)

  const capsRatio = (lastMessage.content.match(/[A-Z]/g) || []).length / lastMessage.content.length
  if (capsRatio > 0.3) {
    sentimentScore += 15
  }

  return Math.min(100, sentimentScore)
}

/**
 * Calculate composite score
 */
function calculateCompositeScore(
  slaUrgency: number,
  customerValue: number,
  complexity: number,
  waitTime: number,
  sentiment: number
): number {
  return Math.round(
    slaUrgency * WEIGHTS.SLA_URGENCY +
    customerValue * WEIGHTS.CUSTOMER_VALUE +
    complexity * WEIGHTS.COMPLEXITY +
    waitTime * WEIGHTS.WAIT_TIME +
    sentiment * WEIGHTS.SENTIMENT
  )
}

/**
 * GET /api/operator/smart-queue
 * Get the smart-prioritized ticket queue
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const recalculate = searchParams.get('recalculate') === 'true'

    // Get open tickets with customer info and messages
    const { data: tickets, error: ticketsError, count } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        messages(id, content, created_at, sender_type)
      `, { count: 'exact' })
      .in('status', ['open', 'pending', 'escalated'])
      .order('created_at', { ascending: true })

    if (ticketsError) {
      console.error('[SmartQueue] Error fetching tickets:', ticketsError)
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({
        queue: [],
        total: 0,
        limit,
        offset,
      })
    }

    // Get health scores for all customers
    const customerIds = [...new Set(tickets.map((t) => t.customer_id))]
    const { data: healthScores } = await supabase
      .from('customer_health_scores')
      .select('*')
      .in('customer_id', customerIds)

    const healthScoreMap = new Map(
      healthScores?.map((hs) => [hs.customer_id, hs]) || []
    )

    // Calculate scores for each ticket
    const scoredTickets: SmartQueueItem[] = []

    for (const ticket of tickets as TicketWithCustomer[]) {
      const healthScore = healthScoreMap.get(ticket.customer_id) || null

      const slaUrgency = calculateSlaUrgencyScore(ticket)
      const customerValue = calculateCustomerValueScore(healthScore)
      const complexity = calculateComplexityScore(ticket)
      const waitTime = calculateWaitTimeScore(ticket)
      const sentiment = calculateSentimentScore(ticket)

      const compositeScore = calculateCompositeScore(
        slaUrgency,
        customerValue,
        complexity,
        waitTime,
        sentiment
      )

      const factors: QueueScoringFactors = {
        sla_hours_remaining: ticket.first_response_due_at
          ? (new Date(ticket.first_response_due_at).getTime() - Date.now()) / (60 * 60 * 1000)
          : undefined,
      }

      const queueScore: TicketQueueScore = {
        ticket_id: ticket.id,
        composite_score: compositeScore,
        sla_urgency_score: slaUrgency,
        customer_value_score: customerValue,
        complexity_score: complexity,
        wait_time_score: waitTime,
        sentiment_score: sentiment,
        similar_ticket_count: 0,
        similar_ticket_ids: null,
        scoring_factors: factors,
        last_calculated_at: new Date().toISOString(),
      }

      // Save/update the queue score if recalculate is requested
      if (recalculate) {
        const scoreInsert: TicketQueueScoreInsert = {
          ticket_id: ticket.id,
          composite_score: compositeScore,
          sla_urgency_score: slaUrgency,
          customer_value_score: customerValue,
          complexity_score: complexity,
          wait_time_score: waitTime,
          sentiment_score: sentiment,
          scoring_factors: factors,
        }

        await supabase
          .from('ticket_queue_scores')
          .upsert(scoreInsert, { onConflict: 'ticket_id' })
      }

      // Remove messages from response to reduce payload size
      const ticketWithoutMessages = { ...ticket }
      delete (ticketWithoutMessages as Record<string, unknown>).messages

      scoredTickets.push({
        ticket: ticketWithoutMessages as TicketWithCustomer,
        score: queueScore,
        healthScore,
      })
    }

    // Sort by composite score (highest first)
    scoredTickets.sort((a, b) => b.score.composite_score - a.score.composite_score)

    // Apply pagination
    const paginatedQueue = scoredTickets.slice(offset, offset + limit)

    return NextResponse.json({
      queue: paginatedQueue,
      total: count,
      limit,
      offset,
      weights: WEIGHTS,
    })
  } catch (error) {
    console.error('[SmartQueue] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/operator/smart-queue
 * Recalculate all queue scores
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()

    // Get all open tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        messages(id, content, created_at, sender_type)
      `)
      .in('status', ['open', 'pending', 'escalated'])

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      )
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({
        success: true,
        ticketsScored: 0,
      })
    }

    // Get health scores
    const customerIds = [...new Set(tickets.map((t) => t.customer_id))]
    const { data: healthScores } = await supabase
      .from('customer_health_scores')
      .select('*')
      .in('customer_id', customerIds)

    const healthScoreMap = new Map(
      healthScores?.map((hs) => [hs.customer_id, hs]) || []
    )

    let ticketsScored = 0
    let errors = 0

    for (const ticket of tickets as TicketWithCustomer[]) {
      try {
        const healthScore = healthScoreMap.get(ticket.customer_id) || null

        const slaUrgency = calculateSlaUrgencyScore(ticket)
        const customerValue = calculateCustomerValueScore(healthScore)
        const complexity = calculateComplexityScore(ticket)
        const waitTime = calculateWaitTimeScore(ticket)
        const sentiment = calculateSentimentScore(ticket)

        const compositeScore = calculateCompositeScore(
          slaUrgency,
          customerValue,
          complexity,
          waitTime,
          sentiment
        )

        const scoreInsert: TicketQueueScoreInsert = {
          ticket_id: ticket.id,
          composite_score: compositeScore,
          sla_urgency_score: slaUrgency,
          customer_value_score: customerValue,
          complexity_score: complexity,
          wait_time_score: waitTime,
          sentiment_score: sentiment,
          scoring_factors: {},
        }

        const { error: upsertError } = await supabase
          .from('ticket_queue_scores')
          .upsert(scoreInsert, { onConflict: 'ticket_id' })

        if (upsertError) {
          console.error(`[SmartQueue] Error scoring ticket ${ticket.id}:`, upsertError)
          errors++
        } else {
          ticketsScored++
        }
      } catch (err) {
        console.error(`[SmartQueue] Error processing ticket ${ticket.id}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      ticketsScored,
      errors,
    })
  } catch (error) {
    console.error('[SmartQueue] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
