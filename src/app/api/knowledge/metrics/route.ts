/**
 * Knowledge Base Metrics API
 * GET /api/knowledge/metrics - KB effectiveness metrics
 * - Top articles by usage
 * - Coverage gaps (low-similarity searches)
 * - Deflection rate (widget suggestions that prevented tickets)
 * - Search volume over time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel
    const [
      searchLogsResult,
      topArticlesResult,
      coverageGapsResult,
      widgetDeflectionResult,
      totalArticlesResult,
    ] = await Promise.all([
      // Total search volume by source
      supabase
        .from('kb_search_logs')
        .select('source, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true }),

      // Top matched articles (by article ID frequency in search logs)
      supabase
        .from('kb_search_logs')
        .select('article_ids, query, max_similarity')
        .gte('created_at', since)
        .not('article_ids', 'is', null),

      // Coverage gaps: searches with low max_similarity
      supabase
        .from('kb_search_logs')
        .select('query, max_similarity, source, created_at')
        .gte('created_at', since)
        .lt('max_similarity', 0.6)
        .order('created_at', { ascending: false })
        .limit(50),

      // Widget deflection: searches from widget source
      supabase
        .from('kb_search_logs')
        .select('source, max_similarity')
        .gte('created_at', since)
        .eq('source', 'widget'),

      // Total KB articles count
      supabase
        .from('knowledge_articles')
        .select('id', { count: 'exact', head: true })
        .eq('is_kb_source', true),
    ])

    // Process search volume by source
    const searchLogs = searchLogsResult.data || []
    const searchBySource: Record<string, number> = {}
    const searchByDay: Record<string, number> = {}

    for (const log of searchLogs) {
      searchBySource[log.source] = (searchBySource[log.source] || 0) + 1
      const day = log.created_at.slice(0, 10)
      searchByDay[day] = (searchByDay[day] || 0) + 1
    }

    // Process top articles
    const articleIdCounts: Record<string, number> = {}
    const topArticleLogs = topArticlesResult.data || []
    for (const log of topArticleLogs) {
      if (Array.isArray(log.article_ids)) {
        for (const id of log.article_ids) {
          articleIdCounts[id] = (articleIdCounts[id] || 0) + 1
        }
      }
    }

    // Get top 10 article IDs
    const topArticleEntries = Object.entries(articleIdCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Fetch article details for top articles
    let topArticles: { id: string; title: string; category: string | null; source_file: string | null; match_count: number }[] = []
    if (topArticleEntries.length > 0) {
      const { data: articleDetails } = await supabase
        .from('knowledge_articles')
        .select('id, title, category, source_file')
        .in('id', topArticleEntries.map(([id]) => id))

      if (articleDetails) {
        topArticles = topArticleEntries.map(([id, count]) => {
          const detail = articleDetails.find(a => a.id === id)
          return {
            id,
            title: detail?.title || 'Unknown',
            category: detail?.category || null,
            source_file: detail?.source_file || null,
            match_count: count,
          }
        })
      }
    }

    // Process coverage gaps - deduplicate by query
    const gapQueries = new Map<string, { query: string; max_similarity: number; source: string; count: number }>()
    for (const gap of coverageGapsResult.data || []) {
      const key = gap.query.toLowerCase().trim()
      const existing = gapQueries.get(key)
      if (existing) {
        existing.count++
        existing.max_similarity = Math.max(existing.max_similarity, gap.max_similarity || 0)
      } else {
        gapQueries.set(key, {
          query: gap.query,
          max_similarity: gap.max_similarity || 0,
          source: gap.source,
          count: 1,
        })
      }
    }

    const coverageGaps = Array.from(gapQueries.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    // Process widget deflection
    const widgetSearches = widgetDeflectionResult.data || []
    const totalWidgetSearches = widgetSearches.length
    const highConfidenceWidgetSearches = widgetSearches.filter(
      s => (s.max_similarity || 0) > 0.7
    ).length

    // Calculate daily search trend
    const searchTrend = Object.entries(searchByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // Summary stats
    const totalSearches = searchLogs.length
    const avgSimilarity = topArticleLogs.length > 0
      ? topArticleLogs.reduce((sum, l) => sum + (l.max_similarity || 0), 0) / topArticleLogs.length
      : 0
    const coverageRate = totalSearches > 0
      ? ((totalSearches - (coverageGapsResult.data?.length || 0)) / totalSearches * 100)
      : 100

    return NextResponse.json({
      period_days: days,
      summary: {
        total_searches: totalSearches,
        total_kb_articles: totalArticlesResult.count || 0,
        avg_similarity: Math.round(avgSimilarity * 100),
        coverage_rate: Math.round(coverageRate),
        widget_searches: totalWidgetSearches,
        widget_high_confidence: highConfidenceWidgetSearches,
      },
      search_by_source: searchBySource,
      search_trend: searchTrend,
      top_articles: topArticles,
      coverage_gaps: coverageGaps,
    })
  } catch (error) {
    console.error('KB Metrics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
