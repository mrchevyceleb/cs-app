/**
 * Email Inbound Webhook
 * Receives inbound emails from Resend or other email providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { processInboundEmail } from '@/lib/email/inbound';
import { processIngest } from '@/lib/ai-router';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ResendInboundEmail } from '@/types/channels';
import crypto from 'crypto';

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

const WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature') ||
        request.headers.get('svix-signature');

      if (signature) {
        const bodyString = JSON.stringify(body);
        const expectedSignature = crypto
          .createHmac('sha256', WEBHOOK_SECRET)
          .update(bodyString)
          .digest('hex');

        // Check signature (handle multiple formats)
        const isValid = signature.includes(expectedSignature) ||
          signature === `sha256=${expectedSignature}`;

        if (!isValid) {
          console.warn('Invalid email webhook signature');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }
      }
    }

    // Handle Resend inbound webhook format
    const email = body as ResendInboundEmail;

    // Validate required fields
    if (!email.from || !email.to || (!email.text && !email.html)) {
      return NextResponse.json(
        { error: 'Invalid email format: missing from, to, or body' },
        { status: 400 }
      );
    }

    // Log the inbound email
    const { data: logEntry } = await getSupabase()
      .from('channel_inbound_logs')
      .insert({
        channel: 'email',
        external_id: email.headers['message-id'] || email.headers['Message-ID'],
        from_identifier: email.from,
        to_identifier: email.to[0],
        raw_payload: body,
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

    // Run AI triage on the message (email inbound handler already created the message,
    // but we want to run triage for potential auto-response)
    // Only do this for new tickets
    if (result.is_new_ticket) {
      // The ingest processor will handle AI routing
      // We already processed the email, so just return success
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
    description: 'Configure this URL in your email provider (Resend, SendGrid, etc.)',
    expected_format: 'Resend inbound webhook format',
    inbound_address: process.env.INBOUND_EMAIL_ADDRESS || 'Not configured',
  });
}
