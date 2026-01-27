/**
 * Webhook Endpoint CRUD API (single endpoint)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { WebhookEndpointUpdate } from '@/types/webhooks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get a single webhook endpoint
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !endpoint) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Mask secret
    endpoint.secret = endpoint.secret.slice(0, 10) + '...';

    return NextResponse.json({ endpoint });
  } catch (error) {
    console.error('Get webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Update a webhook endpoint
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json() as Partial<WebhookEndpointUpdate>;

    // Validate URL if provided
    if (body.url) {
      try {
        new URL(body.url);
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }

    // Build update object
    const updates: Partial<WebhookEndpointUpdate> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.url !== undefined) updates.url = body.url;
    if (body.secret !== undefined) updates.secret = body.secret;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.events !== undefined) updates.events = body.events;
    if (body.filter_status !== undefined) updates.filter_status = body.filter_status;
    if (body.filter_priority !== undefined) updates.filter_priority = body.filter_priority;
    if (body.filter_tags !== undefined) updates.filter_tags = body.filter_tags;
    if (body.max_retries !== undefined) updates.max_retries = body.max_retries;
    if (body.retry_delay_seconds !== undefined) updates.retry_delay_seconds = body.retry_delay_seconds;
    if (body.timeout_seconds !== undefined) updates.timeout_seconds = body.timeout_seconds;
    if (body.headers !== undefined) updates.headers = body.headers;

    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!endpoint) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Mask secret
    endpoint.secret = endpoint.secret.slice(0, 10) + '...';

    return NextResponse.json({ endpoint });
  } catch (error) {
    console.error('Update webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete a webhook endpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
