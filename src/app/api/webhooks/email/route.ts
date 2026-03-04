/**
 * Email Inbound Webhook
 * Receives inbound emails from SendGrid Inbound Parse
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { processInboundEmail } from '@/lib/email/inbound';
import { processEmailWithAI } from '@/lib/email/ai-loop';
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

    // Atomic deduplication: attempt to insert a log row for this Message-ID.
    // A unique index on (channel, external_id) WHERE external_id IS NOT NULL
    // means concurrent retries will conflict. The winner proceeds; losers get
    // the existing row back via onConflict + select and return early.
    let logEntry: { id: string; ticket_id: string | null; message_id: string | null; processed: boolean } | null = null;

    if (messageId) {
      // Try to claim this Message-ID atomically
      const { data: inserted, error: insertErr } = await getSupabase()
        .from('channel_inbound_logs')
        .upsert({
          channel: 'email',
          external_id: messageId,
          from_identifier: from,
          to_identifier: to[0],
          raw_payload: Object.fromEntries(formData.entries()) as Record<string, string>,
          processed: false,
        }, {
          onConflict: 'channel,external_id',
          ignoreDuplicates: true,
        })
        .select('id, ticket_id, message_id, processed')
        .single();

      if (insertErr) {
        // ignoreDuplicates returns no rows when the row already exists.
        // Query for the existing row to check if it was already processed.
        const { data: existing } = await getSupabase()
          .from('channel_inbound_logs')
          .select('id, ticket_id, message_id, processed')
          .eq('channel', 'email')
          .eq('external_id', messageId)
          .maybeSingle();

        if (existing) {
          console.log(`[Email Webhook] Duplicate Message-ID detected (processed=${existing.processed}), skipping: ${messageId}`);
          return NextResponse.json({
            success: true,
            ticket_id: existing.ticket_id,
            message_id: existing.message_id,
            is_new_ticket: false,
            deduplicated: true,
          });
        }
        // If we can't find it either, fall through and process without a log entry
        console.warn(`[Email Webhook] Log insert failed and no existing row found for: ${messageId}`, insertErr);
      } else {
        logEntry = inserted;
      }
    } else {
      // No Message-ID: insert log entry without dedup (no unique constraint applies)
      const { data: inserted } = await getSupabase()
        .from('channel_inbound_logs')
        .insert({
          channel: 'email',
          external_id: null,
          from_identifier: from,
          to_identifier: to[0],
          raw_payload: Object.fromEntries(formData.entries()) as Record<string, string>,
          processed: false,
        })
        .select('id, ticket_id, message_id, processed')
        .single();
      logEntry = inserted;
    }

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

    // Trigger AI processing in the background (fire-and-forget)
    // Webhook returns 200 immediately to SendGrid while AI runs
    // NOTE: Agent notifications are NOT sent here — they fire only on escalation
    // to human queue (see ai-loop.ts), keeping agents undisturbed while AI handles tickets.
    if (emailContent) {
      after(async () => {
        try {
          await processEmailWithAI(
            result.ticket_id,
            emailContent,
            result.customer_id,
            senderAddress,
            senderName
          )
        } catch (err) {
          console.error('[Email AI] Background processing error:', err)
        }
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
