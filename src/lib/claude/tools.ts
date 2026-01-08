import type { Tool } from '@anthropic-ai/sdk/resources/messages'

// Tool definitions for Nova (Agent Copilot)
export const copilotTools: Tool[] = [
  {
    name: 'lookup_customer',
    description: 'Look up customer information by email or customer ID. Returns customer profile, subscription status, and recent activity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: {
          type: 'string',
          description: 'The unique customer ID',
        },
        email: {
          type: 'string',
          description: 'The customer email address',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_tickets',
    description: 'Search through support tickets by customer, status, keywords, or date range. Returns matching tickets with summaries.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query for ticket content',
        },
        customer_id: {
          type: 'string',
          description: 'Filter by customer ID',
        },
        status: {
          type: 'string',
          enum: ['open', 'pending', 'resolved', 'escalated'],
          description: 'Filter by ticket status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'update_ticket',
    description: 'Update a ticket\'s status, priority, tags, or assignment. Use this to resolve, escalate, or modify ticket properties.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to update',
        },
        status: {
          type: 'string',
          enum: ['open', 'pending', 'resolved', 'escalated'],
          description: 'New status for the ticket',
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high', 'urgent'],
          description: 'New priority level',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add to the ticket',
        },
      },
      required: ['ticket_id'],
    },
  },
  {
    name: 'process_refund',
    description: 'Process a refund for a customer order. Requires order ID, amount, and reason. This action will actually process the refund.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'string',
          description: 'The order ID to refund',
        },
        amount: {
          type: 'number',
          description: 'Amount to refund in dollars',
        },
        reason: {
          type: 'string',
          description: 'Reason for the refund',
        },
      },
      required: ['order_id', 'amount', 'reason'],
    },
  },
  {
    name: 'update_customer',
    description: 'Update customer profile settings like name, email preferences, or language preference.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customer_id: {
          type: 'string',
          description: 'The customer ID to update',
        },
        name: {
          type: 'string',
          description: 'New display name',
        },
        preferred_language: {
          type: 'string',
          description: 'Preferred language code (en, es, tl, hi)',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata to update',
        },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for relevant articles. Returns matching articles with titles and content snippets.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query for knowledge base',
        },
        category: {
          type: 'string',
          description: 'Filter by category',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_response',
    description: 'Generate a draft response for the current ticket based on context and knowledge base. Returns 2-3 response options.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to generate response for',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'friendly', 'apologetic', 'technical'],
          description: 'Tone of the response',
        },
        include_kb: {
          type: 'boolean',
          description: 'Whether to include knowledge base references',
        },
      },
      required: ['ticket_id'],
    },
  },
  {
    name: 'escalate_ticket',
    description: 'Escalate a ticket to a supervisor with notes. Use for complex issues requiring higher-level attention.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to escalate',
        },
        reason: {
          type: 'string',
          description: 'Reason for escalation',
        },
        notes: {
          type: 'string',
          description: 'Additional notes for the supervisor',
        },
      },
      required: ['ticket_id', 'reason'],
    },
  },
  {
    name: 'get_ticket_summary',
    description: 'Get an AI-generated summary of a ticket conversation including key points and customer sentiment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to summarize',
        },
      },
      required: ['ticket_id'],
    },
  },
  {
    name: 'analyze_sentiment',
    description: 'Analyze customer sentiment from recent messages. Returns sentiment score and indicators.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The ticket ID to analyze',
        },
      },
      required: ['ticket_id'],
    },
  },
]

// Tool result type
export type ToolResult = {
  success: boolean
  data?: unknown
  error?: string
}
