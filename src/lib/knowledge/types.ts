/**
 * Knowledge Base Types
 * Types for KB parsing, ingestion, search, and results
 */

export interface KBChunk {
  title: string
  content: string
  source_file: string
  file_number: number
  chunk_index: number
  section_path: string
  category: KBCategory
  metadata: KBChunkMetadata
}

export interface KBChunkMetadata {
  plan_requirements?: string[]
  is_faq: boolean
  is_troubleshooting: boolean
  cross_references: string[]
  heading_level: number
  word_count: number
}

export type KBCategory =
  | 'Foundation'
  | 'Studio Core'
  | 'Studio Features'
  | 'Admin'
  | 'General'

export interface KBSearchResult {
  id: string
  title: string
  content: string
  category: string | null
  source_file: string | null
  section_path: string | null
  file_number: number | null
  chunk_index: number | null
  metadata: Record<string, unknown> | null
  is_kb_source: boolean | null
  similarity: number
  rank?: number
  combined_score?: number
}

export interface KBSearchOptions {
  query: string
  limit?: number
  source?: KBSearchSource
  ticketId?: string
  customerId?: string
}

export type KBSearchSource =
  | 'triage'
  | 'nova'
  | 'customer_chat'
  | 'suggestions'
  | 'widget'
  | 'portal'
  | 'api'
  | 'auto_response'

export interface KBSearchLogEntry {
  query: string
  search_type: 'vector' | 'keyword' | 'hybrid'
  source: KBSearchSource
  article_ids: string[]
  top_similarity: number | null
  result_count: number
  ticket_id?: string
  customer_id?: string
}

export interface KBIngestResult {
  file: string
  chunks_created: number
  chunks_deleted: number
  errors: string[]
}

export interface KBIngestSummary {
  total_files: number
  total_chunks: number
  total_errors: number
  results: KBIngestResult[]
}
