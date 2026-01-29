import type {
  ToolContext,
  ToolResult,
  GenerateResponseInput,
  GeneratedResponse,
} from '../types'
import { getAnthropicClient, COPILOT_MODEL } from '../client'
import { RESPONSE_GENERATION_PROMPT } from '../prompts'
import { searchKnowledgeBase } from './knowledge'

/**
 * Generate draft response options for a ticket
 */
export async function generateResponse(
  input: GenerateResponseInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context
  const tone = input.tone || 'friendly'
  const includeKb = input.include_kb !== false // Default to true

  if (!input.ticket_id) {
    return {
      success: false,
      error: 'ticket_id is required',
    }
  }

  try {
    // Fetch ticket with customer info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        status,
        priority,
        customer:customers(id, name, email, preferred_language)
      `)
      .eq('id', input.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return {
        success: false,
        error: `Ticket not found: ${input.ticket_id}`,
      }
    }

    // Fetch recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_type, content, created_at')
      .eq('ticket_id', input.ticket_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    // Format messages for prompt
    const recentMessages = (messages || [])
      .reverse()
      .map((m) => {
        const sender = m.sender_type === 'customer' ? 'Customer' : m.sender_type === 'agent' ? 'Agent' : 'AI'
        return `[${sender}]: ${m.content}`
      })
      .join('\n')

    // Search knowledge base using both subject AND latest customer message
    let kbArticles = 'No knowledge base articles searched.'
    if (includeKb) {
      // Get latest customer message for better search context
      const customerMessages = (messages || [])
        .reverse()
        .filter(m => m.sender_type === 'customer')
      const latestCustomerMessage = customerMessages[0]?.content || ''
      const searchQuery = [ticket.subject, latestCustomerMessage].filter(Boolean).join(' ')

      if (searchQuery) {
        const kbResult = await searchKnowledgeBase(
          { query: searchQuery, limit: 5 },
          context
        )
        if (kbResult.success && kbResult.data) {
          const kbData = kbResult.data as {
            articles: { title: string; content: string }[]
            sources?: { source_file: string; section_path: string; similarity: number }[]
          }
          if (kbData.articles && kbData.articles.length > 0) {
            kbArticles = kbData.articles
              .map((a, i) => {
                const source = kbData.sources?.[i]
                const sourceLabel = source?.source_file ? ` [Source: ${source.source_file}]` : ''
                return `**${a.title}**${sourceLabel}\n${a.content}`
              })
              .join('\n\n---\n\n')
          }
        }
      }
    }

    const customer = ticket.customer as { id: string; name: string | null; email: string | null; preferred_language: string } | null

    // Build the prompt
    const prompt = RESPONSE_GENERATION_PROMPT
      .replace('{customerName}', customer?.name || 'Customer')
      .replace('{ticketSubject}', ticket.subject)
      .replace('{recentMessages}', recentMessages || 'No previous messages.')
      .replace('{kbArticles}', kbArticles)
      .replace('{tone}', tone)

    // Generate responses using Claude
    const response = await getAnthropicClient().messages.create({
      model: COPILOT_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse the JSON response
    let generatedResponses: GeneratedResponse[] = []
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*"responses"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        generatedResponses = parsed.responses || []
      }
    } catch {
      // If JSON parsing fails, create a single response from the text
      generatedResponses = [
        {
          type: tone,
          content: responseText,
          confidence: 70,
        },
      ]
    }

    // Ensure we have valid responses
    if (generatedResponses.length === 0) {
      generatedResponses = [
        {
          type: 'friendly',
          content: `Hi ${customer?.name || 'there'},\n\nThank you for reaching out about "${ticket.subject}". I'd be happy to help you with this.\n\n[Agent to complete response based on context]\n\nPlease let me know if you have any questions.\n\nBest regards`,
          confidence: 50,
        },
      ]
    }

    return {
      success: true,
      data: {
        ticket_id: ticket.id,
        ticket_subject: ticket.subject,
        customer_name: customer?.name,
        requested_tone: tone,
        responses: generatedResponses,
        kb_articles_used: includeKb,
      },
    }
  } catch (error) {
    console.error('generateResponse error:', error)
    return {
      success: false,
      error: 'Failed to generate response options',
    }
  }
}
