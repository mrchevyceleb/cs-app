/**
 * Brave Search API Client
 * Web search with rate limiting (1 req/sec burst 5) and in-memory cache (100 entries, 5min TTL)
 */

import type { BraveSearchOptions, BraveSearchResult, BraveApiResponse } from './types'

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search'
const CACHE_MAX_ENTRIES = 100
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Rate limiter: token bucket (1 req/sec, burst 5)
const rateLimiter = {
  tokens: 5,
  maxTokens: 5,
  refillRate: 1, // tokens per second
  lastRefill: Date.now(),

  tryAcquire(): boolean {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  },
}

// Simple LRU-ish cache
const cache = new Map<string, { results: BraveSearchResult[]; timestamp: number }>()

function getCached(key: string): BraveSearchResult[] | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.results
}

function setCache(key: string, results: BraveSearchResult[]): void {
  // Evict oldest if at capacity
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, { results, timestamp: Date.now() })
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Search the web using Brave Search API.
 * Returns empty array on error or missing API key - never throws.
 */
export async function searchBrave(options: BraveSearchOptions): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    console.warn('[Brave] BRAVE_SEARCH_API_KEY is not set, web search disabled')
    return []
  }

  const { query, count = 5 } = options
  if (!query || query.trim().length < 2) return []

  const cacheKey = `${query.trim().toLowerCase()}:${count}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  if (!rateLimiter.tryAcquire()) {
    console.warn('[Brave] Rate limit exceeded, returning empty results')
    return []
  }

  try {
    const url = new URL(BRAVE_API_URL)
    url.searchParams.set('q', query.trim())
    url.searchParams.set('count', String(count))

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      console.error(`[Brave] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: BraveApiResponse = await response.json()

    const results: BraveSearchResult[] = (data.web?.results || [])
      .slice(0, count)
      .map((r) => ({
        title: stripHtml(r.title || ''),
        url: r.url || '',
        description: stripHtml(r.description || '').slice(0, 500),
      }))

    setCache(cacheKey, results)
    return results
  } catch (error) {
    console.error('[Brave] Search failed:', error)
    return []
  }
}
