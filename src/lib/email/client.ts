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
  from: process.env.EMAIL_FROM || 'R-Link Support <noreply@r-link.com>',
  aiFrom: process.env.EMAIL_AI_FROM || 'Ava from R-Link Support <support@r-link.com>',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:3000/portal',
  companyName: 'R-Link',
  supportEmail: 'support@r-link.com',
  provider: 'sendgrid',
}

// Types for email sending
export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
  from?: string
  tags?: { name: string; value: string }[]
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
    const [response] = await sgMail.send({
      to: options.to,
      from: options.from || emailConfig.from,
      subject: options.subject,
      html: options.html,
      text: options.text,
      categories: options.tags?.map(t => `${t.name}:${t.value}`),
      headers: {},
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
