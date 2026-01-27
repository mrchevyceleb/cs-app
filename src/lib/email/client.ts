import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey && process.env.NODE_ENV === 'production') {
  console.warn('RESEND_API_KEY is not set. Email notifications will be disabled.')
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'R-Link Support <noreply@r-link.com>',
  portalUrl: process.env.PORTAL_URL || 'http://localhost:3000/portal',
  companyName: 'R-Link',
  supportEmail: 'support@r-link.com',
}

// Types for email sending
export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
  tags?: { name: string; value: string }[]
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email using Resend
 * Returns success status and provider ID or error message
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  if (!resend) {
    console.log('[Email] Resend not configured. Would have sent:', {
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
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      tags: options.tags,
    })

    if (error) {
      console.error('[Email] Send error:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Sent successfully:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Email] Exception:', message)
    return { success: false, error: message }
  }
}
