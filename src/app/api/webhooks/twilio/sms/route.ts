/**
 * Twilio SMS Webhook
 * Receives inbound SMS messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { processIngest } from '@/lib/ai-router';
import { validateTwilioSignature, parseTwilioWebhook } from '@/lib/twilio/client';
import { createClient } from '@supabase/supabase-js';
import type { TwilioInboundSms } from '@/types/channels';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const params = parseTwilioWebhook(rawBody) as unknown as TwilioInboundSms;

    // Verify Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature');
      const url = request.url;

      if (!signature || !validateTwilioSignature(signature, url, params as unknown as Record<string, string>)) {
        console.warn('Invalid Twilio signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Log the inbound message
    const { data: logEntry } = await supabase
      .from('channel_inbound_logs')
      .insert({
        channel: 'sms',
        external_id: params.MessageSid || params.SmsSid,
        from_identifier: params.From,
        to_identifier: params.To,
        raw_payload: params as unknown as Record<string, unknown>,
        processed: false,
      })
      .select()
      .single();

    // Process through unified ingest
    const result = await processIngest({
      channel: 'sms',
      customer_identifier: params.From,
      message_content: params.Body,
      external_id: params.MessageSid || params.SmsSid,
      metadata: {
        twilio_sid: params.MessageSid,
        num_media: params.NumMedia,
        media_url: params.MediaUrl0,
        media_type: params.MediaContentType0,
      },
    });

    // Update log entry
    if (logEntry) {
      await supabase
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

    // Return TwiML response
    // If AI auto-responded, Twilio will send that via our sendSupportSms
    // So we return empty TwiML here
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Twilio SMS webhook error:', error);

    // Log error but still return valid TwiML to avoid Twilio retries
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new NextResponse(twiml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  }
}

// Twilio webhook verification (GET request)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Twilio SMS Webhook',
    description: 'Configure this URL in your Twilio phone number settings',
  });
}
