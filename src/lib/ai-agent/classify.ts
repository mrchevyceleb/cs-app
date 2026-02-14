/**
 * AI Ticket Priority Classification
 * Lightweight Haiku call to classify ticket urgency from first message
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from '@/lib/claude/client'

type Priority = 'low' | 'normal' | 'high' | 'urgent'

const VALID_PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent']

const CLASSIFICATION_PROMPT = `You are a ticket priority classifier. Given a support message, output ONLY one word: low, normal, high, or urgent.

Rules:
- urgent: account compromised, cannot use product at all, data loss, legal threat, complete outage
- high: billing issue, major feature broken, time-sensitive request, cannot complete core workflow
- normal: how-to questions, general troubleshooting, feature requests, minor bugs
- low: feedback, cosmetic issues, general questions, suggestions

Output ONLY the priority word, nothing else.`

/**
 * Classify ticket priority from first message content.
 * Uses Haiku for speed and cost (~0.01 cents per call).
 * Falls back to 'normal' on any error.
 */
export async function classifyTicketPriority(
  messageContent: string,
  subject?: string
): Promise<Priority> {
  try {
    const client = getAnthropicClient()
    const input = subject
      ? `Subject: ${subject}\n\nMessage: ${messageContent.slice(0, 500)}`
      : messageContent.slice(0, 500)

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: CLASSIFICATION_PROMPT,
      messages: [{ role: 'user', content: input }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .toLowerCase() as Priority

    if (VALID_PRIORITIES.includes(text)) {
      return text
    }

    // Try to extract priority from response if it contains extra text
    const match = text.match(/\b(urgent|high|normal|low)\b/)
    if (match) {
      return match[1] as Priority
    }

    return 'normal'
  } catch (error) {
    console.error('[Classify] Priority classification failed, defaulting to normal:', error)
    return 'normal'
  }
}
