/**
 * SMS Send API
 * Send outbound SMS messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendSupportSms, isTwilioConfigured, normalizePhoneNumber } from '@/lib/twilio/client';
import { dispatchWebhook } from '@/lib/webhooks/service';

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

interface SendSmsRequest {
  ticket_id: string;
  to: string;
  content: string;
  sender_type?: 'agent' | 'ai';
}

export async function POST(request: NextRequest) {
  try {
    // Check if Twilio is configured
    if (!isTwilioConfigured()) {
      return NextResponse.json(
        { error: 'SMS is not configured. Please add Twilio credentials.' },
        { status: 503 }
      );
    }

    const body = await request.json() as SendSmsRequest;

    // Validate required fields
    if (!body.ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    if (!body.to) {
      return NextResponse.json({ error: 'to is required' }, { status: 400 });
    }

    if (!body.content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Normalize phone number
    const normalizedTo = normalizePhoneNumber(body.to);
    if (!normalizedTo) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await getSupabase()
      .from('tickets')
      .select('*, customers(*)')
      .eq('id', body.ticket_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create message record first (pending status)
    const { data: message, error: msgError } = await getSupabase()
      .from('messages')
      .insert({
        ticket_id: body.ticket_id,
        sender_type: body.sender_type || 'agent',
        content: body.content,
        source: 'sms',
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (msgError) {
      throw new Error(`Failed to create message: ${msgError.message}`);
    }

    // Send SMS
    const result = await sendSupportSms(normalizedTo, body.content, body.ticket_id);

    if (!result.success) {
      // Update message status to failed
      await getSupabase()
        .from('messages')
        .update({
          delivery_status: 'failed',
          metadata: { error: result.error },
        })
        .eq('id', message.id);

      return NextResponse.json(
        { error: result.error || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Update message with external_id and status
    await getSupabase()
      .from('messages')
      .update({
        external_id: result.messageSid,
        delivery_status: 'sent',
      })
      .eq('id', message.id);

    // Update ticket
    await getSupabase()
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', body.ticket_id);

    // Dispatch webhook
    await dispatchWebhook(
      body.sender_type === 'ai' ? 'message.created.ai' : 'message.created.agent',
      message.id,
      {
        message: {
          id: message.id,
          ticket_id: body.ticket_id,
          sender_type: body.sender_type || 'agent',
          content: body.content,
          source: 'sms',
          created_at: message.created_at,
        },
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
        },
        customer: {
          id: ticket.customers.id,
          name: ticket.customers.name,
          email: ticket.customers.email,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message_id: message.id,
      external_id: result.messageSid,
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Get SMS configuration status
export async function GET() {
  return NextResponse.json({
    configured: isTwilioConfigured(),
    phone_number: process.env.TWILIO_PHONE_NUMBER
      ? `+***${process.env.TWILIO_PHONE_NUMBER.slice(-4)}`
      : null,
  });
}
