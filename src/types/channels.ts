/**
 * Channel Types
 * Defines types for multi-channel communication support (SMS, Email, Slack, etc.)
 */

// Available communication channels
export type ChannelType = 'dashboard' | 'portal' | 'widget' | 'sms' | 'email' | 'slack' | 'api';

// Message source (where the message originated)
export type MessageSource = ChannelType;

// Customer's preferred channel for receiving responses
export type PreferredChannel = 'email' | 'sms' | 'slack' | 'widget';

// AI routing decision stored with messages
export interface RoutingDecision {
  intent: string;
  confidence: number;
  action: 'auto_respond' | 'escalate' | 'route_human';
  suggested_response?: string;
  knowledge_articles_used?: string[];
  escalation_reason?: string;
  processing_time_ms: number;
  model_used: string;
  /** ID of the ai_agent_session if processed by the agentic engine */
  agent_session_id?: string;
}

// Channel inbound log
export interface ChannelInboundLog {
  id: string;
  channel: ChannelType;
  external_id: string | null;
  from_identifier: string;
  to_identifier: string | null;
  raw_payload: Record<string, unknown>;
  processed: boolean;
  ticket_id: string | null;
  message_id: string | null;
  customer_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ChannelInboundLogInsert {
  id?: string;
  channel: ChannelType;
  external_id?: string | null;
  from_identifier: string;
  to_identifier?: string | null;
  raw_payload: Record<string, unknown>;
  processed?: boolean;
  ticket_id?: string | null;
  message_id?: string | null;
  customer_id?: string | null;
  error_message?: string | null;
  created_at?: string;
  processed_at?: string | null;
}

// Email thread
export interface EmailThread {
  id: string;
  ticket_id: string;
  message_id_header: string;
  in_reply_to: string | null;
  references_header: string | null;
  subject: string;
  from_address: string;
  to_address: string;
  created_at: string;
}

export interface EmailThreadInsert {
  id?: string;
  ticket_id: string;
  message_id_header: string;
  in_reply_to?: string | null;
  references_header?: string | null;
  subject: string;
  from_address: string;
  to_address: string;
  created_at?: string;
}

// Channel configuration
export interface ChannelConfig {
  id: string;
  channel: 'sms' | 'email' | 'slack' | 'widget';
  enabled: boolean;
  config: Record<string, unknown>;
  ai_auto_respond: boolean;
  ai_confidence_threshold: number;
  ai_escalation_keywords: string[] | null;
  ai_agent_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelConfigInsert {
  id?: string;
  channel: 'sms' | 'email' | 'slack' | 'widget';
  enabled?: boolean;
  config?: Record<string, unknown>;
  ai_auto_respond?: boolean;
  ai_confidence_threshold?: number;
  ai_escalation_keywords?: string[] | null;
  ai_agent_mode?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChannelConfigUpdate {
  id?: string;
  channel?: 'sms' | 'email' | 'slack' | 'widget';
  enabled?: boolean;
  config?: Record<string, unknown>;
  ai_auto_respond?: boolean;
  ai_confidence_threshold?: number;
  ai_escalation_keywords?: string[] | null;
  ai_agent_mode?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Typed channel configs
export interface SmsChannelConfig {
  phone_number: string | null;
  provider: 'twilio';
}

export interface EmailChannelConfig {
  inbound_address: string | null;
  send_from: string | null;
}

export interface SlackChannelConfig {
  workspace_id: string | null;
  channel_id: string | null;
  bot_token?: string;
}

export interface WidgetChannelConfig {
  greeting: string;
}

// Unified ingest request (from any channel)
export interface IngestRequest {
  channel: ChannelType;
  customer_identifier: string; // email, phone, or external ID
  customer_name?: string;
  message_content: string;
  subject?: string; // For email or new tickets
  external_id?: string; // Provider-specific message ID
  ticket_id?: string; // If replying to existing ticket
  metadata?: Record<string, unknown>;
  attachments?: IngestAttachment[];
}

export interface IngestAttachment {
  filename: string;
  content_type: string;
  size: number;
  url?: string; // If already hosted
  data?: string; // Base64 encoded if provided inline
}

// Ingest response
export interface IngestResponse {
  success: boolean;
  ticket_id: string;
  message_id: string;
  customer_id: string;
  is_new_ticket: boolean;
  routing_decision: RoutingDecision;
  ai_response?: {
    content: string;
    sent: boolean;
    channel: ChannelType;
  };
}

// Channel-specific send request
export interface ChannelSendRequest {
  ticket_id: string;
  message_id: string;
  channel: ChannelType;
  recipient: string; // email, phone, channel ID
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelSendResponse {
  success: boolean;
  external_id?: string;
  error?: string;
}

// Delivery status for messages
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// SMS-specific types
export interface TwilioInboundSms {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface TwilioOutboundSms {
  to: string;
  from: string;
  body: string;
  statusCallback?: string;
}

// Email-specific types (Resend inbound)
export interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  attachments?: {
    filename: string;
    content_type: string;
    content: string; // Base64
  }[];
}

// Slack-specific types
export interface SlackMessage {
  type: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

export interface SlackEvent {
  type: string;
  event: SlackMessage;
  team_id: string;
  api_app_id: string;
  event_id: string;
  event_time: number;
}
