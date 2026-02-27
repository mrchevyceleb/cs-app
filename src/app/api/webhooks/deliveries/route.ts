/**
 * Webhook Deliveries API
 * List and manage webhook delivery history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { processRetries, getWebhookStats } from '@/lib/webhooks/service';

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

// List webhook deliveries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const endpointId = searchParams.get('endpoint_id');
    const status = searchParams.get('status');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = getSupabase()
      .from('webhook_deliveries')
      .select('*, webhook_endpoints(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (endpointId) {
      query = query.eq('webhook_endpoint_id', endpointId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: deliveries, count, error } = await query;

    if (error) {
      throw error;
    }

    // Get stats
    const stats = await getWebhookStats(endpointId || undefined);

    return NextResponse.json({
      deliveries: deliveries || [],
      stats,
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('List deliveries error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Trigger retry processing (can be called by cron or manually)
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'process_retries') {
      const result = await processRetries();
      return NextResponse.json({
        success: true,
        processed: result.processed,
        errors: result.errors,
      });
    }

    if (action === 'retry_single') {
      const body = await request.json();
      const deliveryId = body.delivery_id;

      if (!deliveryId) {
        return NextResponse.json({ error: 'delivery_id is required' }, { status: 400 });
      }

      // Get the delivery
      const { data: delivery, error: fetchError } = await getSupabase()
        .from('webhook_deliveries')
        .select('*, webhook_endpoints(*)')
        .eq('id', deliveryId)
        .single();

      if (fetchError || !delivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
      }

      // Reset for retry
      await getSupabase()
        .from('webhook_deliveries')
        .update({
          status: 'retrying',
          next_retry_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      // Process immediately
      const result = await processRetries();

      return NextResponse.json({
        success: true,
        message: 'Retry scheduled',
        result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Delivery action error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
