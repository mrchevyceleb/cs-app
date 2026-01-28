/**
 * Twilio SMS Status Webhook
 * Receives delivery status updates for sent messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseTwilioWebhook, twilioStatusToDeliveryStatus, validateTwilioSignature } from '@/lib/twilio/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

interface TwilioStatusCallback {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const params = parseTwilioWebhook(rawBody) as unknown as TwilioStatusCallback;

    // Verify Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = request.headers.get('x-twilio-signature');
      const url = request.url;

      if (!signature || !validateTwilioSignature(signature, url, params as unknown as Record<string, string>)) {
        console.warn('Invalid Twilio status signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Get ticket_id from query params if provided
    const ticketId = request.nextUrl.searchParams.get('ticket_id');

    // Map Twilio status to our delivery status
    const deliveryStatus = twilioStatusToDeliveryStatus(params.MessageStatus);

    // Find and update the message by external_id (Twilio MessageSid)
    const { data: message, error: findError } = await getSupabase()
      .from('messages')
      .select('id, ticket_id')
      .eq('external_id', params.MessageSid)
      .single();

    if (!message && !findError) {
      // Try finding by ticket_id if provided
      if (ticketId) {
        const { data: recentMessage } = await getSupabase()
          .from('messages')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('source', 'sms')
          .eq('sender_type', 'agent')
          .is('external_id', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recentMessage) {
          // Update this message with the external_id
          await getSupabase()
            .from('messages')
            .update({
              external_id: params.MessageSid,
              delivery_status: deliveryStatus,
              delivered_at: deliveryStatus === 'delivered' ? new Date().toISOString() : null,
            })
            .eq('id', recentMessage.id);

          return NextResponse.json({ success: true });
        }
      }

      console.log(`Message not found for MessageSid: ${params.MessageSid}`);
      return NextResponse.json({ success: true });
    }

    if (message) {
      // Update delivery status
      const updateData: Record<string, unknown> = {
        delivery_status: deliveryStatus,
      };

      if (deliveryStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      if (params.ErrorCode || params.ErrorMessage) {
        updateData.metadata = getSupabase().rpc('jsonb_set', {
          target: 'metadata',
          path: ['delivery_error'],
          value: {
            code: params.ErrorCode,
            message: params.ErrorMessage,
          },
        });
      }

      await getSupabase()
        .from('messages')
        .update(updateData)
        .eq('id', message.id);

      // If failed, log for debugging
      if (deliveryStatus === 'failed') {
        console.error('SMS delivery failed:', {
          messageSid: params.MessageSid,
          errorCode: params.ErrorCode,
          errorMessage: params.ErrorMessage,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Twilio status webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Twilio SMS Status Webhook',
    description: 'Receives delivery status updates for sent SMS messages',
  });
}
