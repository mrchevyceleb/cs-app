import { emailConfig } from './client'

// Types for template data
export interface TicketEmailData {
  ticketId: string
  ticketSubject: string
  ticketNumber?: string
  customerName: string
  portalToken: string
  messagePreview?: string
  priority?: string
  status?: string
  feedbackUrl?: string // Optional feedback URL to include in emails
}

export interface FeedbackEmailData {
  ticketId: string
  ticketSubject: string
  ticketNumber?: string
  customerName: string
  feedbackUrl: string
}

// Brand colors
const colors = {
  primary: '#3B82F6', // Blue
  primaryDark: '#2563EB',
  background: '#F8FAFC',
  cardBackground: '#FFFFFF',
  text: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#22C55E',
  yellow: '#FBBF24', // For stars
  yellowLight: '#FEF3C7',
}

// Common styles
const styles = {
  button: `
    display: inline-block;
    background-color: ${colors.primary};
    color: #FFFFFF;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    margin-top: 16px;
  `,
  container: `
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: ${colors.background};
  `,
  card: `
    background-color: ${colors.cardBackground};
    border-radius: 8px;
    padding: 32px;
    border: 1px solid ${colors.border};
    margin-bottom: 20px;
  `,
  header: `
    text-align: center;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid ${colors.border};
  `,
  logo: `
    font-size: 24px;
    font-weight: 700;
    color: ${colors.primary};
    text-decoration: none;
  `,
  h1: `
    color: ${colors.text};
    font-size: 22px;
    font-weight: 600;
    margin: 0 0 16px 0;
  `,
  paragraph: `
    color: ${colors.textMuted};
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 16px 0;
  `,
  ticketInfo: `
    background-color: ${colors.background};
    border-radius: 6px;
    padding: 16px;
    margin: 20px 0;
  `,
  ticketLabel: `
    color: ${colors.textMuted};
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 4px 0;
  `,
  ticketValue: `
    color: ${colors.text};
    font-size: 15px;
    font-weight: 500;
    margin: 0 0 12px 0;
  `,
  messagePreview: `
    background-color: ${colors.background};
    border-left: 3px solid ${colors.primary};
    padding: 12px 16px;
    margin: 20px 0;
    border-radius: 0 4px 4px 0;
  `,
  footer: `
    text-align: center;
    padding: 20px;
    color: ${colors.textMuted};
    font-size: 12px;
    line-height: 1.5;
  `,
}

// Generate portal link with token
function getPortalLink(ticketId: string, token: string): string {
  return `${emailConfig.portalUrl}/tickets/${ticketId}?token=${token}`
}

// Base HTML template wrapper
function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailConfig.companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background};">
  <div style="${styles.container}">
    ${content}
    <div style="${styles.footer}">
      <p style="margin: 0 0 8px 0;">
        <a href="${emailConfig.portalUrl}" style="color: ${colors.primary}; text-decoration: none;">${emailConfig.companyName}</a>
      </p>
      <p style="margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:${emailConfig.supportEmail}" style="color: ${colors.primary}; text-decoration: none;">${emailConfig.supportEmail}</a>
      </p>
      <p style="margin: 0; color: ${colors.textMuted};">
        This email was sent by ${emailConfig.companyName}. Please do not reply directly to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ============================================
// TICKET CREATED EMAIL
// ============================================
export function ticketCreatedTemplate(data: TicketEmailData): { html: string; text: string } {
  const portalLink = getPortalLink(data.ticketId, data.portalToken)
  const ticketRef = data.ticketNumber || data.ticketId.slice(0, 8).toUpperCase()

  const html = wrapInLayout(`
    <div style="${styles.card}">
      <div style="${styles.header}">
        <a href="${emailConfig.portalUrl}" style="${styles.logo}">${emailConfig.companyName}</a>
      </div>

      <h1 style="${styles.h1}">Your support request has been received</h1>

      <p style="${styles.paragraph}">
        Hi ${data.customerName || 'there'},
      </p>

      <p style="${styles.paragraph}">
        Thank you for contacting ${emailConfig.companyName} Support. We've received your request and our team is on it.
      </p>

      <div style="${styles.ticketInfo}">
        <p style="${styles.ticketLabel}">Ticket Reference</p>
        <p style="${styles.ticketValue}">#${ticketRef}</p>

        <p style="${styles.ticketLabel}">Subject</p>
        <p style="${styles.ticketValue}; margin-bottom: 0;">${data.ticketSubject}</p>
      </div>

      <p style="${styles.paragraph}">
        You can track the status of your request and communicate with our team through your customer portal.
      </p>

      <div style="text-align: center;">
        <a href="${portalLink}" style="${styles.button}">View Ticket</a>
      </div>
    </div>
  `)

  const text = `
Your support request has been received

Hi ${data.customerName || 'there'},

Thank you for contacting ${emailConfig.companyName} Support. We've received your request and our team is on it.

Ticket Reference: #${ticketRef}
Subject: ${data.ticketSubject}

You can track the status of your request here:
${portalLink}

Need help? Contact us at ${emailConfig.supportEmail}

${emailConfig.companyName}
  `.trim()

  return { html, text }
}

