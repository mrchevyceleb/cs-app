// Widget configuration types

export interface TeaserConfig {
  enabled: boolean
  messages: string[]
  intervalMs: number
  delayMs: number
}

export const DEFAULT_TEASER_CONFIG: TeaserConfig = {
  enabled: true,
  messages: [
    'Hey! Running into any problems?',
    'Anything I can do for you?',
    'Curious about something?',
    'Need a hand with anything?',
  ],
  intervalMs: 8000,
  delayMs: 3000,
}

export interface WidgetConfig {
  position: 'bottom-right' | 'bottom-left'
  primaryColor: string
  greeting: string
  companyName: string
  theme: 'light' | 'dark' | 'auto'
  zIndex?: number
  agentName: string
  agentAvatarUrl?: string
  teaser: TeaserConfig
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  position: 'bottom-right',
  primaryColor: '#4F46E5',
  greeting: 'Hi! How can we help you today?',
  companyName: 'Support',
  theme: 'auto',
  zIndex: 999999,
  agentName: 'Nova',
  agentAvatarUrl: '/widget/nova-avatar.png',
  teaser: DEFAULT_TEASER_CONFIG,
}

// Widget state types
export type WidgetView = 'launcher' | 'auth' | 'tickets' | 'chat' | 'new-ticket'

export interface WidgetState {
  isOpen: boolean
  currentView: WidgetView
  currentTicketId: string | null
  isAuthenticated: boolean
  customerEmail: string | null
  customerName: string | null
  customerId: string | null
}

export const INITIAL_WIDGET_STATE: WidgetState = {
  isOpen: false,
  currentView: 'launcher',
  currentTicketId: null,
  isAuthenticated: false,
  customerEmail: null,
  customerName: null,
  customerId: null,
}

// Widget session (stored in localStorage)
export interface WidgetSession {
  token: string
  customerId: string
  customerEmail: string | null
  customerName: string | null
  expiresAt: string | null
  isAnonymous?: boolean
}

// Widget message types (for postMessage API)
export type WidgetMessageType =
  | 'widget:init'
  | 'widget:open'
  | 'widget:close'
  | 'widget:identify'
  | 'widget:ready'
  | 'widget:resize'
  | 'widget:error'

export interface WidgetMessage {
  type: WidgetMessageType
  payload?: unknown
}

export interface WidgetInitPayload {
  config: Partial<WidgetConfig>
}

export interface WidgetIdentifyPayload {
  email: string
  name?: string
  metadata?: Record<string, unknown>
}

export interface WidgetResizePayload {
  width: number
  height: number
}

// Widget ticket types (simplified from main app)
export interface WidgetTicket {
  id: string
  subject: string
  status: 'open' | 'pending' | 'resolved' | 'escalated'
  created_at: string
  updated_at: string
  message_count: number
  last_message_at?: string
}

export interface WidgetMessage_DB {
  id: string
  sender_type: 'customer' | 'agent' | 'ai'
  content: string
  created_at: string
}

export interface StreamingMessage extends WidgetMessage_DB {
  isStreaming?: boolean
}

// API request/response types
export interface WidgetAuthRequest {
  email: string
  name?: string
}

export interface WidgetAuthResponse {
  token: string
  customerId: string
  customerEmail: string | null
  customerName: string | null
  expiresAt: string | null
  isAnonymous?: boolean
}

export interface WidgetCreateTicketRequest {
  subject: string
  message: string
}

export interface WidgetCreateTicketResponse {
  ticket: WidgetTicket
  message: WidgetMessage_DB
}

export interface WidgetSendMessageRequest {
  content: string
}

export interface WidgetSendMessageResponse {
  message: WidgetMessage_DB
}

// Widget auth token type (extends existing customer_access_tokens)
export interface WidgetAccessToken {
  id: string
  customer_id: string
  ticket_id: string | null
  token: string
  source: 'portal' | 'widget'
  metadata: {
    origin?: string
    userAgent?: string
  }
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}
