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
    name: 'resolve_ticket',
    description:
      'Mark the ticket as resolved when the customer confirms their issue is fixed or they are satisfied. Use when the customer says something like "thanks, that worked", "all set", "problem solved", etc. Do NOT use this if the customer is still asking questions or has unresolved issues.',
    input_schema: {
      type: 'object' as const,
      properties: {
        resolution_note: {
          type: 'string',
          description: 'Brief internal note about how the issue was resolved (e.g., "Customer confirmed branding settings were found after guidance").',
        },
      },
      required: ['resolution_note'],
    },
  },
  {
    name: 'escalate_to_human',
    description:
      'Create an email follow-up ticket for the human support team. There are NO human agents in chat -- this triggers an EMAIL to the support team, not a live transfer. Only use after the customer has confirmed they want email follow-up. Your response to the customer should say the team will email them, never say you are "connecting" or "transferring" them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description:
            'INTERNAL: Why email follow-up is needed. Not shown to customer.',
        },
        summary: {
          type: 'string',
          description: 'INTERNAL: Summary of what was already tried and found, for the email support team. Not shown to customer.',
        },
      },
      required: ['reason', 'summary'],
    },
  },
  {
    name: 'update_ticket',
    description:
      'Update the current ticket\'s priority and/or tags. Use when the customer describes urgency or to categorize the issue before resolving.',
    input_schema: {
      type: 'object' as const,
      properties: {
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'New priority level for the ticket.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to set on the ticket (replaces existing tags). E.g. ["billing", "urgent"].',
        },
      },
    },
  },
  {
    name: 'add_internal_note',
    description:
      'Add an internal note visible only to human agents (not the customer). Use to leave context for the support team, especially before escalating.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The internal note content.',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'update_customer',
    description:
      'Update the customer\'s profile with information they have explicitly provided. Only use when the customer directly gives you corrected contact info. Email cannot be changed here.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Customer\'s full name.',
        },
        phone_number: {
          type: 'string',
          description: 'Customer\'s phone number.',
        },
        preferred_language: {
          type: 'string',
          description: 'Customer\'s preferred language (e.g. "en", "es", "fr").',
        },
        preferred_channel: {
          type: 'string',
          enum: ['email', 'widget'],
          description: 'Customer\'s preferred contact channel.',
        },
      },
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
      const query = (toolInput.query as string || '').trim()
      if (!query) {
        result = 'Please provide a search query. What topic or issue should I look up?'
        outputSummary = 'Empty query rejected'
        break
      }
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

    case 'resolve_ticket': {
      const resolutionNote = toolInput.resolution_note as string
      result = JSON.stringify({
        resolved: true,
        resolution_note: resolutionNote,
      })
      outputSummary = `Resolved: ${resolutionNote.slice(0, 80)}`
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

    case 'update_ticket': {
      const priority = toolInput.priority as string | undefined
      const tags = toolInput.tags as string[] | undefined
      if (!priority && !tags) {
        result = 'Please provide at least one field to update (priority or tags).'
        outputSummary = 'No fields provided'
        break
      }

      const updateData: Record<string, unknown> = {}
      if (priority) updateData.priority = priority
      if (tags) updateData.tags = tags

      const { error } = await getSupabase()
        .from('tickets')
        .update(updateData)
        .eq('id', context.ticketId)

      if (error) {
        result = `Failed to update ticket: ${error.message}`
        outputSummary = 'Ticket update failed'
      } else {
        const parts = []
        if (priority) parts.push(`priority=${priority}`)
        if (tags) parts.push(`tags=[${tags.join(', ')}]`)
        result = `Ticket updated: ${parts.join(', ')}.`
        outputSummary = `Updated ticket: ${parts.join(', ')}`
      }
      break
    }

    case 'add_internal_note': {
      const content = toolInput.content as string
      const { error } = await getSupabase()
        .from('messages')
        .insert({
          ticket_id: context.ticketId,
          sender_type: 'ai',
          content,
          metadata: { is_internal: true },
        })

      if (error) {
        result = `Failed to add internal note: ${error.message}`
        outputSummary = 'Internal note failed'
      } else {
        result = 'Internal note added successfully.'
        outputSummary = 'Internal note added'
      }
      break
    }

    case 'update_customer': {
      const { name, phone_number, preferred_language, preferred_channel } = toolInput as {
        name?: string
        phone_number?: string
        preferred_language?: string
        preferred_channel?: string
      }
      const updateData: Record<string, unknown> = {}
      if (name) updateData.name = name
      if (phone_number) updateData.phone_number = phone_number
      if (preferred_language) updateData.preferred_language = preferred_language
      if (preferred_channel) updateData.preferred_channel = preferred_channel

      if (Object.keys(updateData).length === 0) {
        result = 'Please provide at least one field to update.'
        outputSummary = 'No fields provided'
        break
      }

      const { error } = await getSupabase()
        .from('customers')
        .update(updateData)
        .eq('id', context.customerId)

      if (error) {
        result = `Failed to update customer: ${error.message}`
        outputSummary = 'Customer update failed'
      } else {
        const fields = Object.keys(updateData).join(', ')
        result = `Customer profile updated: ${fields}.`
        outputSummary = `Updated customer: ${fields}`
      }
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
