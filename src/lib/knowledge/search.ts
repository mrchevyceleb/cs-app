/**
 * Knowledge Base Hybrid Search
 * Unified search combining vector similarity + keyword/BM25 with Reciprocal Rank Fusion
 * Used by ALL AI paths for consistent KB access
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/openai/chat'
import type { KBSearchResult, KBSearchOptions, KBSearchLogEntry } from './types'

// Lazy Supabase client
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SB_URL
    const key = process.env.SB_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars')
    _supabase = createClient(url, key)
  }
  return _supabase
}

// RRF constant (standard value)
const RRF_K = 60

/**
 * Hybrid search: vector + keyword with Reciprocal Rank Fusion
 * This is the single entry point all AI paths should use.
 */
export async function searchKnowledgeHybrid(
  options: KBSearchOptions
): Promise<KBSearchResult[]> {
  const { query, limit = 8, source = 'api' } = options
  const supabase = getSupabase()

  if (!query || query.trim().length < 2) return []

  try {
    // Run vector search and keyword search in parallel
    // Use allSettled so one failure doesn't kill the other
    const [vectorSettled, keywordSettled] = await Promise.allSettled([
      vectorSearch(supabase, query, Math.min(limit * 2, 20)),
      keywordSearch(supabase, query, Math.min(limit * 2, 20)),
    ])

    const vectorResults = vectorSettled.status === 'fulfilled' ? vectorSettled.value : []
    const keywordResults = keywordSettled.status === 'fulfilled' ? keywordSettled.value : []

    if (vectorSettled.status === 'rejected') {
      console.error('[KB Search] Vector search failed (keyword search still used):', vectorSettled.reason)
    }
    if (keywordSettled.status === 'rejected') {
      console.error('[KB Search] Keyword search failed (vector search still used):', keywordSettled.reason)
    }

    // Merge with Reciprocal Rank Fusion
    const merged = reciprocalRankFusion(vectorResults, keywordResults)

    // Deduplicate by id
    const seen = new Set<string>()
    const deduped = merged.filter(r => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })

    const results = deduped.slice(0, limit)

    // Log search asynchronously (fire and forget)
    logSearch({
      query,
      search_type: 'hybrid',
      source,
      article_ids: results.map(r => r.id),
      top_similarity: results.length > 0 ? results[0].similarity : null,
      result_count: results.length,
      ticket_id: options.ticketId,
      customer_id: options.customerId,
    }).catch(() => {})

    return results
  } catch (error) {
    console.error('[KB Search] Hybrid search error:', error)
    // Fallback: try keyword-only (more reliable, no OpenAI dependency)
    try {
      return await keywordSearch(supabase, query, limit)
    } catch {
      return []
    }
  }
}

/**
 * Vector similarity search using embeddings
 */
async function vectorSearch(
  supabase: SupabaseClient,
  query: string,
  limit: number
): Promise<KBSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_knowledge_enhanced', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: limit,
  })

  if (error) {
    console.error('Vector search error:', error)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string | null,
    source_file: row.source_file as string | null,
    section_path: row.section_path as string | null,
    file_number: row.file_number as number | null,
    chunk_index: row.chunk_index as number | null,
    metadata: row.metadata as Record<string, unknown> | null,
    is_kb_source: row.is_kb_source as boolean | null,
    similarity: row.similarity as number,
  }))
}

/**
 * Keyword/BM25 search using PostgreSQL full-text search
 */
async function keywordSearch(
  supabase: SupabaseClient,
  query: string,
  limit: number
): Promise<KBSearchResult[]> {
  const { data, error } = await supabase.rpc('search_knowledge_text', {
    search_query: query,
    result_limit: limit,
  })

  if (error) {
    console.error('Keyword search error:', error)
    return []
  }

  // Normalize keyword ranks to 0-1 similarity range for consistent scoring
  const rows = data || []
  const maxRank = rows.length > 0 ? Math.max(...rows.map((r: Record<string, unknown>) => (r.rank as number) || 0), 1) : 1

  return rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string | null,
    source_file: row.source_file as string | null,
    section_path: row.section_path as string | null,
    file_number: row.file_number as number | null,
    chunk_index: row.chunk_index as number | null,
    metadata: row.metadata as Record<string, unknown> | null,
    is_kb_source: row.is_kb_source as boolean | null,
    similarity: Math.min(((row.rank as number) || 0) / maxRank, 1),
    rank: row.rank as number,
  }))
}

/**
 * Reciprocal Rank Fusion: merge two ranked lists into one
 * Score = sum of 1/(k + rank) for each list the item appears in
 */
function reciprocalRankFusion(
  vectorResults: KBSearchResult[],
  keywordResults: KBSearchResult[]
): KBSearchResult[] {
  const scores = new Map<string, { score: number; result: KBSearchResult }>()

  // Score vector results
  vectorResults.forEach((result, index) => {
    const rrfScore = 1 / (RRF_K + index + 1)
    const existing = scores.get(result.id)
    if (existing) {
      existing.score += rrfScore
      // Keep the one with higher similarity
      if (result.similarity > (existing.result.similarity || 0)) {
        existing.result = { ...result, combined_score: existing.score + rrfScore }
      }
    } else {
      scores.set(result.id, { score: rrfScore, result: { ...result, combined_score: rrfScore } })
    }
  })

  // Score keyword results
  keywordResults.forEach((result, index) => {
    const rrfScore = 1 / (RRF_K + index + 1)
    const existing = scores.get(result.id)
    if (existing) {
      existing.score += rrfScore
      existing.result.combined_score = existing.score
    } else {
      scores.set(result.id, { score: rrfScore, result: { ...result, combined_score: rrfScore } })
    }
  })

  // Sort by combined score descending
  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .map(({ result, score }) => ({ ...result, combined_score: score }))
}

/**
 * Log a search to kb_search_logs for metrics
 */
async function logSearch(entry: KBSearchLogEntry): Promise<void> {
  try {
    const supabase = getSupabase()
    await supabase.from('kb_search_logs').insert({
      query: entry.query,
      search_type: entry.search_type,
      source: entry.source,
      article_ids: entry.article_ids,
      top_similarity: entry.top_similarity,
      result_count: entry.result_count,
      ticket_id: entry.ticket_id || null,
      customer_id: entry.customer_id || null,
    })
  } catch (error) {
    console.error('Search log error:', error)
  }
}

/**
 * Format search results as context for AI prompts
 * Used by all AI paths to inject KB content into prompts
 */
export function formatKBResultsForPrompt(
  results: KBSearchResult[],
  maxContentLength = 1500
): string {
  if (results.length === 0) {
    return 'No relevant knowledge base articles found.'
  }

  return results.map((r, i) => {
    const content = r.content.length > maxContentLength
      ? r.content.slice(0, maxContentLength) + '...'
      : r.content
    const source = r.source_file ? ` [Source: ${r.source_file}${r.section_path ? ` > ${r.section_path}` : ''}]` : ''
    const similarity = r.similarity > 0 ? ` (relevance: ${Math.round(r.similarity * 100)}%)` : ''
    return `### Article ${i + 1}: ${r.title}${source}${similarity}\n${content}`
  }).join('\n\n---\n\n')
}
