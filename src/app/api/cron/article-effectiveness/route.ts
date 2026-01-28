import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'

const JOB_NAME = 'article-effectiveness'

interface ArticleStats {
  articleId: string
  title: string
  timesMatched: number
  timesUsedInResponse: number
  autoResolvedCount: number
  escalatedCount: number
  avgCsat: number | null
  effectivenessScore: number | null
}

/**
 * POST /api/cron/article-effectiveness
 * Track which articles lead to resolution vs escalation
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setHours(0, 0, 0, 0)
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all knowledge articles
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('id, title')

    if (articlesError) {
      logCronExecution(JOB_NAME, 'failed', { error: articlesError.message })
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { message: 'No articles to analyze' })
      return NextResponse.json({ success: true, articlesAnalyzed: 0 })
    }

    // Get resolved tickets from this period
    const { data: resolvedTickets } = await supabase
      .from('tickets')
      .select('id, ai_handled, status')
      .eq('status', 'resolved')
      .gte('updated_at', periodStart.toISOString())
      .lt('updated_at', periodEnd.toISOString())

    // Get escalated tickets from this period
    const { data: escalationEvents } = await supabase
      .from('ticket_events')
      .select('ticket_id')
      .eq('event_type', 'escalated')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString())

    const escalatedTicketIds = new Set(escalationEvents?.map((e) => e.ticket_id) || [])
    const resolvedTicketIds = new Set(resolvedTickets?.map((t) => t.id) || [])

    // Get messages from this period that might reference articles
    // In a real implementation, you'd track article usage in message metadata
    const { data: aiMessages } = await supabase
      .from('messages')
      .select('id, ticket_id, metadata, content')
      .eq('sender_type', 'ai')
      .gte('created_at', periodStart.toISOString())
      .lt('created_at', periodEnd.toISOString())

    // Get feedback for tickets
    const allTicketIds = [...resolvedTicketIds, ...escalatedTicketIds]
    const { data: feedback } = await supabase
      .from('ticket_feedback')
      .select('ticket_id, rating')
      .in('ticket_id', allTicketIds)
      .not('rating', 'is', null)

    const feedbackMap = new Map(feedback?.map((f) => [f.ticket_id, f.rating]) || [])

    // Analyze each article
    const articleStats: ArticleStats[] = []

    for (const article of articles) {
      // Count how many AI messages might have used this article
      // In production, you'd track this in message metadata
      const matchedMessages = aiMessages?.filter((m) => {
        const metadata = m.metadata as Record<string, unknown> | null
        const usedArticles = metadata?.used_articles as string[] | undefined
        return usedArticles?.includes(article.id) ||
               m.content.toLowerCase().includes(article.title.toLowerCase().substring(0, 20))
      }) || []

      const timesMatched = matchedMessages.length
      const timesUsedInResponse = matchedMessages.length

      // Count outcomes for tickets where this article was used
      const ticketIdsWithArticle = [...new Set(matchedMessages.map((m) => m.ticket_id))]

      let autoResolvedCount = 0
      let escalatedCount = 0
      const csatScores: number[] = []

      for (const ticketId of ticketIdsWithArticle) {
        if (resolvedTicketIds.has(ticketId) && !escalatedTicketIds.has(ticketId)) {
          autoResolvedCount++
        }
        if (escalatedTicketIds.has(ticketId)) {
          escalatedCount++
        }
        const csat = feedbackMap.get(ticketId)
        if (csat) csatScores.push(csat)
      }

      const avgCsat = csatScores.length > 0
        ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 100) / 100
        : null

      // Calculate effectiveness score
      // Formula: (auto_resolved - escalated) / times_used, normalized to 0-1
      let effectivenessScore: number | null = null
      if (timesUsedInResponse > 0) {
        const rawScore = (autoResolvedCount - escalatedCount) / timesUsedInResponse
        effectivenessScore = Math.round(Math.max(0, Math.min(1, (rawScore + 1) / 2)) * 100) / 100
      }

      articleStats.push({
        articleId: article.id,
        title: article.title,
        timesMatched,
        timesUsedInResponse,
        autoResolvedCount,
        escalatedCount,
        avgCsat,
        effectivenessScore,
      })

      // Upsert metrics
      await supabase
        .from('knowledge_article_metrics')
        .upsert({
          article_id: article.id,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          times_matched: timesMatched,
          times_used_in_response: timesUsedInResponse,
          auto_resolved_count: autoResolvedCount,
          escalated_count: escalatedCount,
          avg_csat_when_used: avgCsat,
          csat_sample_size: csatScores.length,
          effectiveness_score: effectivenessScore,
        }, {
          onConflict: 'article_id,period_start,period_end',
        })
    }

    // Sort by effectiveness (best first)
    articleStats.sort((a, b) => (b.effectivenessScore || 0) - (a.effectivenessScore || 0))

    logCronExecution(JOB_NAME, 'completed', {
      articlesAnalyzed: articles.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      topArticles: articleStats.slice(0, 5).map((a) => ({
        title: a.title,
        effectiveness: a.effectivenessScore,
        timesUsed: a.timesUsedInResponse,
      })),
      bottomArticles: articleStats.slice(-5).map((a) => ({
        title: a.title,
        effectiveness: a.effectivenessScore,
        timesUsed: a.timesUsedInResponse,
      })),
    })

    return NextResponse.json({
      success: true,
      articlesAnalyzed: articles.length,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      articleStats: articleStats.slice(0, 20), // Return top 20
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
