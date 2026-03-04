import sgMail from '@sendgrid/mail'

// Initialize SendGrid client
const sendgridApiKey = process.env.SENDGRID_API_KEY

if (!sendgridApiKey && process.env.NODE_ENV === 'production') {
  console.warn('SENDGRID_API_KEY is not set. Email notifications will be disabled.')
}

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
}

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'R-Link Support <support@c.r-link.com>',
  aiFrom: process.env.EMAIL_AI_FROM || 'Nova from R-Link <support@c.r-link.com>',
  replyTo: process.env.INBOUND_EMAIL_ADDRESS || process.env.EMAIL_FROM || 'support@c.r-link.com',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:3000/portal',
  companyName: 'R-Link',
  supportEmail: 'support@c.r-link.com',
  provider: 'sendgrid',
}

// Types for email sending
export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  headers?: Record<string, string>
  tags?: { name: string; value: string }[]
  /** URL for List-Unsubscribe header (CAN-SPAM compliance for proactive emails) */
  unsubscribeUrl?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email using SendGrid
 * Returns success status and provider ID or error message
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!sendgridApiKey) {
    console.log('[Email] SendGrid not configured. Would have sent:', {
      to: options.to,
      subject: options.subject,
    })
    // In development, return mock success
    if (process.env.NODE_ENV !== 'production') {
      return { success: true, id: `mock-${Date.now()}` }
    }
    return { success: false, error: 'Email service not configured' }
  }

  try {
    // Build headers, adding List-Unsubscribe for proactive emails
    const headers: Record<string, string> = { ...options.headers }
    if (options.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${options.unsubscribeUrl}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }

    const [response] = await sgMail.send({
      to: options.to,
      from: options.from || emailConfig.from,
      replyTo: emailConfig.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      categories: options.tags?.map(t => `${t.name}:${t.value}`),
      headers,
    })

    const messageId = response.headers['x-message-id']
    console.log('[Email] Sent successfully:', messageId)
    return { success: true, id: messageId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Email] Exception:', message)
    return { success: false, error: message }
  }
}
