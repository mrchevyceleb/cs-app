/**
 * AI Agent Types
 * Types for the agentic problem-solving loop
 */

import type { ChannelType } from '@/types/channels'
import type { Ticket, Customer } from '@/types/database'

/** Input to the agentic solver */
export interface AgentInput {
  message: string
  ticket: Ticket
  customer: Customer
  channel: ChannelType
  /** Previous messages in this ticket for context */
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/** Result from the agent */
export interface AgentResult {
  type: 'response' | 'escalation' | 'timeout' | 'error'
  content: string
  confidence: number
  /** KB article IDs referenced during tool use */
  kbArticleIds: string[]
  /** Number of web searches performed */
  webSearchCount: number
  /** Total tool calls made */
  totalToolCalls: number
  /** Detailed log of each tool call */
  toolCallsDetail: ToolCallLog[]
  /** Total duration in ms */
  durationMs: number
  /** Token usage */
  inputTokens: number
  outputTokens: number
  /** Escalation info (only if type === 'escalation') */
  escalationReason?: string
  escalationSummary?: string
}

export interface ToolCallLog {
  tool: string
  input: Record<string, unknown>
  output_summary: string
  duration_ms: number
}

/** Events emitted during streaming */
export type AgentStreamEvent =
  | { type: 'thinking' }
  | { type: 'tool_call'; tool: string; description: string }
  | { type: 'tool_result'; tool: string; success: boolean }
  | { type: 'text_delta'; content: string }
  | { type: 'complete'; result: AgentResult }
  | { type: 'error'; error: string }
