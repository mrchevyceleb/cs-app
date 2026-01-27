/**
 * AI Unified Router
 * Orchestrates AI triage, routing, and response generation across all channels
 */

import { createClient } from '@supabase/supabase-js';
import type { ChannelType, IngestRequest, IngestResponse, RoutingDecision } from '@/types/channels';
import type { Ticket, Message, Customer, ChannelConfig } from '@/types/database';
import { triageMessage, generateResponse } from './triage';
import { formatResponseForChannel } from './formatters';
import { findOrCreateCustomer } from '@/lib/channels/customer';
import { dispatchWebhook } from '@/lib/webhooks/service';
import { sendSupportSms } from '@/lib/twilio/client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const { data: existing } = await supabase
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
    const { data: recentTicket } = await supabase
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
      // Create new ticket
      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          customer_id: customer.id,
          subject: request.subject || generateSubject(request.message_content),
          status: 'open',
          priority: 'normal',
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

  // 3. Run AI triage
  const routingDecision = await triageMessage({
    message: request.message_content,
    ticket,
    customer,
    channel: request.channel,
  });

  // 4. Create customer message
  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'customer',
      content: request.message_content,
      source: request.channel,
      external_id: request.external_id,
      routing_decision: routingDecision,
      metadata: request.metadata || {},
    })
    .select()
    .single();

  if (msgError) {
    throw new Error(`Failed to create message: ${msgError.message}`);
  }

  // Update routing decision with timing
  routingDecision.processing_time_ms = Date.now() - startTime;

  // 5. Update ticket
  const ticketUpdate: Partial<Ticket> = {
    updated_at: new Date().toISOString(),
    ai_confidence: routingDecision.confidence,
  };

  if (routingDecision.action === 'escalate') {
    ticketUpdate.status = 'escalated';
    ticketUpdate.priority = 'high';
  }

  await supabase
    .from('tickets')
    .update(ticketUpdate)
    .eq('id', ticket.id);

  // 6. Dispatch webhooks
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

  // 7. Handle AI auto-response if applicable
  let aiResponse: IngestResponse['ai_response'] = undefined;

  const channelConfig = await getChannelConfig(request.channel);

  if (
    routingDecision.action === 'auto_respond' &&
    routingDecision.confidence >= (channelConfig?.ai_confidence_threshold || 0.85) &&
    channelConfig?.ai_auto_respond
  ) {
    // Generate and send AI response
    const responseContent = routingDecision.suggested_response ||
      await generateResponse(routingDecision.intent, ticket, customer);

    // Format for channel
    const formattedResponse = formatResponseForChannel(responseContent, request.channel);

    // Create AI message
    const { data: aiMessage } = await supabase
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
        },
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

    // Mark ticket as AI handled if auto-responded
    await supabase
      .from('tickets')
      .update({
        ai_handled: true,
        ai_confidence: routingDecision.confidence,
      })
      .eq('id', ticket.id);

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
  }

  // Log the inbound message
  await supabase
    .from('channel_inbound_logs')
    .insert({
      channel: request.channel,
      external_id: request.external_id,
      from_identifier: request.customer_identifier,
      raw_payload: request as unknown as Record<string, unknown>,
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
    case 'sms':
      return sendSupportSms(recipient, content, ticketId);

    case 'email':
      // Email sending is handled separately via Resend
      // This is a placeholder for the response tracking
      return { success: true };

    case 'slack':
      // Slack integration would go here
      console.log('Slack response not implemented yet');
      return { success: false, error: 'Slack not implemented' };

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

  const { data } = await supabase
    .from('channel_config')
    .select('*')
    .eq('channel', normalizedChannel)
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
