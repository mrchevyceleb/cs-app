import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai/client'
import { searchKnowledgeHybrid, formatKBResultsForPrompt } from '@/lib/knowledge/search'

const SUGGESTIONS_SYSTEM_PROMPT = `You are an AI assistant helping customer service agents at R-Link, a live social selling platform with Meetings, Webinars, and Live Streams across Basic and Business plans.

Your task is to generate 3 suggested responses for the agent to send to the customer. Each suggestion should:
1. Be professional, warm, and helpful
2. Address the customer's concern directly using knowledge base content
3. Vary in approach: empathetic, solution-focused (with KB citations), and clarifying

IMPORTANT:
- When KB articles are available, include [Source: Article Title] citations in the solution-focused suggestion
- If KB covers the topic, the solution suggestion should contain specific steps/information from the KB
- If KB doesn't cover the topic well, the third suggestion should be a clarifying question to better understand the issue
- Check for plan requirements -- if a feature requires Business plan, mention it

KNOWLEDGE BASE CONTEXT:
{knowledgeContext}

CONVERSATION SO FAR:
{conversationHistory}

CUSTOMER'S LATEST MESSAGE:
{latestMessage}

Generate exactly 3 suggested responses, each 1-3 sentences. Format your response as JSON:
{
  "suggestions": [
    { "text": "...", "type": "empathetic" },
    { "text": "...", "type": "solution" },
    { "text": "...", "type": "clarifying" }
  ]
}`

// POST /api/suggestions - Generate AI response suggestions for agents
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { ticketId, customPrompt } = body

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Missing ticketId' },
        { status: 400 }
      )
    }

    // Fetch ticket with customer info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Fetch recent messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(10)

    // Get the latest customer message for knowledge base search
    const customerMessages = (messages || []).filter(m => m.sender_type === 'customer')
    const latestCustomerMessage = customerMessages[customerMessages.length - 1]?.content || ticket.subject

    // Search knowledge base using hybrid search
    const relevantArticles = await searchKnowledgeHybrid({
      query: latestCustomerMessage,
      limit: 5,
      source: 'suggestions',
      ticketId,
    })
    const kbContext = formatKBResultsForPrompt(relevantArticles, 800)

    // Build conversation history
    const conversationHistory = (messages || [])
      .map(m => `${m.sender_type.toUpperCase()}: ${m.content}`)
      .join('\n\n')

    // Build the prompt
    const prompt = SUGGESTIONS_SYSTEM_PROMPT
      .replace('{knowledgeContext}', kbContext)
      .replace('{conversationHistory}', conversationHistory || 'No previous messages.')
      .replace('{latestMessage}', latestCustomerMessage)

    // Generate suggestions
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        ...(customPrompt ? [{ role: 'user' as const, content: `Additional context: ${customPrompt}` }] : []),
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content || '{}'

    let suggestions: { text: string; type: string }[] = []
    try {
      const parsed = JSON.parse(content)
      suggestions = parsed.suggestions || []
    } catch {
      console.error('Failed to parse suggestions JSON:', content)
      suggestions = [
        { text: "I understand your concern and I'm here to help. Could you tell me more about what happened?", type: 'empathetic' },
        { text: "Let me look into this for you right away and find a solution.", type: 'solution' },
        { text: "To better assist you, could you provide a few more details about your situation?", type: 'clarifying' },
      ]
    }

    return NextResponse.json({
      suggestions,
      ticketId,
      customerName: ticket.customer?.name || 'Customer',
    })
  } catch (error) {
    console.error('Suggestions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
