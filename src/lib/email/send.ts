import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './client'
import {
  ticketCreatedTemplate,
  ticketResolvedTemplate,
  agentReplyTemplate,
  feedbackRequestTemplate,
  TicketEmailData,
  FeedbackEmailData,
} from './templates'
import type { Ticket, Customer, Message } from '@/types/database'
import { generatePortalToken as generatePortalAccessToken } from '@/lib/portal/auth'

// Get admin Supabase client for email operations
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    // Fallback to anon key if service key not available
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  }

  return createClient(supabaseUrl, serviceKey)
}

// Email types for logging
export type EmailLogType =
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_resolved'
  | 'agent_reply'
  | 'reminder'
  | 'feedback_request'

export type EmailLogStatus = 'pending' | 'sent' | 'failed' | 'bounced'

// Email log record
export interface EmailLog {
  id: string
  ticket_id: string | null
  customer_id: string | null
  email_type: EmailLogType
  recipient_email: string
  subject: string
  status: EmailLogStatus
  provider_id: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  sent_at: string | null
}

// Portal token generation (DB-backed access tokens)
export async function generatePortalToken(customerId: string, ticketId: string): Promise<string | null> {
  return generatePortalAccessToken(customerId, ticketId)
}

// Validate portal token
export function validatePortalToken(token: string): { customerId: string; ticketId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const [customerId, ticketId] = decoded.split(':')
    if (customerId && ticketId) {
      return { customerId, ticketId }
    }
  } catch {
    // Invalid token format
  }
  return null
}

// Log email to database
async function logEmail(params: {
  ticketId?: string
  customerId?: string
  emailType: EmailLogType
  recipientEmail: string
  subject: string
  status: EmailLogStatus
  providerId?: string
  errorMessage?: string
  metadata?: Record<string, unknown>
}): Promise<EmailLog | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      ticket_id: params.ticketId || null,
      customer_id: params.customerId || null,
      email_type: params.emailType,
      recipient_email: params.recipientEmail,
      subject: params.subject,
      status: params.status,
      provider_id: params.providerId || null,
      error_message: params.errorMessage || null,
      metadata: params.metadata || null,
      sent_at: params.status === 'sent' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('[EmailLog] Failed to log email:', error)
    return null
  }

  return data as EmailLog
}

// ============================================
// SEND TICKET CREATED EMAIL
// ============================================
export async function sendTicketCreatedEmail(
  ticket: Ticket,
  customer: Customer,
  token?: string
): Promise<{ success: boolean; emailLogId?: string; error?: string }> {
  // Skip if customer has no email
  if (!customer.email) {
    console.log('[Email] Skipping ticket created email - customer has no email')
    return { success: false, error: 'Customer has no email address' }
  }

  // Generate portal token if not provided
  const portalToken = token || await generatePortalToken(customer.id, ticket.id)
  if (!portalToken) {
    return { success: false, error: 'Failed to generate portal token' }
  }

  // Generate email content
  const emailData: TicketEmailData = {
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    customerName: customer.name || 'there',
    portalToken,
  }

  const { html, text } = ticketCreatedTemplate(emailData)
  const subject = `Your support request has been received - #${ticket.id.slice(0, 8).toUpperCase()}`

  // Send email
  const result = await sendEmail({
    to: customer.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'ticket_created' },
      { name: 'ticket_id', value: ticket.id },
    ],
  })

  // Log email
  const emailLog = await logEmail({
    ticketId: ticket.id,
    customerId: customer.id,
    emailType: 'ticket_created',
    recipientEmail: customer.email,
    subject,
    status: result.success ? 'sent' : 'failed',
    providerId: result.id,
    errorMessage: result.error,
    metadata: { portalToken },
  })

  return {
    success: result.success,
    emailLogId: emailLog?.id,
    error: result.error,
  }
}

// ============================================
// SEND TICKET RESOLVED EMAIL
// ============================================
export async function sendTicketResolvedEmail(
  ticket: Ticket,
  customer: Customer,
  token?: string
): Promise<{ success: boolean; emailLogId?: string; error?: string }> {
  // Skip if customer has no email
  if (!customer.email) {
    console.log('[Email] Skipping ticket resolved email - customer has no email')
    return { success: false, error: 'Customer has no email address' }
  }

  // Generate portal token if not provided
  const portalToken = token || await generatePortalToken(customer.id, ticket.id)
  if (!portalToken) {
    return { success: false, error: 'Failed to generate portal token' }
  }

  // Generate email content
  const emailData: TicketEmailData = {
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    customerName: customer.name || 'there',
    portalToken,
    status: 'resolved',
  }

  const { html, text } = ticketResolvedTemplate(emailData)
  const subject = `Your support request has been resolved - #${ticket.id.slice(0, 8).toUpperCase()}`

  // Send email
  const result = await sendEmail({
    to: customer.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'ticket_resolved' },
      { name: 'ticket_id', value: ticket.id },
    ],
  })

  // Log email
  const emailLog = await logEmail({
    ticketId: ticket.id,
    customerId: customer.id,
    emailType: 'ticket_resolved',
    recipientEmail: customer.email,
    subject,
    status: result.success ? 'sent' : 'failed',
    providerId: result.id,
    errorMessage: result.error,
    metadata: { portalToken },
  })

  return {
    success: result.success,
    emailLogId: emailLog?.id,
    error: result.error,
  }
}