// ============================================
// TICKET UPDATED EMAIL
// ============================================
export function ticketUpdatedTemplate(data: TicketEmailData): { html: string; text: string } {
  const portalLink = getPortalLink(data.ticketId, data.portalToken)
  const ticketRef = data.ticketNumber || data.ticketId.slice(0, 8).toUpperCase()

  const html = wrapInLayout(`
    <div style="${styles.card}">
      <div style="${styles.header}">
        <a href="${emailConfig.portalUrl}" style="${styles.logo}">${emailConfig.companyName}</a>
      </div>

      <h1 style="${styles.h1}">Update on your support request</h1>

      <p style="${styles.paragraph}">
        Hi ${data.customerName || 'there'},
      </p>

      <p style="${styles.paragraph}">
        There's been an update to your support request.
      </p>

      <div style="${styles.ticketInfo}">
        <p style="${styles.ticketLabel}">Ticket Reference</p>
        <p style="${styles.ticketValue}">#${ticketRef}</p>

        <p style="${styles.ticketLabel}">Subject</p>
        <p style="${styles.ticketValue}">${data.ticketSubject}</p>

        ${data.status ? `
        <p style="${styles.ticketLabel}">Status</p>
        <p style="${styles.ticketValue}; margin-bottom: 0; text-transform: capitalize;">${data.status}</p>
        ` : ''}
      </div>

      <p style="${styles.paragraph}">
        Visit your customer portal to see the full details and continue the conversation.
      </p>

      <div style="text-align: center;">
        <a href="${portalLink}" style="${styles.button}">View Update</a>
      </div>
    </div>
  `)

  const text = `
Update on your support request

Hi ${data.customerName || 'there'},

There's been an update to your support request.

Ticket Reference: #${ticketRef}
Subject: ${data.ticketSubject}
${data.status ? `Status: ${data.status}` : ''}

View the update here:
${portalLink}

Need help? Contact us at ${emailConfig.supportEmail}

${emailConfig.companyName}
  `.trim()

  return { html, text }
}

// ============================================
// TICKET RESOLVED EMAIL
// ============================================
export function ticketResolvedTemplate(data: TicketEmailData): { html: string; text: string } {
  const portalLink = getPortalLink(data.ticketId, data.portalToken)
  const ticketRef = data.ticketNumber || data.ticketId.slice(0, 8).toUpperCase()

  // Feedback section (optional)
  const feedbackSection = data.feedbackUrl ? `
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${colors.border};">
        <h2 style="color: ${colors.text}; font-size: 18px; font-weight: 600; margin: 0 0 12px 0; text-align: center;">
          How was your experience?
        </h2>
        <p style="${styles.paragraph} text-align: center;">
          We'd love to hear your feedback! It only takes a moment and helps us improve.
        </p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; letter-spacing: 4px; color: ${colors.yellow};">
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </span>
        </div>
        <div style="text-align: center;">
          <a href="${data.feedbackUrl}" style="${styles.button}; background-color: ${colors.yellow}; color: ${colors.text};">
            Rate Your Experience
          </a>
        </div>
      </div>
  ` : ''

  const html = wrapInLayout(`
    <div style="${styles.card}">
      <div style="${styles.header}">
        <a href="${emailConfig.portalUrl}" style="${styles.logo}">${emailConfig.companyName}</a>
      </div>

      <h1 style="${styles.h1}">Your support request has been resolved</h1>

      <p style="${styles.paragraph}">
        Hi ${data.customerName || 'there'},
      </p>

      <p style="${styles.paragraph}">
        Great news! Your support request has been resolved. We hope we've addressed your concern to your satisfaction.
      </p>

      <div style="${styles.ticketInfo}">
        <p style="${styles.ticketLabel}">Ticket Reference</p>
        <p style="${styles.ticketValue}">#${ticketRef}</p>

        <p style="${styles.ticketLabel}">Subject</p>
        <p style="${styles.ticketValue}">${data.ticketSubject}</p>

        <p style="${styles.ticketLabel}">Status</p>
        <p style="${styles.ticketValue}; margin-bottom: 0; color: ${colors.success};">Resolved</p>
      </div>

      <p style="${styles.paragraph}">
        If you have any further questions or if this issue persists, please don't hesitate to reach out again.
      </p>

      <div style="text-align: center;">
        <a href="${portalLink}" style="${styles.button}">View Ticket Details</a>
      </div>

      ${feedbackSection}
    </div>
  `)

  const feedbackText = data.feedbackUrl ? `

---
HOW WAS YOUR EXPERIENCE?
We'd love to hear your feedback! Rate your experience here:
${data.feedbackUrl}
---` : ''

  const text = `
Your support request has been resolved

Hi ${data.customerName || 'there'},

Great news! Your support request has been resolved. We hope we've addressed your concern to your satisfaction.

Ticket Reference: #${ticketRef}
Subject: ${data.ticketSubject}
Status: Resolved

If you have any further questions or if this issue persists, please don't hesitate to reach out again.

View ticket details:
${portalLink}
${feedbackText}

Need help? Contact us at ${emailConfig.supportEmail}

${emailConfig.companyName}
  `.trim()

  return { html, text }
}

