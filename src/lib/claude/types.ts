import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase client type
export type SupabaseClientType = SupabaseClient<Database>

// Context passed to all tool handlers
export interface ToolContext {
  supabase: SupabaseClientType
  agentId?: string
  ticketId?: string
  customerId?: string
}

// Standard result type for all tool handlers
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ==========================================
// Tool Input Types (matching tool schemas)
// ==========================================

// lookup_customer
export interface LookupCustomerInput {
  customer_id?: string
  email?: string
}

// search_tickets
export interface SearchTicketsInput {
  query?: string
  customer_id?: string
  status?: 'open' | 'pending' | 'resolved' | 'escalated'
  limit?: number
}

// update_ticket
export interface UpdateTicketInput {
  ticket_id: string
  status?: 'open' | 'pending' | 'resolved' | 'escalated'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  tags?: string[]
}

// process_refund
export interface ProcessRefundInput {
  order_id: string
  amount: number
  reason: string
}

// update_customer
export interface UpdateCustomerInput {
  customer_id: string
  name?: string
  preferred_language?: string
  metadata?: Record<string, unknown>
}

// search_knowledge_base
export interface SearchKnowledgeBaseInput {
  query: string
  category?: string
  limit?: number
}

// generate_response
export interface GenerateResponseInput {
  ticket_id: string
  tone?: 'formal' | 'friendly' | 'apologetic' | 'technical'
  include_kb?: boolean
}

// escalate_ticket
export interface EscalateTicketInput {
  ticket_id: string
  reason: string
  notes?: string
}

// get_ticket_summary
export interface GetTicketSummaryInput {
  ticket_id: string
}

// analyze_sentiment
export interface AnalyzeSentimentInput {
  ticket_id: string
}

// ==========================================
// Tool Output Types
// ==========================================

export interface CustomerInfo {
  id: string
  name: string | null
  email: string | null
  preferred_language: string
  created_at: string
  metadata: Record<string, unknown>
  recent_tickets: {
    id: string
    subject: string
    status: string
    created_at: string
  }[]
  total_tickets: number
}

export interface TicketSearchResult {
  id: string
  subject: string
  status: string
  priority: string
  created_at: string
  customer_name: string | null
  customer_email: string | null
  tags: string[]
}

export interface TicketSummary {
  issue: string
  key_points: string[]
  current_status: string
  customer_sentiment: 'frustrated' | 'neutral' | 'happy'
  recommended_action: string
  message_count: number
}

export interface SentimentAnalysis {
  score: number // 1-5
  indicators: string[]
  trend: 'improving' | 'declining' | 'stable'
  riskLevel: 'low' | 'medium' | 'high'
  summary: string
}

export interface GeneratedResponse {
  type: 'formal' | 'friendly' | 'apologetic' | 'technical'
  content: string
  confidence: number // 0-100
}

export interface KnowledgeSearchResult {
  id: string
  title: string
  content: string
  category: string | null
  similarity: number
}

// ==========================================
// Agentic Loop Types
// ==========================================

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: unknown
  tool_use_id?: string
  content?: string
  is_error?: boolean
}

// SSE Event types for streaming
export type SSEEventType =
  | 'text'
  | 'tool_start'
  | 'tool_result'
  | 'error'
  | 'done'

export interface SSEEvent {
  type: SSEEventType
  content?: string
  tool?: {
    name: string
    input?: unknown
    result?: ToolResult
  }
  error?: string
}

// Agent request/response types
export interface CopilotRequest {
  message: string
  ticketId?: string
  customerId?: string
  conversationHistory?: ConversationMessage[]
}

export interface CopilotStreamOptions {
  onText?: (text: string) => void
  onToolStart?: (toolName: string, input: unknown) => void
  onToolResult?: (toolName: string, result: ToolResult) => void
  onError?: (error: string) => void
  onDone?: () => void
}
