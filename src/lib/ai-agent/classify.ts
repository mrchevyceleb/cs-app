/**
 * AI Ticket Priority Classification & Subject Generation
 * Lightweight Haiku calls to classify ticket urgency and generate readable subjects
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

const SUBJECT_PROMPT = `Generate a short, clear support ticket subject line from the customer's message. Rules:
- 3-8 words max
- Sentence case (capitalize first word only)
- No quotes, no punctuation at the end
- Describe the core issue or request, not the customer's feelings
- Be specific: "CTA button not responding" not "Button issue"

Examples:
- "I can't log in to my account since yesterday" -> Account login failure
- "how do I add more people to my team plan" -> Adding users to team plan
- "the video keeps buffering and freezing during calls" -> Video buffering during calls
- "I want to cancel my subscription" -> Subscription cancellation request
- "what's the difference between basic and business" -> Plan comparison inquiry

Output ONLY the subject line, nothing else.`

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

/**
 * Generate a concise, readable ticket subject from the customer's message.
 * Uses Haiku for speed (~200ms). Falls back to truncated message on error.
 */
export async function generateTicketSubject(
  messageContent: string
): Promise<string> {
  const fallback = messageContent.trim().slice(0, 80)
  try {
    const client = getAnthropicClient()

    const response = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 30,
        temperature: 0,
        system: SUBJECT_PROMPT,
        messages: [{ role: 'user', content: messageContent.trim().slice(0, 500) }],
      }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 2000)),
    ])

    if (!response) return fallback

    const subject = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      // Strip wrapping quotes the model sometimes adds
      .replace(/^["']|["']$/g, '')
      .trim()

    return subject || fallback
  } catch (error) {
    console.error('[Classify] Subject generation failed, using fallback:', error)
    return fallback
  }
}
