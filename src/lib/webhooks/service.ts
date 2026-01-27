/**
 * Webhook Service
 * Handles outbound webhook dispatch with retry logic
 */

import { createClient } from '@supabase/supabase-js';
import type {
  WebhookEndpoint,
  WebhookDelivery,
  WebhookPayload,
  WebhookEventType,
  WebhookDeliveryStatus
} from '@/types/webhooks';
import { createSignature, SIGNATURE_HEADER } from './signatures';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Dispatch a webhook event to all matching endpoints
 */
export async function dispatchWebhook(
  eventType: WebhookEventType,
  eventId: string,
  data: WebhookPayload['data']
): Promise<{ dispatched: number; errors: string[] }> {
  const errors: string[] = [];

  // Get all enabled endpoints subscribed to this event
  const { data: endpoints, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('enabled', true)
    .contains('events', [eventType]);

  if (error) {
    console.error('Failed to fetch webhook endpoints:', error);
    return { dispatched: 0, errors: [error.message] };
  }

  if (!endpoints || endpoints.length === 0) {
    return { dispatched: 0, errors: [] };
  }

  // Build the payload
  const payload: WebhookPayload = {
    event_type: eventType,
    event_id: eventId,
    timestamp: new Date().toISOString(),
    data,
  };

  // Dispatch to each endpoint
  let dispatched = 0;
  for (const endpoint of endpoints) {
    // Check filters if applicable
    if (!matchesFilters(endpoint, data)) {
      continue;
    }

    try {
      // Create delivery record
      const { data: delivery, error: insertError } = await supabase
        .from('webhook_deliveries')
        .insert({
          webhook_endpoint_id: endpoint.id,
          event_type: eventType,
          event_id: eventId,
          payload: payload as unknown,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        errors.push(`Failed to create delivery record for ${endpoint.name}: ${insertError.message}`);
        continue;
      }

      // Attempt delivery
      await deliverWebhook(endpoint, delivery, payload);
      dispatched++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Failed to dispatch to ${endpoint.name}: ${message}`);
    }
  }

  return { dispatched, errors };
}

/**
 * Attempt to deliver a webhook
 */
async function deliverWebhook(
  endpoint: WebhookEndpoint,
  delivery: WebhookDelivery,
  payload: WebhookPayload
): Promise<void> {
  const startTime = Date.now();

  try {
    // Build headers
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signature = createSignature(payloadString, endpoint.secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [SIGNATURE_HEADER]: signature,
      'X-Webhook-Timestamp': timestamp.toString(),
      'X-Webhook-Event': payload.event_type,
      'X-Webhook-Delivery-Id': delivery.id,
      ...endpoint.headers,
    };

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout_seconds * 1000);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Update delivery record
    if (response.ok) {
      await updateDeliverySuccess(delivery.id, endpoint.id, {
        response_status: response.status,
        response_body: responseBody.slice(0, 10000), // Limit stored body size
        response_time_ms: responseTime,
      });
    } else {
      await updateDeliveryFailure(delivery.id, endpoint, {
        response_status: response.status,
        response_body: responseBody.slice(0, 10000),
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}: ${response.statusText}`,
      });
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await updateDeliveryFailure(delivery.id, endpoint, {
      response_time_ms: responseTime,
      error_message: errorMessage,
    });
  }
}

/**
 * Update delivery record on success
 */
async function updateDeliverySuccess(
  deliveryId: string,
  endpointId: string,
  data: {
    response_status: number;
    response_body: string;
    response_time_ms: number;
  }
): Promise<void> {
  const now = new Date().toISOString();

  // Update delivery
  await supabase
    .from('webhook_deliveries')
    .update({
      status: 'success',
      attempts: 1,
      response_status: data.response_status,
      response_body: data.response_body,
      response_time_ms: data.response_time_ms,
      delivered_at: now,
      last_attempt_at: now,
    })
    .eq('id', deliveryId);

  // Update endpoint stats
  await supabase
    .from('webhook_endpoints')
    .update({
      last_triggered_at: now,
      last_success_at: now,
      total_deliveries: supabase.rpc('increment_counter', { row_id: endpointId, column_name: 'total_deliveries' }),
      successful_deliveries: supabase.rpc('increment_counter', { row_id: endpointId, column_name: 'successful_deliveries' }),
    })
    .eq('id', endpointId);
}

/**
 * Update delivery record on failure and schedule retry
 */
async function updateDeliveryFailure(
  deliveryId: string,
  endpoint: WebhookEndpoint,
  data: {
    response_status?: number;
    response_body?: string;
    response_time_ms: number;
    error_message: string;
  }
): Promise<void> {
  const now = new Date().toISOString();

  // Get current delivery to check attempts
  const { data: delivery } = await supabase
    .from('webhook_deliveries')
    .select('attempts')
    .eq('id', deliveryId)
    .single();

  const attempts = (delivery?.attempts || 0) + 1;
  const shouldRetry = attempts < endpoint.max_retries;

  // Calculate next retry time with exponential backoff
  const nextRetryAt = shouldRetry
    ? new Date(Date.now() + endpoint.retry_delay_seconds * 1000 * Math.pow(2, attempts - 1)).toISOString()
    : null;

  // Update delivery
  await supabase
    .from('webhook_deliveries')
    .update({
      status: shouldRetry ? 'retrying' : 'failed',
      attempts,
      next_retry_at: nextRetryAt,
      response_status: data.response_status,
      response_body: data.response_body,
      response_time_ms: data.response_time_ms,
      error_message: data.error_message,
      last_attempt_at: now,
    })
    .eq('id', deliveryId);

  // Update endpoint stats
  if (!shouldRetry) {
    await supabase
      .from('webhook_endpoints')
      .update({
        last_triggered_at: now,
        last_failure_at: now,
      })
      .eq('id', endpoint.id);

    // Increment counters separately to avoid race conditions
    await supabase.rpc('increment_webhook_counters', {
      p_endpoint_id: endpoint.id,
      p_total: 1,
      p_failed: 1,
    });
  }
}

/**
 * Check if payload matches endpoint filters
 */
function matchesFilters(endpoint: WebhookEndpoint, data: WebhookPayload['data']): boolean {
  // Type guard for ticket-related payloads
  const hasTicket = 'ticket' in data && data.ticket;

  if (!hasTicket) return true;

  const ticket = data.ticket as { status?: string; priority?: string; tags?: string[] };

  // Check status filter
  if (endpoint.filter_status && endpoint.filter_status.length > 0) {
    if (!ticket.status || !endpoint.filter_status.includes(ticket.status)) {
      return false;
    }
  }

  // Check priority filter
  if (endpoint.filter_priority && endpoint.filter_priority.length > 0) {
    if (!ticket.priority || !endpoint.filter_priority.includes(ticket.priority)) {
      return false;
    }
  }

  // Check tags filter (ticket must have at least one matching tag)
  if (endpoint.filter_tags && endpoint.filter_tags.length > 0) {
    if (!ticket.tags || !ticket.tags.some(tag => endpoint.filter_tags!.includes(tag))) {
      return false;
    }
  }

  return true;
}

/**
 * Process pending retries
 */
export async function processRetries(): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Get deliveries ready for retry
  const { data: deliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook_endpoints(*)')
    .eq('status', 'retrying')
    .lte('next_retry_at', new Date().toISOString())
    .limit(100);

  if (error) {
    return { processed: 0, errors: [error.message] };
  }

  if (!deliveries || deliveries.length === 0) {
    return { processed: 0, errors: [] };
  }

  for (const delivery of deliveries) {
    const endpoint = delivery.webhook_endpoints as unknown as WebhookEndpoint;
    if (!endpoint || !endpoint.enabled) continue;

    try {
      await deliverWebhook(endpoint, delivery, delivery.payload as unknown as WebhookPayload);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Retry failed for delivery ${delivery.id}: ${message}`);
    }
  }

  return { processed, errors };
}

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(endpointId?: string): Promise<{
  total: number;
  successful: number;
  failed: number;
  pending: number;
  retrying: number;
}> {
  let query = supabase
    .from('webhook_deliveries')
    .select('status', { count: 'exact' });

  if (endpointId) {
    query = query.eq('webhook_endpoint_id', endpointId);
  }

  const { data, count } = await query;

  const stats = {
    total: count || 0,
    successful: 0,
    failed: 0,
    pending: 0,
    retrying: 0,
  };

  if (data) {
    for (const row of data) {
      const status = row.status as WebhookDeliveryStatus;
      if (status === 'success') stats.successful++;
      else if (status === 'failed') stats.failed++;
      else if (status === 'pending') stats.pending++;
      else if (status === 'retrying') stats.retrying++;
    }
  }

  return stats;
}