// ============================================
// AGENT REPLY EMAIL
// ============================================
export function agentReplyTemplate(data: TicketEmailData): { html: string; text: string } {
  const portalLink = getPortalLink(data.ticketId, data.portalToken)
  const ticketRef = data.ticketNumber || data.ticketId.slice(0, 8).toUpperCase()

  const html = wrapInLayout(`
    <div style="${styles.card}">
      <div style="${styles.header}">
        <a href="${emailConfig.portalUrl}" style="${styles.logo}">${emailConfig.companyName}</a>
      </div>

      <h1 style="${styles.h1}">New reply on your support request</h1>

      <p style="${styles.paragraph}">
        Hi ${data.customerName || 'there'},
      </p>

      <p style="${styles.paragraph}">
        You have a new reply on your support request. Our team has responded to help you.
      </p>

      <div style="${styles.ticketInfo}">
        <p style="${styles.ticketLabel}">Ticket Reference</p>
        <p style="${styles.ticketValue}">#${ticketRef}</p>

        <p style="${styles.ticketLabel}">Subject</p>
        <p style="${styles.ticketValue}; margin-bottom: 0;">${data.ticketSubject}</p>
      </div>

      ${data.messagePreview ? `
      <div style="${styles.messagePreview}">
        <p style="color: ${colors.textMuted}; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Message Preview</p>
        <p style="color: ${colors.text}; font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${data.messagePreview.length > 300 ? data.messagePreview.slice(0, 300) + '...' : data.messagePreview}</p>
      </div>
      ` : ''}

      <p style="${styles.paragraph}">
        Visit your customer portal to read the full message and reply.
      </p>

      <div style="text-align: center;">
        <a href="${portalLink}" style="${styles.button}">View & Reply</a>
      </div>
    </div>
  `)

  const text = `
New reply on your support request

Hi ${data.customerName || 'there'},

You have a new reply on your support request. Our team has responded to help you.

Ticket Reference: #${ticketRef}
Subject: ${data.ticketSubject}

${data.messagePreview ? `--- Message Preview ---
${data.messagePreview.length > 300 ? data.messagePreview.slice(0, 300) + '...' : data.messagePreview}
---` : ''}

View the full message and reply here:
${portalLink}

Need help? Contact us at ${emailConfig.supportEmail}

${emailConfig.companyName}
  `.trim()

  return { html, text }
}

// ============================================
// FEEDBACK REQUEST EMAIL
// ============================================
export function feedbackRequestTemplate(data: FeedbackEmailData): { html: string; text: string } {
  const ticketRef = data.ticketNumber || data.ticketId.slice(0, 8).toUpperCase()

  const html = wrapInLayout(`
    <div style="${styles.card}">
      <div style="${styles.header}">
        <a href="${emailConfig.portalUrl}" style="${styles.logo}">${emailConfig.companyName}</a>
      </div>

      <h1 style="${styles.h1}; text-align: center;">How was your experience?</h1>

      <p style="${styles.paragraph}">
        Hi ${data.customerName || 'there'},
      </p>

      <p style="${styles.paragraph}">
        We recently helped you with a support request and would love to hear about your experience. Your feedback helps us improve our service!
      </p>

      <div style="${styles.ticketInfo}">
        <p style="${styles.ticketLabel}">Regarding</p>
        <p style="${styles.ticketValue}; margin-bottom: 0;">${data.ticketSubject}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <p style="font-size: 14px; color: ${colors.textMuted}; margin-bottom: 16px;">
          Click below to rate your experience
        </p>
        <div style="margin: 20px 0;">
          <span style="font-size: 40px; letter-spacing: 8px; color: ${colors.yellow};">
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </span>
        </div>
        <a href="${data.feedbackUrl}" style="${styles.button}; background-color: ${colors.yellow}; color: ${colors.text}; font-size: 16px; padding: 14px 32px;">
          Rate Your Experience
        </a>
      </div>

      <p style="${styles.paragraph}; text-align: center; font-size: 13px;">
        It only takes a moment and your feedback is truly appreciated.
      </p>
    </div>
  `)

  const text = `
How was your experience?

Hi ${data.customerName || 'there'},

We recently helped you with a support request and would love to hear about your experience. Your feedback helps us improve our service!

Regarding: ${data.ticketSubject}
Ticket Reference: #${ticketRef}

Please take a moment to rate your experience:
${data.feedbackUrl}

It only takes a moment and your feedback is truly appreciated.

Need help? Contact us at ${emailConfig.supportEmail}

${emailConfig.companyName}
  `.trim()

  return { html, text }
}

// Export all templates
export const emailTemplates = {
  ticketCreated: ticketCreatedTemplate,
  ticketUpdated: ticketUpdatedTemplate,
  ticketResolved: ticketResolvedTemplate,
  agentReply: agentReplyTemplate,
  feedbackRequest: feedbackRequestTemplate,
}

export type EmailType = keyof typeof emailTemplates
