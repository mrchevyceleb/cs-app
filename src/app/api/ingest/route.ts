/**
 * Unified Ingest API
 * Single entry point for all channels to submit messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { processIngest } from '@/lib/ai-router';
import type { IngestRequest } from '@/types/channels';

export async function POST(request: NextRequest) {
  try {
    // Authenticate: require INTERNAL_API_KEY
    const authHeader = request.headers.get('Authorization');
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as IngestRequest;

    // Validate required fields
    if (!body.channel) {
      return NextResponse.json(
        { error: 'channel is required' },
        { status: 400 }
      );
    }

    if (!body.customer_identifier) {
      return NextResponse.json(
        { error: 'customer_identifier is required' },
        { status: 400 }
      );
    }

    if (!body.message_content) {
      return NextResponse.json(
        { error: 'message_content is required' },
        { status: 400 }
      );
    }

    // Validate channel
    const validChannels = ['dashboard', 'portal', 'widget', 'email', 'api'];
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      );
    }

    // Process the ingest request
    const result = await processIngest(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ingest error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/ingest',
    description: 'Unified ingest endpoint for all channels',
    supported_channels: ['dashboard', 'portal', 'widget', 'email', 'api'],
  });
}
