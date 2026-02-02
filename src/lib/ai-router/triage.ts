/**
 * AI Triage
 * Uses Claude to analyze messages and determine routing
 * Enhanced with hybrid KB search for KB-grounded decisions
 */

import Anthropic from '@anthropic-ai/sdk';
import { withFallback } from '@/lib/claude/client';
import type { ChannelType, RoutingDecision } from '@/types/channels';
import type { Ticket, Customer } from '@/types/database';
import { TRIAGE_PROMPT, RESPONSE_PROMPT } from './prompts';
import { searchKnowledgeHybrid, formatKBResultsForPrompt } from '@/lib/knowledge/search';
import type { KBSearchResult } from '@/lib/knowledge/types';

interface TriageInput {
  message: string;
  ticket: Ticket;
  customer: Customer;
  channel: ChannelType;
}

// Escalation keywords that trigger immediate human review
const ESCALATION_KEYWORDS = [
  'urgent',
  'emergency',
  'legal',
  'lawyer',
  'lawsuit',
  'refund',
  'cancel subscription',
  'delete my account',
  'security breach',
  'hacked',
  'fraud',
  'angry',
  'furious',
  'unacceptable',
  'speak to manager',
  'supervisor',
  'human',
  'real person',
];

/**
 * Triage a message and determine routing
 */
export async function triageMessage(input: TriageInput): Promise<RoutingDecision> {
  const startTime = Date.now();

  // Check for escalation keywords first
  const lowerMessage = input.message.toLowerCase();
  const matchedKeyword = ESCALATION_KEYWORDS.find(kw => lowerMessage.includes(kw));

  if (matchedKeyword) {
    return {
      intent: 'escalation_requested',
      confidence: 1.0,
      action: 'escalate',
      escalation_reason: `Customer message contains escalation keyword: "${matchedKeyword}"`,
      processing_time_ms: Date.now() - startTime,
      model_used: 'keyword_match',
    };
  }

  // Search knowledge base using hybrid search
  const knowledgeArticles = await searchKnowledgeHybrid({
    query: input.message,
    limit: 5,
    source: 'triage',
    ticketId: input.ticket.id,
    customerId: input.customer.id,
  });

  // Build context for Claude
  const context = buildTriageContext(input, knowledgeArticles);

  try {
    const response = await withFallback(client =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: TRIAGE_PROMPT,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
      })
    );

    // Parse response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const decision = parseTriageResponse(responseText);

    // Apply KB-based confidence adjustments
    if (knowledgeArticles.length > 0) {
      decision.knowledge_articles_used = knowledgeArticles.map(a => a.id);

      const topSimilarity = knowledgeArticles[0]?.similarity || 0;
      const topMetadata = knowledgeArticles[0]?.metadata as Record<string, unknown> | null;

      // KB coverage boost
      if (topSimilarity > 0.85) {
        decision.confidence = Math.min(1.0, decision.confidence + 0.15);
      }
      // FAQ match boost
      if (topMetadata?.is_faq) {
        decision.confidence = Math.min(1.0, decision.confidence + 0.20);
      }
      // Troubleshooting match boost
      if (topMetadata?.is_troubleshooting) {
        decision.confidence = Math.min(1.0, decision.confidence + 0.10);
      }
    } else {
      // No KB match: cap confidence
      decision.confidence = Math.min(0.6, decision.confidence);
    }

    decision.processing_time_ms = Date.now() - startTime;
    decision.model_used = 'claude-sonnet-4-20250514';

    return decision;
  } catch (error) {
    console.error('Triage error:', error);

    // Fallback to human routing on error
    return {
      intent: 'unknown',
      confidence: 0,
      action: 'route_human',
      escalation_reason: 'AI triage failed, routing to human',
      processing_time_ms: Date.now() - startTime,
      model_used: 'error_fallback',
    };
  }
}

/**
 * Generate a response for a given intent
 */
export async function generateResponse(
  intent: string,
  ticket: Ticket,
  customer: Customer
): Promise<string> {
  try {
    // Search KB for relevant content to ground the response
    const kbResults = await searchKnowledgeHybrid({
      query: `${ticket.subject} ${intent}`,
      limit: 3,
      source: 'triage',
      ticketId: ticket.id,
      customerId: customer.id,
    });

    const kbContext = kbResults.length > 0
      ? `\n\nRelevant Knowledge Base Articles:\n${formatKBResultsForPrompt(kbResults, 1000)}`
      : '';

    const response = await withFallback(client =>
      client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: RESPONSE_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate a response for:
Intent: ${intent}
Customer name: ${customer.name || 'Customer'}
Ticket subject: ${ticket.subject}
${kbContext}

The response should be helpful, professional, and concise. If KB articles are provided, base your response on them and cite the source.`,
          },
        ],
      })
    );

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');
  } catch (error) {
    console.error('Response generation error:', error);
    return 'Thank you for your message. A support agent will review your request and respond shortly.';
  }
}

/**
 * Build context for triage prompt with enhanced KB content
 */
function buildTriageContext(
  input: TriageInput,
  knowledgeArticles: KBSearchResult[]
): string {
  let context = `## Customer Message
${input.message}

## Ticket Information
- Subject: ${input.ticket.subject}
- Priority: ${input.ticket.priority}
- Status: ${input.ticket.status}
- Channel: ${input.channel}

## Customer Information
- Name: ${input.customer.name || 'Unknown'}
- Email: ${input.customer.email || 'Unknown'}
- Preferred language: ${input.customer.preferred_language}
`;

  if (knowledgeArticles.length > 0) {
    context += `\n## Relevant Knowledge Base Articles\n`;
    context += formatKBResultsForPrompt(knowledgeArticles, 1500);
  } else {
    context += `\n## Knowledge Base: No matching articles found for this query.\n`;
  }

  return context;
}

/**
 * Parse Claude's triage response
 */
function parseTriageResponse(response: string): RoutingDecision {
  // Try to extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        intent: parsed.intent || 'unknown',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        action: parsed.action || 'route_human',
        suggested_response: parsed.suggested_response,
        escalation_reason: parsed.escalation_reason,
        knowledge_articles_used: parsed.kb_article_ids,
        processing_time_ms: 0,
        model_used: '',
      };
    } catch {
      // Fall through to text parsing
    }
  }

  // Text parsing fallback
  const lowerResponse = response.toLowerCase();

  let action: RoutingDecision['action'] = 'route_human';
  let confidence = 0.5;

  if (lowerResponse.includes('auto-respond') || lowerResponse.includes('auto_respond')) {
    action = 'auto_respond';
    confidence = 0.8;
  } else if (lowerResponse.includes('escalate')) {
    action = 'escalate';
    confidence = 0.9;
  }

  return {
    intent: 'parsed_from_text',
    confidence,
    action,
    suggested_response: undefined,
    processing_time_ms: 0,
    model_used: '',
  };
}
