import { openai, CHAT_MODEL, EMBEDDING_MODEL } from './client'
import {
  CUSTOMER_CHATBOT_SYSTEM_PROMPT,
  TRANSLATION_PROMPT,
  LANGUAGE_DETECTION_PROMPT,
  CONFIDENCE_EVALUATION_PROMPT,
} from './prompts'
import { createClient } from '@/lib/supabase/server'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
  confidence: number
  originalLanguage?: string
  translatedContent?: string
  shouldEscalate: boolean
  escalationReason?: string
}

export interface ConversationContext {
  ticketId: string
  customerId: string
  customerName: string
  preferredLanguage: string
  ticketHistory: string[]
  previousMessages: ChatMessage[]
}

// Detect language of input text
export async function detectLanguage(text: string): Promise<string> {
  const prompt = LANGUAGE_DETECTION_PROMPT.replace('{text}', text)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 5,
    temperature: 0,
  })

  const detected = response.choices[0]?.message?.content?.trim().toLowerCase() || 'en'
  return detected.slice(0, 2) // Ensure it's just the 2-letter code
}

// Translate text between languages
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<string> {
  if (sourceLanguage === targetLanguage) {
    return text
  }

  const prompt = TRANSLATION_PROMPT
    .replace('{sourceLanguage}', sourceLanguage)
    .replace('{targetLanguage}', targetLanguage)
    .replace('{text}', text)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000,
    temperature: 0.3,
  })

  return response.choices[0]?.message?.content?.trim() || text
}

// Evaluate AI confidence in the response
async function evaluateConfidence(
  question: string,
  aiResponse: string,
  hasKBMatch: boolean
): Promise<number> {
  const prompt = CONFIDENCE_EVALUATION_PROMPT
    .replace('{question}', question)
    .replace('{response}', aiResponse)
    .replace('{hasKBMatch}', hasKBMatch ? 'Yes' : 'No')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 5,
    temperature: 0,
  })

  const confidence = parseInt(response.choices[0]?.message?.content?.trim() || '50', 10)
  return Math.min(100, Math.max(0, confidence))
}

// Check if escalation is needed
function checkEscalationTriggers(
  message: string,
  messageCount: number,
  confidence: number
): { shouldEscalate: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase()

  // Explicit human request
  if (
    lowerMessage.includes('human') ||
    lowerMessage.includes('agent') ||
    lowerMessage.includes('representative') ||
    lowerMessage.includes('speak to someone') ||
    lowerMessage.includes('talk to someone')
  ) {
    return { shouldEscalate: true, reason: 'Customer requested human agent' }
  }

  // Security/account access
  if (
    lowerMessage.includes('password') ||
    lowerMessage.includes('hacked') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('security')
  ) {
    return { shouldEscalate: true, reason: 'Security-related issue detected' }
  }

  // Billing disputes
  if (
    (lowerMessage.includes('refund') || lowerMessage.includes('charge') || lowerMessage.includes('billing')) &&
    (lowerMessage.includes('wrong') || lowerMessage.includes('error') || lowerMessage.includes('dispute'))
  ) {
    return { shouldEscalate: true, reason: 'Billing dispute detected' }
  }

  // Frustration detection (multiple messages, negative sentiment)
  if (messageCount >= 3) {
    const frustrationWords = ['frustrated', 'angry', 'upset', 'ridiculous', "doesn't work", 'useless', 'terrible', 'awful']
    if (frustrationWords.some((word) => lowerMessage.includes(word))) {
      return { shouldEscalate: true, reason: 'High frustration detected' }
    }
  }

  // Low confidence
  if (confidence < 40) {
    return { shouldEscalate: true, reason: 'AI confidence too low for reliable response' }
  }

  return { shouldEscalate: false }
}

// Search knowledge base for relevant articles
export async function searchKnowledgeBase(query: string): Promise<{ title: string; content: string }[]> {
  const supabase = await createClient()

  // Generate embedding for the query
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  })

  const queryEmbedding = embeddingResponse.data[0].embedding

  // Search for similar articles
  const { data: articles, error } = await supabase.rpc('match_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 3,
  })

  if (error) {
    console.error('Knowledge base search error:', error)
    return []
  }

  return articles || []
}

// Generate AI response
export async function generateChatResponse(
  customerMessage: string,
  context: ConversationContext
): Promise<ChatResponse> {
  // Detect language if not English
  const detectedLanguage = await detectLanguage(customerMessage)

  // Translate to English for processing if needed
  let processedMessage = customerMessage
  if (detectedLanguage !== 'en') {
    processedMessage = await translateText(customerMessage, detectedLanguage, 'en')
  }

  // Search knowledge base
  const relevantArticles = await searchKnowledgeBase(processedMessage)
  const hasKBMatch = relevantArticles.length > 0

  // Build knowledge base context
  const kbContext = relevantArticles.length > 0
    ? relevantArticles.map((a) => `**${a.title}**\n${a.content}`).join('\n\n---\n\n')
    : 'No relevant articles found in knowledge base.'

  // Build system prompt
  const systemPrompt = CUSTOMER_CHATBOT_SYSTEM_PROMPT
    .replace('{relevantArticles}', kbContext)
    .replace('{customerName}', context.customerName)
    .replace('{preferredLanguage}', context.preferredLanguage)
    .replace('{ticketHistory}', context.ticketHistory.join(', ') || 'No previous issues')

  // Build messages array
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...context.previousMessages,
    { role: 'user', content: processedMessage },
  ]

  // Generate response
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    max_tokens: 500,
    temperature: 0.7,
  })

  const aiResponse = response.choices[0]?.message?.content?.trim() || "I'm sorry, I couldn't process your request. Let me connect you with a human agent."

  // Evaluate confidence
  const confidence = await evaluateConfidence(processedMessage, aiResponse, hasKBMatch)

  // Check for escalation triggers
  const escalation = checkEscalationTriggers(
    customerMessage,
    context.previousMessages.filter((m) => m.role === 'user').length + 1,
    confidence
  )

  // Translate response back to customer's language if needed
  let translatedResponse: string | undefined
  if (detectedLanguage !== 'en') {
    translatedResponse = await translateText(aiResponse, 'en', detectedLanguage)
  }

  return {
    content: aiResponse,
    confidence,
    originalLanguage: detectedLanguage !== 'en' ? detectedLanguage : undefined,
    translatedContent: translatedResponse,
    shouldEscalate: escalation.shouldEscalate,
    escalationReason: escalation.reason,
  }
}

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  return response.data[0].embedding
}
