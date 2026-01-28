import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import type { AICalibrationOutcome } from '@/types/database'

const JOB_NAME = 'confidence-calibration'

interface CalibrationStats {
  intentCategory: string
  totalSamples: number
  avgInitialConfidence: number
  successRate: number // % that resolved without escalation
  avgCsat: number | null
  recommendedThreshold: number
}

/**
 * POST /api/cron/confidence-calibration
 * Analyze AI outcomes and calculate optimal confidence thresholds per intent
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get resolved tickets from last 30 days with AI involvement
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        ai_handled,
        ai_confidence,
        status,
        created_at,
        updated_at,
        tags
      `)
      .eq('status', 'resolved')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    if (!tickets || tickets.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { message: 'No tickets to analyze' })
      return NextResponse.json({ success: true, calibrationsCreated: 0 })
    }

    // Get feedback for these tickets
    const ticketIds = tickets.map((t) => t.id)
    const { data: feedback } = await supabase
      .from('ticket_feedback')
      .select('ticket_id, rating')
      .in('ticket_id', ticketIds)
      .not('rating', 'is', null)

    const feedbackMap = new Map(feedback?.map((f) => [f.ticket_id, f.rating]) || [])

    // Check which tickets were escalated (had status change to escalated at some point)
    const { data: escalationEvents } = await supabase
      .from('ticket_events')
      .select('ticket_id')
      .in('ticket_id', ticketIds)
      .eq('event_type', 'escalated')

    const escalatedTicketIds = new Set(escalationEvents?.map((e) => e.ticket_id) || [])

    // Group by intent category (using tags as proxy)
    const intentGroups = new Map<string, {
      samples: { confidence: number; escalated: boolean; csat: number | null }[]
    }>()

    for (const ticket of tickets) {
      // Use first tag as intent category, or 'general' if none
      const intent = ticket.tags?.[0] || 'general'

      if (!intentGroups.has(intent)) {
        intentGroups.set(intent, { samples: [] })
      }

      const wasEscalated = escalatedTicketIds.has(ticket.id)
      const csat = feedbackMap.get(ticket.id) || null

      // Determine outcome
      let outcome: AICalibrationOutcome
      if (ticket.ai_handled && !wasEscalated) {
        outcome = 'resolved_by_ai'
      } else if (wasEscalated && csat && csat >= 4) {
        outcome = 'escalated_helpful'
      } else if (wasEscalated) {
        outcome = 'escalated_unnecessary'
      } else {
        outcome = 'resolved_by_ai'
      }

      // Record calibration data
      if (ticket.ai_confidence !== null) {
        const resolutionTime = ticket.updated_at
          ? (new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) / (60 * 60 * 1000)
          : null

        await supabase.from('ai_calibration_data').insert({
          ticket_id: ticket.id,
          initial_confidence: ticket.ai_confidence,
          final_outcome: outcome,
          csat_score: csat,
          resolution_time_hours: resolutionTime,
          intent_category: intent,
          metadata: { analyzed_at: now.toISOString() },
        })

        intentGroups.get(intent)!.samples.push({
          confidence: ticket.ai_confidence,
          escalated: wasEscalated,
          csat,
        })
      }
    }

    // Calculate recommended thresholds per intent
    const calibrationStats: CalibrationStats[] = []

    for (const [intent, data] of intentGroups) {
      if (data.samples.length < 5) continue // Need minimum samples

      const totalSamples = data.samples.length
      const avgConfidence = data.samples.reduce((sum, s) => sum + s.confidence, 0) / totalSamples
      const successCount = data.samples.filter((s) => !s.escalated).length
      const successRate = successCount / totalSamples

      const csatSamples = data.samples.filter((s) => s.csat !== null)
      const avgCsat = csatSamples.length > 0
        ? csatSamples.reduce((sum, s) => sum + s.csat!, 0) / csatSamples.length
        : null

      // Calculate recommended threshold
      // If success rate is high, we can lower threshold
      // If success rate is low, we need higher threshold
      let recommendedThreshold = 0.7 // Default

      if (successRate >= 0.9 && avgCsat && avgCsat >= 4) {
        recommendedThreshold = 0.6 // Can be more aggressive
      } else if (successRate >= 0.8) {
        recommendedThreshold = 0.7
      } else if (successRate >= 0.6) {
        recommendedThreshold = 0.8
      } else {
        recommendedThreshold = 0.9 // Need to be very confident
      }

      calibrationStats.push({
        intentCategory: intent,
        totalSamples,
        avgInitialConfidence: Math.round(avgConfidence * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        avgCsat,
        recommendedThreshold,
      })
    }

    // Update channel config with new thresholds (use average of recommendations)
    if (calibrationStats.length > 0) {
      const avgThreshold = calibrationStats.reduce((sum, s) => sum + s.recommendedThreshold, 0) / calibrationStats.length

      // Update all channel configs
      await supabase
        .from('channel_config')
        .update({
          ai_confidence_threshold: Math.round(avgThreshold * 100) / 100,
          updated_at: now.toISOString(),
        })
        .eq('ai_auto_respond', true)
    }

    logCronExecution(JOB_NAME, 'completed', {
      ticketsAnalyzed: tickets.length,
      intentsCalibrated: calibrationStats.length,
      calibrationStats,
    })

    return NextResponse.json({
      success: true,
      ticketsAnalyzed: tickets.length,
      intentsCalibrated: calibrationStats.length,
      calibrationStats,
    })
  } catch (error) {
    logCronExecution(JOB_NAME, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