// ============================================
// SEND AGENT REPLY EMAIL
// ============================================
export async function sendAgentReplyEmail(
  ticket: Ticket,
  message: Message,
  customer: Customer,
  token?: string
): Promise<{ success: boolean; emailLogId?: string; error?: string }> {
  // Skip if customer has no email
  if (!customer.email) {
    console.log('[Email] Skipping agent reply email - customer has no email')
    return { success: false, error: 'Customer has no email address' }
  }

  // Skip internal notes
  const metadata = message.metadata as Record<string, unknown> | null
  if (metadata?.is_internal) {
    console.log('[Email] Skipping agent reply email - message is internal note')
    return { success: false, error: 'Message is an internal note' }
  }

  // Generate portal token if not provided
  const portalToken = token || await generatePortalToken(customer.id, ticket.id)
  if (!portalToken) {
    return { success: false, error: 'Failed to generate portal token' }
  }

  // Generate email content
  const translatedPreview = message.content_translated?.trim()
  const emailData: TicketEmailData = {
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    customerName: customer.name || 'there',
    portalToken,
    messagePreview: translatedPreview || message.content,
  }

  const { html, text } = agentReplyTemplate(emailData)
  const subject = `New reply on your support request - #${ticket.id.slice(0, 8).toUpperCase()}`

  // Send email
  const result = await sendEmail({
    to: customer.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'agent_reply' },
      { name: 'ticket_id', value: ticket.id },
      { name: 'message_id', value: message.id },
    ],
  })

  // Log email
  const emailLog = await logEmail({
    ticketId: ticket.id,
    customerId: customer.id,
    emailType: 'agent_reply',
    recipientEmail: customer.email,
    subject,
    status: result.success ? 'sent' : 'failed',
    providerId: result.id,
    errorMessage: result.error,
    metadata: { portalToken, messageId: message.id },
  })

  return {
    success: result.success,
    emailLogId: emailLog?.id,
    error: result.error,
  }
}

// ============================================
// SEND FEEDBACK REQUEST EMAIL
// ============================================
export async function sendFeedbackRequestEmail(
  ticket: Ticket,
  customer: Customer,
  feedbackUrl: string
): Promise<{ success: boolean; emailLogId?: string; error?: string }> {
  // Skip if customer has no email
  if (!customer.email) {
    console.log('[Email] Skipping feedback request email - customer has no email')
    return { success: false, error: 'Customer has no email address' }
  }

  // Generate email content
  const emailData: FeedbackEmailData = {
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    customerName: customer.name || 'there',
    feedbackUrl,
  }

  const { html, text } = feedbackRequestTemplate(emailData)
  const subject = `How was your experience? - #${ticket.id.slice(0, 8).toUpperCase()}`

  // Send email
  const result = await sendEmail({
    to: customer.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'feedback_request' },
      { name: 'ticket_id', value: ticket.id },
    ],
  })

  // Log email
  const emailLog = await logEmail({
    ticketId: ticket.id,
    customerId: customer.id,
    emailType: 'feedback_request',
    recipientEmail: customer.email,
    subject,
    status: result.success ? 'sent' : 'failed',
    providerId: result.id,
    errorMessage: result.error,
    metadata: { feedbackUrl },
  })

  return {
    success: result.success,
    emailLogId: emailLog?.id,
    error: result.error,
  }
}

// ============================================
// SEND TICKET RESOLVED EMAIL WITH FEEDBACK
// ============================================
export async function sendTicketResolvedWithFeedbackEmail(
  ticket: Ticket,
  customer: Customer,
  feedbackUrl: string,
  token?: string
): Promise<{ success: boolean; emailLogId?: string; error?: string }> {
  // Skip if customer has no email
  if (!customer.email) {
    console.log('[Email] Skipping ticket resolved email - customer has no email')
    return { success: false, error: 'Customer has no email address' }
  }

  // Generate portal token if not provided
  const portalToken = token || await generatePortalToken(customer.id, ticket.id)
  if (!portalToken) {
    return { success: false, error: 'Failed to generate portal token' }
  }

  // Generate email content with feedback URL
  const emailData: TicketEmailData = {
    ticketId: ticket.id,
    ticketSubject: ticket.subject,
    customerName: customer.name || 'there',
    portalToken,
    status: 'resolved',
    feedbackUrl,
  }

  const { html, text } = ticketResolvedTemplate(emailData)
  const subject = `Your support request has been resolved - #${ticket.id.slice(0, 8).toUpperCase()}`

  // Send email
  const result = await sendEmail({
    to: customer.email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'ticket_resolved' },
      { name: 'ticket_id', value: ticket.id },
      { name: 'includes_feedback', value: 'true' },
    ],
  })

  // Log email
  const emailLog = await logEmail({
    ticketId: ticket.id,
    customerId: customer.id,
    emailType: 'ticket_resolved',
    recipientEmail: customer.email,
    subject,
    status: result.success ? 'sent' : 'failed',
    providerId: result.id,
    errorMessage: result.error,
    metadata: { portalToken, feedbackUrl },
  })

  return {
    success: result.success,
    emailLogId: emailLog?.id,
    error: result.error,
  }
}

// Export all send functions
export const emailSenders = {
  ticketCreated: sendTicketCreatedEmail,
  ticketResolved: sendTicketResolvedEmail,
  ticketResolvedWithFeedback: sendTicketResolvedWithFeedbackEmail,
  agentReply: sendAgentReplyEmail,
  feedbackRequest: sendFeedbackRequestEmail,
}
