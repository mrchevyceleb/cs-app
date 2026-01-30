/**
 * Brave Search API Types
 */

export interface BraveSearchOptions {
  query: string
  count?: number // max results, default 5
}

export interface BraveSearchResult {
  title: string
  url: string
  description: string
}

// Brave API response shape (subset we care about)
export interface BraveApiResponse {
  web?: {
    results?: Array<{
      title: string
      url: string
      description: string
    }>
  }
}
