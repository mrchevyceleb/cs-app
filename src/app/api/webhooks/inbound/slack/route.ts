/**
 * Slack Inbound Webhook
 * Receives messages from Slack
 */

import { NextRequest, NextResponse } from 'next/server';
import { processIngest } from '@/lib/ai-router';
import { verifySlackSignature } from '@/lib/webhooks/signatures';
import { createClient } from '@supabase/supabase-js';
import type { SlackEvent } from '@/types/channels';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch {
      // URL-encoded body
      body = Object.fromEntries(new URLSearchParams(rawBody));
    }

    // Verify Slack signature
    if (SLACK_SIGNING_SECRET) {
      const timestamp = request.headers.get('x-slack-request-timestamp');
      const signature = request.headers.get('x-slack-signature');

      if (!timestamp || !signature) {
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 403 });
      }

      if (!verifySlackSignature(rawBody, timestamp, signature, SLACK_SIGNING_SECRET)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    // Handle Slack URL verification challenge
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event as SlackEvent['event'];

      // Ignore bot messages to prevent loops
      if (event.user === body.api_app_id || (event as { bot_id?: string }).bot_id) {
        return NextResponse.json({ ok: true });
      }

      // Only process direct messages or mentions
      // (In production, you'd want to check if this is a support channel)
      if (event.type !== 'message' && event.type !== 'app_mention') {
        return NextResponse.json({ ok: true });
      }

      // Get user info for customer name
      let userName: string | null = null;
      let userEmail: string | null = null;

      if (SLACK_BOT_TOKEN && event.user) {
        const userResponse = await fetch(
          `https://slack.com/api/users.info?user=${event.user}`,
          {
            headers: {
              'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
            },
          }
        );

        const userData = await userResponse.json();
        if (userData.ok && userData.user) {
          userName = userData.user.real_name || userData.user.name;
          userEmail = userData.user.profile?.email;
        }
      }

      // Log inbound message
      const { data: logEntry } = await supabase
        .from('channel_inbound_logs')
        .insert({
          channel: 'slack',
          external_id: event.ts,
          from_identifier: userEmail || event.user,
          to_identifier: event.channel,
          raw_payload: body,
          processed: false,
        })
        .select()
        .single();

      // Process through unified ingest
      const existingTicketId = event.thread_ts ? await findTicketBySlackThread(event.thread_ts) : undefined;
      const result = await processIngest({
        channel: 'slack',
        customer_identifier: userEmail || event.user,
        customer_name: userName || undefined,
        message_content: event.text,
        external_id: event.ts,
        ticket_id: existingTicketId,
        metadata: {
          slack_channel: event.channel,
          slack_user: event.user,
          slack_thread_ts: event.thread_ts,
          slack_team_id: body.team_id as string,
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

      // If AI auto-responded, send to Slack
      if (result.ai_response?.sent && SLACK_BOT_TOKEN) {
        await sendSlackMessage(
          event.channel,
          result.ai_response.content,
          event.thread_ts || event.ts
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Find ticket by Slack thread timestamp
async function findTicketBySlackThread(threadTs: string): Promise<string | undefined> {
  const { data: message } = await supabase
    .from('messages')
    .select('ticket_id')
    .eq('source', 'slack')
    .contains('metadata', { slack_thread_ts: threadTs })
    .limit(1)
    .single();

  return message?.ticket_id;
}

// Send message to Slack channel
async function sendSlackMessage(
  channel: string,
  text: string,
  threadTs?: string
): Promise<void> {
  if (!SLACK_BOT_TOKEN) return;

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      thread_ts: threadTs,
    }),
  });
}

// Slack URL verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Slack Webhook',
    description: 'Configure this URL in your Slack app Event Subscriptions',
    configured: !!SLACK_SIGNING_SECRET && !!SLACK_BOT_TOKEN,
  });
}
