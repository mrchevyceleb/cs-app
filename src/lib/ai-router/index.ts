/**
 * AI Unified Router
 * Orchestrates AI triage, routing, and response generation across all channels
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { ChannelType, IngestRequest, IngestResponse, RoutingDecision } from '@/types/channels';
import type { Ticket, Message, Customer, ChannelConfig } from '@/types/database';
import { triageMessage, generateResponse } from './triage';
import { formatResponseForChannel } from './formatters';
import { findOrCreateCustomer } from '@/lib/channels/customer';
import { dispatchWebhook } from '@/lib/webhooks/service';
import { searchKnowledgeHybrid } from '@/lib/knowledge/search';
import { getAgentConfig } from '@/lib/ai-agent/config';
import { agenticSolve } from '@/lib/ai-agent/engine';
import { classifyTicketPriority } from '@/lib/ai-agent/classify';
import type { AgentResult } from '@/lib/ai-agent/types';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing required Supabase environment variables');
    }

    _supabase = createClient<Database>(url, key);
  }
  return _supabase;
}

/**
 * Process an inbound message from any channel
 */
export async function processIngest(request: IngestRequest): Promise<IngestResponse> {
  const startTime = Date.now();

  // 1. Find or create customer
  const { customer, created: isNewCustomer } = await findOrCreateCustomer(
    request.customer_identifier,
    request.channel,
    request.customer_name
  );

  // Dispatch customer.created webhook if new
  if (isNewCustomer) {
    await dispatchWebhook('customer.created', customer.id, {
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
        preferred_channel: customer.preferred_channel,
        created_at: customer.created_at,
      },
    });
  }

  // 2. Find or create ticket
  let ticket: Ticket;
  let isNewTicket = false;

  if (request.ticket_id) {
    // Add to existing ticket
    const { data: existing } = await getSupabase()
      .from('tickets')
      .select('*')
      .eq('id', request.ticket_id)
      .single();

    if (!existing) {
      throw new Error(`Ticket ${request.ticket_id} not found`);
    }

    ticket = existing;
  } else {
    // Try to find recent open ticket
    const { data: recentTicket } = await getSupabase()
      .from('tickets')
      .select('*')
      .eq('customer_id', customer.id)
      .in('status', ['open', 'pending'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (recentTicket) {
      ticket = recentTicket;
    } else {
      // Classify urgency from message content
      const subject = request.subject || generateSubject(request.message_content);
      const priority = await classifyTicketPriority(request.message_content, subject);

      // Create new ticket
      const { data: newTicket, error } = await getSupabase()
        .from('tickets')
        .insert({
          customer_id: customer.id,
          subject,
          status: 'open',
          priority,
          source_channel: request.channel,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create ticket: ${error.message}`);
      }

      ticket = newTicket;
      isNewTicket = true;
    }
  }

  // 3. Get channel config and agent config
  const channelConfig = await getChannelConfig(request.channel);
  const agentConfig = getAgentConfig();
  const useAgentMode = agentConfig.enabled;

  // 4. Run AI triage (legacy) or agentic solve
  let routingDecision: RoutingDecision;
  let agentResult: AgentResult | null = null;

  if (useAgentMode) {
    // --- Agentic mode: Claude tool-use loop ---
    agentResult = await agenticSolve({
      message: request.message_content,
      ticket,
      customer,
      channel: request.channel,
    });

    // Convert AgentResult → RoutingDecision for backward compatibility
    routingDecision = {
      intent: agentResult.type === 'escalation' ? 'escalation_requested' : 'agent_resolved',
      confidence: agentResult.confidence,
      action: agentResult.type === 'escalation' ? 'escalate' : 'auto_respond',
      suggested_response: agentResult.type === 'response' ? agentResult.content : undefined,
      knowledge_articles_used: agentResult.kbArticleIds,
      escalation_reason: agentResult.escalationReason,
      processing_time_ms: agentResult.durationMs,
      model_used: agentConfig.model,
    };
  } else {
    // --- Legacy triage mode (fallback) ---
    routingDecision = await triageMessage({
      message: request.message_content,
      ticket,
      customer,
      channel: request.channel,
    });
  }

  // 5. Create customer message
  const { data: message, error: msgError } = await getSupabase()
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'customer',
      content: request.message_content,
      source: request.channel,
      external_id: request.external_id,
      routing_decision: routingDecision as any,
      metadata: (request.metadata || {}) as any,
    })
    .select()
    .single();

  if (msgError) {
    throw new Error(`Failed to create message: ${msgError.message}`);
  }

  // Update routing decision with timing
  if (!useAgentMode) {
    routingDecision.processing_time_ms = Date.now() - startTime;
  }

  // 6. Update ticket
  const ticketUpdate: Partial<Ticket> = {
    updated_at: new Date().toISOString(),
    ai_confidence: routingDecision.confidence,
  };

  if (routingDecision.action === 'escalate') {
    ticketUpdate.status = 'escalated';
    ticketUpdate.priority = 'high';
    (ticketUpdate as any).queue_type = 'human';
  }

  await getSupabase()
    .from('tickets')
    .update(ticketUpdate)
    .eq('id', ticket.id);

  // 7. Dispatch webhooks
  if (isNewTicket) {
    await dispatchWebhook('ticket.created', ticket.id, {
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        tags: ticket.tags,
        source_channel: ticket.source_channel,
        created_at: ticket.created_at,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone_number,
      },
    });
  }

  await dispatchWebhook('message.created.customer', message.id, {
    message: {
      id: message.id,
      ticket_id: ticket.id,
      sender_type: 'customer',
      content: message.content,
      source: message.source,
      created_at: message.created_at,
    },
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
  });

  // 8. Handle AI auto-response
  let aiResponse: IngestResponse['ai_response'] = undefined;

  if (useAgentMode && agentResult && agentResult.type === 'response') {
    // --- Agentic auto-response ---
    const formattedResponse = formatResponseForChannel(agentResult.content, request.channel);

    // Create AI message
    const { data: aiMessage } = await getSupabase()
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'ai',
        content: formattedResponse,
        source: request.channel,
        confidence: agentResult.confidence,
        metadata: {
          routing_decision: routingDecision,
          auto_responded: true,
          agent_mode: true,
          kb_article_ids: agentResult.kbArticleIds,
          web_searches: agentResult.webSearchCount,
          total_tool_calls: agentResult.totalToolCalls,
        } as any,
      })
      .select()
      .single();

    // Send response via channel
    const sendResult = await sendChannelResponse(
      request.channel,
      request.customer_identifier,
      formattedResponse,
      ticket.id
    );

    aiResponse = {
      content: formattedResponse,
      sent: sendResult.success,
      channel: request.channel,
    };

    // Mark ticket as AI handled
    await getSupabase()
      .from('tickets')
      .update({
        ai_handled: true,
        ai_confidence: agentResult.confidence,
      })
      .eq('id', ticket.id);

    // Log agent session
    const estimatedCost = estimateAgentCost(agentResult.inputTokens, agentResult.outputTokens);
    const { data: sessionData } = await getSupabase()
      .from('ai_agent_sessions')
      .insert({
        ticket_id: ticket.id,
        message_id: aiMessage?.id || null,
        channel: request.channel,
        result_type: agentResult.type,
        total_tool_calls: agentResult.totalToolCalls,
        tool_calls_detail: agentResult.toolCallsDetail as any,
        kb_articles_used: agentResult.kbArticleIds,
        web_searches_performed: agentResult.webSearchCount,
        input_tokens: agentResult.inputTokens,
        output_tokens: agentResult.outputTokens,
        estimated_cost_usd: estimatedCost,
        total_duration_ms: agentResult.durationMs,
      } as any)
      .select('id')
      .single();

    if (sessionData) {
      routingDecision.agent_session_id = sessionData.id;
    }

    // Dispatch AI message webhook
    if (aiMessage) {
      await dispatchWebhook('message.created.ai', aiMessage.id, {
        message: {
          id: aiMessage.id,
          ticket_id: ticket.id,
          sender_type: 'ai',
          content: aiMessage.content,
          source: aiMessage.source,
          created_at: aiMessage.created_at,
        },
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      });
    }
  } else if (useAgentMode && agentResult && agentResult.type === 'escalation') {
    // --- Agent escalation: log session ---
    await getSupabase()
      .from('ai_agent_sessions')
      .insert({
        ticket_id: ticket.id,
        message_id: message.id,
        channel: request.channel,
        result_type: 'escalation',
        total_tool_calls: agentResult.totalToolCalls,
        tool_calls_detail: agentResult.toolCallsDetail as any,
        kb_articles_used: agentResult.kbArticleIds,
        web_searches_performed: agentResult.webSearchCount,
        input_tokens: agentResult.inputTokens,
        output_tokens: agentResult.outputTokens,
        estimated_cost_usd: estimateAgentCost(agentResult.inputTokens, agentResult.outputTokens),
        total_duration_ms: agentResult.durationMs,
        escalation_reason: agentResult.escalationReason,
        escalation_summary: agentResult.escalationSummary,
      } as any);
  } else if (
    !useAgentMode &&
    routingDecision.action === 'auto_respond' &&
    routingDecision.confidence >= (channelConfig?.ai_confidence_threshold || 0.85) &&
    channelConfig?.ai_auto_respond
  ) {
    // --- Legacy auto-response (unchanged) ---
    let kbArticleSource: string | null = null;
    let kbArticleIds: string[] = [];
    let responseContent = routingDecision.suggested_response ||
      await generateResponse(routingDecision.intent, ticket, customer);

    try {
      const kbResults = await searchKnowledgeHybrid({
        query: request.message_content,
        limit: 3,
        source: 'auto_response',
        ticketId: ticket.id,
      });

      if (kbResults.length > 0) {
        kbArticleIds = kbResults.map(r => r.id);
        kbArticleSource = kbResults[0].title;

        const topResult = kbResults[0];
        const isFaqOrTroubleshooting = topResult.metadata?.is_faq || topResult.metadata?.is_troubleshooting;
        if (topResult.similarity > 0.92 && isFaqOrTroubleshooting) {
          responseContent = topResult.content;
        }
      }
    } catch {
      // Non-critical
    }

    if (kbArticleSource) {
      responseContent = responseContent.trimEnd() + `\n\n[Source: ${kbArticleSource}]`;
    }

    const formattedResponse = formatResponseForChannel(responseContent, request.channel);

    const { data: aiMessage } = await getSupabase()
      .from('messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'ai',
        content: formattedResponse,
        source: request.channel,
        confidence: routingDecision.confidence,
        metadata: {
          routing_decision: routingDecision,
          auto_responded: true,
          kb_article_ids: kbArticleIds,
          kb_article_source: kbArticleSource,
        } as any,
      })
      .select()
      .single();

    const sendResult = await sendChannelResponse(
      request.channel,
      request.customer_identifier,
      formattedResponse,
      ticket.id
    );

    aiResponse = {
      content: formattedResponse,
      sent: sendResult.success,
      channel: request.channel,
    };

    await getSupabase()
      .from('tickets')
      .update({
        ai_handled: true,
        ai_confidence: routingDecision.confidence,
      })
      .eq('id', ticket.id);

    if (aiMessage) {
      await dispatchWebhook('message.created.ai', aiMessage.id, {
        message: {
          id: aiMessage.id,
          ticket_id: ticket.id,
          sender_type: 'ai',
          content: aiMessage.content,
          source: aiMessage.source,
          created_at: aiMessage.created_at,
        },
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
        },
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
        },
      });
    }
  }

  // Log the inbound message
  await getSupabase()
    .from('channel_inbound_logs')
    .insert({
      channel: request.channel,
      external_id: request.external_id,
      from_identifier: request.customer_identifier,
      raw_payload: request as any,
      processed: true,
      ticket_id: ticket.id,
      message_id: message.id,
      customer_id: customer.id,
      processed_at: new Date().toISOString(),
    });

  return {
    success: true,
    ticket_id: ticket.id,
    message_id: message.id,
    customer_id: customer.id,
    is_new_ticket: isNewTicket,
    routing_decision: routingDecision,
    ai_response: aiResponse,
  };
}

/**
 * Send a response via the appropriate channel
 */
export async function sendChannelResponse(
  channel: ChannelType,
  recipient: string,
  content: string,
  ticketId: string
): Promise<{ success: boolean; external_id?: string; error?: string }> {
  switch (channel) {
    case 'email':
      // Email sending is handled separately via the email service
      // This is a placeholder for the response tracking
      return { success: true };

    case 'widget':
    case 'portal':
    case 'dashboard':
      // These channels use real-time subscriptions, no push needed
      return { success: true };

    default:
      return { success: false, error: `Unknown channel: ${channel}` };
  }
}

/**
 * Get channel configuration
 */
async function getChannelConfig(channel: ChannelType): Promise<ChannelConfig | null> {
  const normalizedChannel = channel === 'widget' || channel === 'portal' ? 'widget' : channel;

  const { data } = await getSupabase()
    .from('channel_config')
    .select('*')
    .eq('channel', normalizedChannel as any)
    .single();

  return data;
}

/**
 * Generate a subject from message content
 */
function generateSubject(content: string): string {
  // Take first sentence or first 50 characters
  const firstSentence = content.match(/^[^.!?\n]+[.!?]?/)?.[0] || content;
  const subject = firstSentence.slice(0, 50);

  return subject.length < firstSentence.length ? subject + '...' : subject;
}

/**
 * Estimate cost in USD for an agent session
 * Based on Claude Sonnet pricing: $3/M input, $15/M output tokens
 */
function estimateAgentCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
