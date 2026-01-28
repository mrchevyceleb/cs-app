/**
 * AI Triage
 * Uses Claude to analyze messages and determine routing
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ChannelType, RoutingDecision } from '@/types/channels';
import type { Ticket, Customer } from '@/types/database';
import { TRIAGE_PROMPT, RESPONSE_PROMPT } from './prompts';

const anthropic = new Anthropic();

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing required Supabase environment variables');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

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

  // Search knowledge base for relevant articles
  const knowledgeArticles = await searchKnowledgeBase(input.message);

  // Build context for Claude
  const context = buildTriageContext(input, knowledgeArticles);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: TRIAGE_PROMPT,
      messages: [
        {
          role: 'user',
          content: context,
        },
      ],
    });

    // Parse response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    const decision = parseTriageResponse(responseText);

    // Add knowledge articles used
    if (knowledgeArticles.length > 0) {
      decision.knowledge_articles_used = knowledgeArticles.map(a => a.id);
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
    const response = await anthropic.messages.create({
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

The response should be helpful, professional, and concise.`,
        },
      ],
    });

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
 * Search knowledge base for relevant articles
 */
async function searchKnowledgeBase(query: string): Promise<{ id: string; title: string; content: string }[]> {
  try {
    // First, generate embedding for the query
    const embeddingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-embedding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      }
    );

    if (!embeddingResponse.ok) {
      // Fallback to simple text search
      const { data } = await getSupabase()
        .from('knowledge_articles')
        .select('id, title, content')
        .textSearch('content', query)
        .limit(3);

      return data || [];
    }

    const { embedding } = await embeddingResponse.json();

    // Search with embedding
    const { data } = await getSupabase().rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
    });

    return data || [];
  } catch (error) {
    console.error('Knowledge search error:', error);
    return [];
  }
}

/**
 * Build context for triage prompt
 */
function buildTriageContext(
  input: TriageInput,
  knowledgeArticles: { id: string; title: string; content: string }[]
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
    for (const article of knowledgeArticles) {
      context += `\n### ${article.title}\n${article.content.slice(0, 500)}...\n`;
    }
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
