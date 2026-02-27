/**
 * AI Agent Tool Definitions & Dispatcher
 * Defines the tools Claude can call and executes them
 */

import type Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { searchKnowledgeHybrid, formatKBResultsForPrompt } from '@/lib/knowledge/search'
import { searchBrave } from '@/lib/brave/client'
import type { ToolCallLog } from './types'

// Lazy Supabase
let _supabase: SupabaseClient<Database> | null = null
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SB_URL
    const key = process.env.SB_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase env vars')
    _supabase = createClient<Database>(url, key)
  }
  return _supabase
}

/**
 * Tool definitions in Anthropic Tool format
 */
export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_knowledge_base',
    description:
      'Search the internal R-Link knowledge base for articles, FAQs, and troubleshooting guides. Always try this first. If results are poor, try rephrasing your query with different keywords.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query. Try specific keywords related to the customer issue.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_web',
    description:
      'Search the web for information when the knowledge base does not cover the topic. Use for general tech questions, R-Link features not in KB, or industry-standard troubleshooting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Web search query. Include "R-Link" if searching for platform-specific info.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_customer_context',
    description:
      "Get the customer's profile and recent ticket history. Useful for understanding recurring issues or account-specific context.",
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: {
          type: 'string',
          description: 'The customer ID to look up.',
        },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_ticket_messages',
    description:
      'Get the recent message history for a ticket. Use to understand what has already been discussed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to get messages for.',
        },
      },
      required: ['ticket_id'],
    },
  },
  {
    name: 'escalate_to_human',
    description:
      'Escalate to a human agent. ONLY use as an absolute last resort after exhausting other tools. You must provide a reason and a summary of what you already tried.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description:
            'Why escalation is needed: repeated human demand, security breach, legal threat, billing dispute, or all tools exhausted.',
        },
        summary: {
          type: 'string',
          description: 'Summary of what you already tried and found for the human agent.',
        },
      },
      required: ['reason', 'summary'],
    },
  },
]

/** Context passed to tool executor for data access */
export interface ToolContext {
  ticketId: string
  customerId: string
  channel?: string
}

/**
 * Execute a tool call and return the result string
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolContext,
  priorToolCallCount: number
): Promise<{ result: string; log: ToolCallLog }> {
  const start = Date.now()
  let result: string
  let outputSummary: string

  switch (toolName) {
    case 'search_knowledge_base': {
      const query = toolInput.query as string
      const articles = await searchKnowledgeHybrid({
        query,
        limit: 5,
        source: 'triage',
        ticketId: context.ticketId,
        customerId: context.customerId,
      })

      if (articles.length === 0) {
        result = 'No knowledge base articles found for this query. Try rephrasing with different keywords, or use search_web.'
        outputSummary = 'No KB results'
      } else {
        result = formatKBResultsForPrompt(articles, 2000)
        outputSummary = `Found ${articles.length} KB articles (top similarity: ${articles[0]?.similarity.toFixed(2)})`
      }
      break
    }

    case 'search_web': {
      const query = toolInput.query as string
      const apiKey = process.env.BRAVE_SEARCH_API_KEY
      if (!apiKey) {
        result = 'Web search is not configured. Continue with knowledge base information only.'
        outputSummary = 'Web search not configured'
        break
      }

      const webResults = await searchBrave({ query, count: 5 })
      if (webResults.length === 0) {
        result = 'No web results found. Try a different query or use what you already know.'
        outputSummary = 'No web results'
      } else {
        result = webResults
          .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`)
          .join('\n\n')
        outputSummary = `Found ${webResults.length} web results`
      }
      break
    }

    case 'get_customer_context': {
      const customerId = toolInput.customer_id as string
      const supabase = getSupabase()

      const [customerResult, ticketsResult] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, email, phone_number, preferred_language, preferred_channel, created_at')
          .eq('id', customerId)
          .single(),
        supabase
          .from('tickets')
          .select('id, subject, status, priority, source_channel, created_at, ai_handled')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const customer = customerResult.data
      const tickets = ticketsResult.data || []

      if (!customer) {
        result = 'Customer not found.'
        outputSummary = 'Customer not found'
      } else {
        result = `## Customer Profile
- Name: ${customer.name || 'Unknown'}
- Email: ${customer.email || 'Unknown'}
- Phone: ${customer.phone_number || 'None'}
- Language: ${customer.preferred_language}
- Preferred Channel: ${customer.preferred_channel}
- Member Since: ${customer.created_at}

## Recent Tickets (${tickets.length})
${tickets.length > 0
  ? tickets.map((t) => `- [${t.status}] ${t.subject} (${t.priority}, via ${t.source_channel})`).join('\n')
  : 'No previous tickets'
}`
        outputSummary = `Customer found, ${tickets.length} recent tickets`
      }
      break
    }

    case 'get_ticket_messages': {
      const ticketId = toolInput.ticket_id as string
      const supabase = getSupabase()

      const { data: messages } = await supabase
        .from('messages')
        .select('sender_type, content, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (!messages || messages.length === 0) {
        result = 'No messages found in this ticket.'
        outputSummary = 'No messages'
      } else {
        result = messages
          .map((m) => `[${m.sender_type}] ${m.content}`)
          .join('\n\n')
        outputSummary = `${messages.length} messages retrieved`
      }
      break
    }

    case 'escalate_to_human': {
      // Channel-aware escalation gate: widget requires more effort than other channels
      const minToolCalls = context.channel === 'widget' || context.channel === 'portal' ? 4
        : context.channel === 'email' ? 3
        : 2

      if (priorToolCallCount < minToolCalls) {
        result =
          `You must try harder before escalating. You've only used ${priorToolCallCount} tools (minimum: ${minToolCalls}). ` +
          'Try: (1) search_knowledge_base with different phrasings, ' +
          '(2) search_web for broader information, ' +
          '(3) get_customer_context for account details, ' +
          '(4) ask the customer a clarifying question. ' +
          'Only escalate after exhausting these options.'
        outputSummary = 'Escalation blocked: insufficient tool usage'
        break
      }

      const reason = toolInput.reason as string
      const summary = toolInput.summary as string
      result = JSON.stringify({
        escalated: true,
        reason,
        summary,
      })
      outputSummary = `Escalated: ${reason.slice(0, 80)}`
      break
    }

    default:
      result = `Unknown tool: ${toolName}`
      outputSummary = `Unknown tool: ${toolName}`
  }

  return {
    result,
    log: {
      tool: toolName,
      input: toolInput,
      output_summary: outputSummary,
      duration_ms: Date.now() - start,
    },
  }
}
