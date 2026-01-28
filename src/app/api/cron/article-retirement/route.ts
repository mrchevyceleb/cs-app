import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'

const JOB_NAME = 'article-retirement'

const STALE_THRESHOLD_DAYS = 90 // Articles unused for 90 days

interface StaleArticle {
  id: string
  title: string
  category: string | null
  createdAt: string
  lastMatchedAt: string | null
  daysSinceLastMatch: number | null
}

/**
 * POST /api/cron/article-retirement
 * Archive stale KB articles with no matches in 90 days
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const staleCutoff = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

    // Get all knowledge articles
    const { data: articles, error: articlesError } = await supabase
      .from('knowledge_articles')
      .select('id, title, category, created_at')

    if (articlesError) {
      logCronExecution(JOB_NAME, 'failed', { error: articlesError.message })
      return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
    }

    if (!articles || articles.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { message: 'No articles to analyze' })
      return NextResponse.json({ success: true, staleArticles: 0 })
    }

    // Get recent metrics for all articles
    const { data: recentMetrics } = await supabase
      .from('knowledge_article_metrics')
      .select('article_id, times_matched, period_end')
      .gte('period_end', staleCutoff.toISOString().split('T')[0])
      .gt('times_matched', 0)

    // Build set of articles with recent matches
    const articlesWithRecentMatches = new Set(
      recentMetrics?.map((m) => m.article_id) || []
    )

    // Find last match date for each article
    const { data: allMetrics } = await supabase
      .from('knowledge_article_metrics')
      .select('article_id, period_end, times_matched')
      .gt('times_matched', 0)
      .order('period_end', { ascending: false })

    const lastMatchMap = new Map<string, string>()
    for (const metric of allMetrics || []) {
      if (!lastMatchMap.has(metric.article_id)) {
        lastMatchMap.set(metric.article_id, metric.period_end)
      }
    }

    // Identify stale articles
    const staleArticles: StaleArticle[] = []

    for (const article of articles) {
      // Skip if article has recent matches
      if (articlesWithRecentMatches.has(article.id)) continue

      // Skip if article is newer than the stale threshold
      const articleCreated = new Date(article.created_at)
      if (articleCreated > staleCutoff) continue

      const lastMatchedAt = lastMatchMap.get(article.id) || null
      const daysSinceLastMatch = lastMatchedAt
        ? Math.floor((now.getTime() - new Date(lastMatchedAt).getTime()) / (24 * 60 * 60 * 1000))
        : null

      staleArticles.push({
        id: article.id,
        title: article.title,
        category: article.category,
        createdAt: article.created_at,
        lastMatchedAt,
        daysSinceLastMatch,
      })
    }

    // Sort by staleness (never matched first, then by days since match)
    staleArticles.sort((a, b) => {
      if (a.daysSinceLastMatch === null && b.daysSinceLastMatch === null) return 0
      if (a.daysSinceLastMatch === null) return -1
      if (b.daysSinceLastMatch === null) return 1
      return b.daysSinceLastMatch - a.daysSinceLastMatch
    })

    // Create draft notices for review (don't auto-delete)
    let reviewDraftsCreated = 0

    for (const stale of staleArticles.slice(0, 10)) {
      // Check if we already have a retirement review pending
      const { data: existingDraft } = await supabase
        .from('knowledge_article_drafts')
        .select('id')
        .eq('metadata->>retirement_review_for', stale.id)
        .eq('status', 'pending')
        .limit(1)

      if (existingDraft && existingDraft.length > 0) continue

      // Create review draft
      const { error: draftError } = await supabase
        .from('knowledge_article_drafts')
        .insert({
          title: `[REVIEW FOR RETIREMENT] ${stale.title}`,
          content: `## Retirement Review

This article has been flagged for potential retirement.

**Article:** ${stale.title}
**Category:** ${stale.category || 'Uncategorized'}
**Created:** ${new Date(stale.createdAt).toLocaleDateString()}
**Last Matched:** ${stale.lastMatchedAt ? new Date(stale.lastMatchedAt).toLocaleDateString() : 'Never'}
**Days Since Match:** ${stale.daysSinceLastMatch ?? 'N/A'}

### Reason
This article has not been matched to any customer queries in the last ${STALE_THRESHOLD_DAYS} days.

### Recommended Actions
1. **Keep** - If the article contains important information that may be needed in the future
2. **Update** - If the content is outdated and needs refreshing
3. **Archive** - If the article is no longer relevant

---
*This review was generated by the Article Retirement system on ${now.toISOString()}*`,
          suggested_category: 'retirement-review',
          generation_reason: 'gap_detected', // Reusing existing type
          status: 'pending',
          metadata: {
            retirement_review_for: stale.id,
            original_title: stale.title,
            days_since_last_match: stale.daysSinceLastMatch,
            review_type: 'retirement',
          },
        })

      if (!draftError) {
        reviewDraftsCreated++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      totalArticles: articles.length,
      staleArticles: staleArticles.length,
      reviewDraftsCreated,
      stalestArticles: staleArticles.slice(0, 5).map((a) => ({
        title: a.title,
        daysSinceMatch: a.daysSinceLastMatch ?? 'never',
      })),
    })

    return NextResponse.json({
      success: true,
      totalArticles: articles.length,
      staleArticles: staleArticles.length,
      reviewDraftsCreated,
      staleArticleList: staleArticles.slice(0, 20),
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
