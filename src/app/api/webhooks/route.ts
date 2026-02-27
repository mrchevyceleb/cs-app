/**
 * Webhooks CRUD API
 * Manage outbound webhook endpoint configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateWebhookSecret } from '@/lib/webhooks/signatures';
import type { WebhookEndpointInsert } from '@/types/webhooks';

// Lazy initialization to avoid build-time errors when env vars aren't available
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// List all webhook endpoints
export async function GET() {
  try {
    const { data: endpoints, error } = await getSupabase()
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Mask secrets in response
    const maskedEndpoints = endpoints?.map(ep => ({
      ...ep,
      secret: ep.secret.slice(0, 10) + '...',
    }));

    return NextResponse.json({ endpoints: maskedEndpoints || [] });
  } catch (error) {
    console.error('List webhooks error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Create a new webhook endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<WebhookEndpointInsert>;

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!body.url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Generate secret if not provided
    const secret = body.secret || generateWebhookSecret();

    // Create endpoint
    const { data: endpoint, error } = await getSupabase()
      .from('webhook_endpoints')
      .insert({
        name: body.name,
        description: body.description || null,
        url: body.url,
        secret,
        enabled: body.enabled ?? true,
        events: body.events || ['ticket.created', 'ticket.updated', 'message.created'],
        filter_status: body.filter_status || null,
        filter_priority: body.filter_priority || null,
        filter_tags: body.filter_tags || null,
        max_retries: body.max_retries || 3,
        retry_delay_seconds: body.retry_delay_seconds || 60,
        timeout_seconds: body.timeout_seconds || 30,
        headers: body.headers || {},
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (error) {
    console.error('Create webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
