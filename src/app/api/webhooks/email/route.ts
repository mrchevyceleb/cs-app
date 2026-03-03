/**
 * Email Inbound Webhook
 * Receives inbound emails from SendGrid Inbound Parse
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { processInboundEmail } from '@/lib/email/inbound';
import { processEmailWithAI } from '@/lib/email/ai-loop';
import { notifyAgentsOfCustomerReply } from '@/lib/notifications/customer-reply';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { InboundEmail } from '@/types/channels';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

const WEBHOOK_SECRET = process.env.WEBHOOK_EMAIL_SECRET;

/**
 * Parse raw email headers string into a key-value map.
 * Each header line is "Key: Value", with continuation lines starting with whitespace.
 */
function parseHeaders(rawHeaders: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = rawHeaders.split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      // Continuation of previous header
      headers[currentKey] += ' ' + line.trim();
    } else {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        currentKey = line.slice(0, colonIndex).trim();
        headers[currentKey] = line.slice(colonIndex + 1).trim();
      }
    }
  }

  return headers;
}

export async function POST(request: NextRequest) {
  try {
    // SendGrid Inbound Parse: verify via URL secret query parameter
    if (WEBHOOK_SECRET) {
      const urlSecret = request.nextUrl.searchParams.get('secret');
      if (urlSecret !== WEBHOOK_SECRET) {
        console.warn('Invalid email webhook secret');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // SendGrid Inbound Parse sends multipart form data
    const formData = await request.formData();

    const from = formData.get('from') as string || '';
    const toRaw = formData.get('to') as string || '';
    const subject = formData.get('subject') as string || '';
    const text = (formData.get('text') as string) || undefined;
    const html = (formData.get('html') as string) || undefined;
    const rawHeaders = formData.get('headers') as string || '';
    const attachmentCount = parseInt(formData.get('attachments') as string || '0', 10);

    // Parse headers
    const headers = parseHeaders(rawHeaders);

    // Parse attachments
    const attachments: { filename: string; content_type: string; content: string }[] = [];
    for (let i = 1; i <= attachmentCount; i++) {
      const file = formData.get(`attachment${i}`) as File | null;
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        attachments.push({
          filename: file.name,
          content_type: file.type,
          content: buffer.toString('base64'),
        });
      }
    }

    // Parse "to" addresses (can be comma-separated)
    const to = toRaw.split(',').map(addr => {
      const match = addr.match(/<([^>]+)>/) || addr.match(/([^\s<]+@[^\s>]+)/);
      return match ? match[1].trim() : addr.trim();
    }).filter(Boolean);

    const email: InboundEmail = {
      from,
      to,
      subject,
      text,
      html,
      headers,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Validate required fields
    if (!email.from || !email.to.length || (!email.text && !email.html)) {
      return NextResponse.json(
        { error: 'Invalid email format: missing from, to, or body' },
        { status: 400 }
      );
    }

    const messageId = headers['Message-ID'] || headers['message-id'] || undefined;

    // Deduplication: if we've already processed this Message-ID, return success
    // without re-processing. Prevents duplicate messages on SendGrid retries.
    if (messageId) {
      const { data: existing } = await getSupabase()
        .from('channel_inbound_logs')
        .select('id, ticket_id, message_id')
        .eq('external_id', messageId)
        .eq('processed', true)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log(`[Email Webhook] Duplicate Message-ID detected, skipping: ${messageId}`);
        return NextResponse.json({
          success: true,
          ticket_id: existing.ticket_id,
          message_id: existing.message_id,
          is_new_ticket: false,
          deduplicated: true,
        });
      }
    }

    // Log the inbound email
    const { data: logEntry } = await getSupabase()
      .from('channel_inbound_logs')
      .insert({
        channel: 'email',
        external_id: messageId,
        from_identifier: from,
        to_identifier: to[0],
        raw_payload: Object.fromEntries(formData.entries()) as Record<string, string>,
        processed: false,
      })
      .select()
      .single();

    // Process the email
    const result = await processInboundEmail(email);

    // Update log entry
    if (logEntry) {
      await getSupabase()
        .from('channel_inbound_logs')
        .update({
          processed: true,
          ticket_id: result.ticket_id,
          message_id: result.message_id,
          customer_id: result.customer_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', logEntry.id);
    }

    // Extract sender info for AI processing
    const senderAddress = (() => {
      const match = from.match(/<([^>]+)>/) || from.match(/([^\s<]+@[^\s>]+)/);
      return match ? match[1] : from;
    })();
    const senderName = (() => {
      const match = from.match(/^"?([^"<]+)"?\s*</);
      return match ? match[1].trim() : null;
    })();
    // Use plain text body, or strip HTML if only HTML is available
    const emailContent = (text || '').trim() || (() => {
      if (!html) return '';
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    })();

    // Trigger AI processing and agent notifications in the background (fire-and-forget)
    // Webhook returns 200 immediately to SendGrid while these run
    if (emailContent) {
      after(async () => {
        // Notify agents of the customer reply (bell + email alert)
        try {
          // Fetch ticket subject for the notification
          const { data: ticketData } = await getSupabase()
            .from('tickets')
            .select('subject')
            .eq('id', result.ticket_id)
            .single()

          await notifyAgentsOfCustomerReply({
            ticketId: result.ticket_id,
            ticketSubject: ticketData?.subject || subject || 'Support request',
            customerName: senderName,
            customerEmail: senderAddress,
            messagePreview: emailContent,
            channel: 'email',
          })
        } catch (err) {
          console.error('[Email Notify] Background notification error:', err)
        }

        // AI auto-reply
        processEmailWithAI(
          result.ticket_id,
          emailContent,
          result.customer_id,
          senderAddress,
          senderName
        ).catch(err => console.error('[Email AI] Background processing error:', err))
      });
    }

    return NextResponse.json({
      success: true,
      ticket_id: result.ticket_id,
      message_id: result.message_id,
      is_new_ticket: result.is_new_ticket,
    });
  } catch (error) {
    console.error('Email webhook error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Webhook verification endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Email Inbound Webhook',
    description: 'Configure this URL in SendGrid Inbound Parse with ?secret=WEBHOOK_EMAIL_SECRET',
    inbound_address: process.env.INBOUND_EMAIL_ADDRESS || 'Not configured',
  });
}
