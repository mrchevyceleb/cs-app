import type { ToolContext, ToolResult } from '../types'

// Import individual handlers
import { lookupCustomer, updateCustomer } from './customer'
import { searchTickets, updateTicket, escalateTicket, getTicketSummary } from './tickets'
import { searchKnowledgeBase } from './knowledge'
import { generateResponse } from './response'
import { analyzeSentiment } from './analysis'
import { processRefund } from './refund'

// Re-export all handlers for direct use
export {
  lookupCustomer,
  updateCustomer,
  searchTickets,
  updateTicket,
  escalateTicket,
  getTicketSummary,
  searchKnowledgeBase,
  generateResponse,
  analyzeSentiment,
  processRefund,
}

// Tool name type
export type ToolName =
  | 'lookup_customer'
  | 'update_customer'
  | 'search_tickets'
  | 'update_ticket'
  | 'escalate_ticket'
  | 'get_ticket_summary'
  | 'search_knowledge_base'
  | 'generate_response'
  | 'analyze_sentiment'
  | 'process_refund'

/**
 * Execute a tool by name with given input
 * This is the main dispatcher for the agentic loop
 */
export async function executeTool(
  name: string,
  input: unknown,
  context: ToolContext
): Promise<ToolResult> {
  const toolInput = input as Record<string, unknown>

  try {
    switch (name) {
      case 'lookup_customer':
        return await lookupCustomer(
          {
            customer_id: toolInput.customer_id as string | undefined,
            email: toolInput.email as string | undefined,
          },
          context
        )

      case 'update_customer':
        return await updateCustomer(
          {
            customer_id: toolInput.customer_id as string,
            name: toolInput.name as string | undefined,
            preferred_language: toolInput.preferred_language as string | undefined,
            metadata: toolInput.metadata as Record<string, unknown> | undefined,
          },
          context
        )

      case 'search_tickets':
        return await searchTickets(
          {
            query: toolInput.query as string | undefined,
            customer_id: toolInput.customer_id as string | undefined,
            status: toolInput.status as 'open' | 'pending' | 'resolved' | 'escalated' | undefined,
            limit: toolInput.limit as number | undefined,
          },
          context
        )

      case 'update_ticket':
        return await updateTicket(
          {
            ticket_id: toolInput.ticket_id as string,
            status: toolInput.status as 'open' | 'pending' | 'resolved' | 'escalated' | undefined,
            priority: toolInput.priority as 'low' | 'normal' | 'high' | 'urgent' | undefined,
            tags: toolInput.tags as string[] | undefined,
          },
          context
        )

      case 'escalate_ticket':
        return await escalateTicket(
          {
            ticket_id: toolInput.ticket_id as string,
            reason: toolInput.reason as string,
            notes: toolInput.notes as string | undefined,
          },
          context
        )

      case 'get_ticket_summary':
        return await getTicketSummary(
          {
            ticket_id: toolInput.ticket_id as string,
          },
          context
        )

      case 'search_knowledge_base':
        return await searchKnowledgeBase(
          {
            query: toolInput.query as string,
            category: toolInput.category as string | undefined,
            limit: toolInput.limit as number | undefined,
          },
          context
        )

      case 'generate_response':
        return await generateResponse(
          {
            ticket_id: toolInput.ticket_id as string,
            tone: toolInput.tone as 'formal' | 'friendly' | 'apologetic' | 'technical' | undefined,
            include_kb: toolInput.include_kb as boolean | undefined,
          },
          context
        )

      case 'analyze_sentiment':
        return await analyzeSentiment(
          {
            ticket_id: toolInput.ticket_id as string,
          },
          context
        )

      case 'process_refund':
        return await processRefund(
          {
            order_id: toolInput.order_id as string,
            amount: toolInput.amount as number,
            reason: toolInput.reason as string,
          },
          context
        )

      default:
        return {
          success: false,
          error: `Unknown tool: ${name}`,
        }
    }
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    }
  }
}
