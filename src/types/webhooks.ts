/**
 * Webhook Types
 * Defines types for outbound and inbound webhook infrastructure
 */

// Webhook event types
export type WebhookEventType =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.resolved'
  | 'ticket.escalated'
  | 'message.created'
  | 'message.created.customer'
  | 'message.created.agent'
  | 'message.created.ai'
  | 'customer.created'
  | 'feedback.submitted'
  | 'sla.warning'
  | 'sla.breached';

// Webhook delivery status
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

// Webhook source types (for inbound webhooks)
export type WebhookSourceType = 'slack' | 'discord' | 'teams' | 'custom';

// Outbound webhook endpoint configuration
export interface WebhookEndpoint {
  id: string;
  name: string;
  description: string | null;
  url: string;
  secret: string;
  enabled: boolean;
  events: WebhookEventType[];
  filter_status: string[] | null;
  filter_priority: string[] | null;
  filter_tags: string[] | null;
  max_retries: number;
  retry_delay_seconds: number;
  timeout_seconds: number;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpointInsert {
  id?: string;
  name: string;
  description?: string | null;
  url: string;
  secret: string;
  enabled?: boolean;
  events?: WebhookEventType[];
  filter_status?: string[] | null;
  filter_priority?: string[] | null;
  filter_tags?: string[] | null;
  max_retries?: number;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
  headers?: Record<string, string>;
  created_by?: string | null;
}

export interface WebhookEndpointUpdate {
  name?: string;
  description?: string | null;
  url?: string;
  secret?: string;
  enabled?: boolean;
  events?: WebhookEventType[];
  filter_status?: string[] | null;
  filter_priority?: string[] | null;
  filter_tags?: string[] | null;
  max_retries?: number;
  retry_delay_seconds?: number;
  timeout_seconds?: number;
  headers?: Record<string, string>;
}

// Webhook delivery log
export interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  event_type: WebhookEventType;
  event_id: string;
  payload: WebhookPayload;
  status: WebhookDeliveryStatus;
  attempts: number;
  next_retry_at: string | null;
  response_status: number | null;
  response_body: string | null;
  response_headers: Record<string, string> | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  delivered_at: string | null;
  last_attempt_at: string | null;
}

export interface WebhookDeliveryInsert {
  id?: string;
  webhook_endpoint_id: string;
  event_type: WebhookEventType;
  event_id: string;
  payload: WebhookPayload;
  status?: WebhookDeliveryStatus;
}

// Inbound webhook source configuration
export interface WebhookSource {
  id: string;
  name: string;
  description: string | null;
  type: WebhookSourceType;
  verification_token: string | null;
  signing_secret: string | null;
  field_mapping: WebhookFieldMapping;
  auto_create_tickets: boolean;
  default_priority: string;
  default_tags: string[];
  enabled: boolean;
  last_received_at: string | null;
  total_received: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookSourceInsert {
  id?: string;
  name: string;
  description?: string | null;
  type: WebhookSourceType;
  verification_token?: string | null;
  signing_secret?: string | null;
  field_mapping?: WebhookFieldMapping;
  auto_create_tickets?: boolean;
  default_priority?: string;
  default_tags?: string[];
  enabled?: boolean;
  created_by?: string | null;
}

export interface WebhookSourceUpdate {
  name?: string;
  description?: string | null;
  verification_token?: string | null;
  signing_secret?: string | null;
  field_mapping?: WebhookFieldMapping;
  auto_create_tickets?: boolean;
  default_priority?: string;
  default_tags?: string[];
  enabled?: boolean;
}

// Field mapping for extracting data from inbound webhooks
export interface WebhookFieldMapping {
  customer_identifier: string; // JSONPath expression
  message_content: string;
  external_id?: string;
  subject?: string;
  customer_name?: string;
}

// Webhook event type metadata
export interface WebhookEventTypeInfo {
  event_type: WebhookEventType;
  description: string;
  payload_schema: Record<string, unknown> | null;
  created_at: string;
}

// Base webhook payload structure
export interface WebhookPayload {
  event_type: WebhookEventType;
  event_id: string;
  timestamp: string;
  data: WebhookPayloadData;
}

// Union type for different payload data types
export type WebhookPayloadData =
  | TicketCreatedPayload
  | TicketUpdatedPayload
  | MessageCreatedPayload
  | CustomerCreatedPayload
  | FeedbackSubmittedPayload
  | SlaWarningPayload;

// Specific payload types
export interface TicketCreatedPayload {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    tags: string[];
    source_channel: string;
    created_at: string;
  };
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone_number: string | null;
  };
}

export interface TicketUpdatedPayload {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    tags: string[];
    assigned_agent_id: string | null;
    updated_at: string;
  };
  changes: {
    field: string;
    old_value: string | null;
    new_value: string | null;
  }[];
}

export interface MessageCreatedPayload {
  message: {
    id: string;
    ticket_id: string;
    sender_type: 'customer' | 'agent' | 'ai';
    content: string;
    source: string;
    created_at: string;
  };
  ticket: {
    id: string;
    subject: string;
    status: string;
  };
  customer: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface CustomerCreatedPayload {
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone_number: string | null;
    preferred_channel: string;
    created_at: string;
  };
}

export interface FeedbackSubmittedPayload {
  feedback: {
    id: string;
    ticket_id: string;
    rating: number;
    comment: string | null;
    submitted_at: string;
  };
  ticket: {
    id: string;
    subject: string;
    assigned_agent_id: string | null;
  };
}

export interface SlaWarningPayload {
  ticket: {
    id: string;
    subject: string;
    status: string;
    priority: string;
    assigned_agent_id: string | null;
  };
  sla: {
    type: 'first_response' | 'resolution';
    due_at: string;
    time_remaining_minutes: number;
    policy_name: string;
  };
}

// Webhook signature helpers
export interface WebhookSignatureConfig {
  secret: string;
  algorithm: 'sha256' | 'sha512';
  header_name: string;
  timestamp_header?: string;
  timestamp_tolerance_seconds?: number;
}

// Webhook delivery context (for retry logic)
export interface WebhookDeliveryContext {
  endpoint: WebhookEndpoint;
  delivery: WebhookDelivery;
  attempt_number: number;
  is_retry: boolean;
}
