// Email client and configuration
export { emailConfig, sendEmail } from './client'
export type { SendEmailOptions, SendEmailResult } from './client'

// Email templates
export {
  emailTemplates,
  ticketCreatedTemplate,
  ticketUpdatedTemplate,
  ticketResolvedTemplate,
  agentReplyTemplate,
  feedbackRequestTemplate,
} from './templates'
export type { TicketEmailData, FeedbackEmailData, EmailType } from './templates'

// Unsubscribe utilities
export { getUnsubscribeUrl, generateUnsubscribeToken, validateUnsubscribeToken } from './unsubscribe'

// Email sending functions
export {
  emailSenders,
  sendTicketCreatedEmail,
  sendTicketResolvedEmail,
  sendTicketResolvedWithFeedbackEmail,
  sendAgentReplyEmail,
  sendFeedbackRequestEmail,
  generatePortalToken,
  validatePortalToken,
} from './send'
export type { EmailLog, EmailLogType, EmailLogStatus } from './send'
