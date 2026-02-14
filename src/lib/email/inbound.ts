/**
 * Email Inbound Processing
 * Handle inbound emails and convert them to tickets/messages
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { InboundEmail } from '@/types/channels';
import type { Ticket, Message, EmailThread } from '@/types/database';
import { findOrCreateCustomerByEmail } from '@/lib/channels/customer';
import { classifyTicketPriority } from '@/lib/ai-agent/classify';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

interface ProcessEmailResult {
  ticket_id: string;
  message_id: string;
  customer_id: string;
  is_new_ticket: boolean;
}

/**
 * Process an inbound email
 */
export async function processInboundEmail(
  email: InboundEmail
): Promise<ProcessEmailResult> {
  // Extract sender info
  const fromAddress = parseEmailAddress(email.from);
  const fromName = parseEmailName(email.from);

  // Find or create customer
  const { customer, created: isNewCustomer } = await findOrCreateCustomerByEmail(
    fromAddress,
    fromName
  );

  // Try to find existing ticket by email thread
  let ticket: Ticket | null = null;
  let isNewTicket = true;

  // Check email headers for threading
  const messageId = email.headers['message-id'] || email.headers['Message-ID'];
  const inReplyTo = email.headers['in-reply-to'] || email.headers['In-Reply-To'];
  const references = email.headers['references'] || email.headers['References'];

  if (inReplyTo || references) {
    // Try to find existing thread
    ticket = await findTicketByEmailThread(inReplyTo, references);
  }

  // Also check for ticket ID in subject line (e.g., "Re: [Ticket #abc123]")
  if (!ticket) {
    const ticketIdMatch = email.subject.match(/\[Ticket #([a-f0-9-]+)\]/i);
    if (ticketIdMatch) {
      const { data } = await getSupabase()
        .from('tickets')
        .select('*')
        .eq('id', ticketIdMatch[1])
        .single();
      ticket = data;
    }
  }

  // Also check for recent open tickets from this customer
  if (!ticket) {
    const { data: recentTicket } = await getSupabase()
      .from('tickets')
      .select('*')
      .eq('customer_id', customer.id)
      .in('status', ['open', 'pending'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Only match if subject is similar
    if (recentTicket && isSubjectRelated(email.subject, recentTicket.subject)) {
      ticket = recentTicket;
    }
  }

  if (ticket) {
    isNewTicket = false;
  } else {
    // Classify urgency from email content
    const emailContent = email.text || stripHtml(email.html || '') || '';
    const priority = await classifyTicketPriority(emailContent, email.subject);

    // Create new ticket
    const { data: newTicket, error } = await getSupabase()
      .from('tickets')
      .insert({
        customer_id: customer.id,
        subject: cleanSubject(email.subject),
        status: 'open',
        priority,
        source_channel: 'email',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    ticket = newTicket;
  }

  // Ensure we have a ticket at this point
  if (!ticket) {
    throw new Error('Failed to create or find ticket');
  }

  // Store email thread info
  if (messageId) {
    await getSupabase()
      .from('email_threads')
      .upsert({
        ticket_id: ticket.id,
        message_id_header: messageId,
        in_reply_to: inReplyTo || null,
        references_header: references || null,
        subject: email.subject,
        from_address: fromAddress,
        to_address: email.to[0],
      }, {
        onConflict: 'message_id_header',
      });
  }

  // Create message
  const content = email.text || stripHtml(email.html || '') || '(No content)';

  const { data: message, error: msgError } = await getSupabase()
    .from('messages')
    .insert({
      ticket_id: ticket.id,
      sender_type: 'customer',
      content: content,
      source: 'email',
      external_id: messageId,
      metadata: {
        email_subject: email.subject,
        email_from: email.from,
        email_to: email.to,
        has_attachments: (email.attachments?.length || 0) > 0,
      },
    })
    .select()
    .single();

  if (msgError) {
    throw new Error(`Failed to create message: ${msgError.message}`);
  }

  // Update ticket updated_at
  await getSupabase()
    .from('tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticket.id);

  // Handle attachments if present
  if (email.attachments && email.attachments.length > 0) {
    for (const attachment of email.attachments) {
      await processEmailAttachment(message.id, attachment);
    }
  }

  // Log inbound email
  await getSupabase()
    .from('channel_inbound_logs')
    .insert({
      channel: 'email',
      external_id: messageId,
      from_identifier: fromAddress,
      to_identifier: email.to[0],
      raw_payload: email as unknown as Record<string, unknown>,
      processed: true,
      ticket_id: ticket.id,
      message_id: message.id,
      customer_id: customer.id,
      processed_at: new Date().toISOString(),
    });

  return {
    ticket_id: ticket.id,
    message_id: message.id,
    customer_id: customer.id,
    is_new_ticket: isNewTicket,
  };
}

/**
 * Find ticket by email thread headers
 */
async function findTicketByEmailThread(
  inReplyTo: string | null,
  references: string | null
): Promise<Ticket | null> {
  // Check In-Reply-To header first
  if (inReplyTo) {
    const { data: thread } = await getSupabase()
      .from('email_threads')
      .select('ticket_id')
      .eq('message_id_header', inReplyTo)
      .single();

    if (thread) {
      const { data: ticket } = await getSupabase()
        .from('tickets')
        .select('*')
        .eq('id', thread.ticket_id)
        .single();

      return ticket;
    }
  }

  // Check References header (contains all previous message IDs)
  if (references) {
    const refIds = references.split(/\s+/).map(r => r.trim()).filter(Boolean);

    for (const refId of refIds) {
      const { data: thread } = await getSupabase()
        .from('email_threads')
        .select('ticket_id')
        .eq('message_id_header', refId)
        .single();

      if (thread) {
        const { data: ticket } = await getSupabase()
          .from('tickets')
          .select('*')
          .eq('id', thread.ticket_id)
          .single();

        return ticket;
      }
    }
  }

  return null;
}

/**
 * Process email attachment
 */
async function processEmailAttachment(
  messageId: string,
  attachment: { filename: string; content_type: string; content: string }
): Promise<void> {
  // Decode base64 content
  const buffer = Buffer.from(attachment.content, 'base64');

  // Generate storage path
  const filename = `${Date.now()}-${attachment.filename}`;
  const storagePath = `attachments/${messageId}/${filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await getSupabase().storage
    .from('attachments')
    .upload(storagePath, buffer, {
      contentType: attachment.content_type,
    });

  if (uploadError) {
    console.error('Failed to upload attachment:', uploadError);
    return;
  }

  // Get public URL
  const { data: { publicUrl } } = getSupabase().storage
    .from('attachments')
    .getPublicUrl(storagePath);

  // Create attachment record
  await getSupabase()
    .from('message_attachments')
    .insert({
      message_id: messageId,
      file_name: attachment.filename,
      file_type: attachment.content_type,
      file_size: buffer.length,
      storage_path: storagePath,
      public_url: publicUrl,
    });
}

/**
 * Generate email Message-ID for outbound emails
 */
export function generateMessageId(ticketId: string, messageId: string): string {
  const domain = process.env.INBOUND_EMAIL_ADDRESS?.split('@')[1] || 'support.local';
  return `<${ticketId}.${messageId}@${domain}>`;
}

/**
 * Get References header for threading
 */
export async function getEmailReferences(ticketId: string): Promise<string | null> {
  const { data: threads } = await getSupabase()
    .from('email_threads')
    .select('message_id_header')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!threads || threads.length === 0) return null;

  return threads.map(t => t.message_id_header).join(' ');
}

// Helper functions

function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s<]+@[^\s>]+)/);
  return match ? match[1].toLowerCase() : from.toLowerCase();
}

function parseEmailName(from: string): string | null {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : null;
}

function cleanSubject(subject: string): string {
  // Remove Re:, Fwd:, etc.
  return subject.replace(/^(?:Re|Fwd|FW):\s*/gi, '').trim();
}

function isSubjectRelated(newSubject: string, existingSubject: string): boolean {
  const cleanNew = cleanSubject(newSubject).toLowerCase();
  const cleanExisting = cleanSubject(existingSubject).toLowerCase();

  return cleanNew === cleanExisting ||
    cleanNew.includes(cleanExisting) ||
    cleanExisting.includes(cleanNew);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
