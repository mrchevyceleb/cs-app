/**
 * Notify agents when a ticket needs attention.
 * - Escalation alerts: urgent, clearly marked, with context
 * - Regular reply alerts: simple notification (currently only used if needed)
 */

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailConfig } from '@/lib/email/client'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SB_URL!,
    process.env.SB_SERVICE_ROLE_KEY!
  )
}

interface NotifyOptions {
  ticketId: string
  ticketSubject: string
  customerName: string | null
  customerEmail: string | null
  messagePreview: string
  channel: 'email' | 'widget' | 'portal'
  /** If true, styles the notification as an urgent escalation alert */
  isEscalation?: boolean
  /** Reason for escalation (shown to agents) */
  escalationReason?: string
}

/**
 * Create in-app notification and send email alert to agents.
 * Notifies the assigned agent, or all agents if unassigned.
 */
export async function notifyAgentsOfCustomerReply(options: NotifyOptions): Promise<void> {
  const { ticketId, ticketSubject, customerName, customerEmail, messagePreview, channel, isEscalation, escalationReason } = options
  const supabase = getServiceClient()

  try {
    // Find who to notify: assigned agent first, then all agents
    const { data: ticket } = await supabase
      .from('tickets')
      .select('assigned_agent_id')
      .eq('id', ticketId)
      .single()

    let agentIds: string[] = []

    if (ticket?.assigned_agent_id) {
      agentIds = [ticket.assigned_agent_id]
    } else {
      // No assigned agent: notify all agents
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
      agentIds = (agents || []).map(a => a.id)
    }

    if (agentIds.length === 0) return

    const displayName = customerName || customerEmail || 'A customer'
    const firstName = customerName?.split(' ')[0] || customerEmail || 'A customer'
    const preview = messagePreview.length > 150
      ? messagePreview.slice(0, 150) + '...'
      : messagePreview

    // In-app notification
    const notifTitle = isEscalation
      ? `Escalated: "${ticketSubject}"`
      : `New reply on "${ticketSubject}"`
    const notifMessage = isEscalation
      ? `${displayName} needs human help. ${escalationReason || 'AI could not resolve.'}`
      : `${displayName}: ${preview}`

    const notifications = agentIds.map(agentId => ({
      agent_id: agentId,
      type: isEscalation ? 'escalation' as const : 'new_customer_message' as const,
      title: notifTitle,
      message: notifMessage,
      ticket_id: ticketId,
    }))

    const { error: notifError } = await supabase
      .from('agent_notifications')
      .insert(notifications)

    if (notifError) {
      console.error('[Notify] Failed to create notifications:', notifError)
    }

    // Send email alerts to agents
    const { data: agents } = await supabase
      .from('agents')
      .select('id, email, name')
      .in('id', agentIds)

    if (!agents || agents.length === 0) return

    const channelLabel = channel === 'email' ? 'email' : channel === 'widget' ? 'the chat widget' : 'the portal'

    for (const agent of agents) {
      if (!agent.email) continue
      const agentFirst = agent.name?.split(' ')[0] || 'there'

      let subject: string
      let html: string
      let text: string

      if (isEscalation) {
        const reason = escalationReason || 'Nova could not resolve after multiple attempts.'
        subject = `[ACTION REQUIRED] Escalated ticket: ${ticketSubject}`

        html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;">
  <div style="max-width:600px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1E293B;">
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px 20px;margin:0 0 20px 0;">
      <p style="margin:0;font-weight:600;color:#DC2626;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Escalated to Human Agent</p>
    </div>
    <p style="margin:0 0 16px 0;">Hi ${agentFirst},</p>
    <p style="margin:0 0 16px 0;"><strong>${displayName}</strong> needs human help on <strong>${ticketSubject}</strong> (via ${channelLabel}).</p>
    <p style="margin:0 0 16px 0;"><strong>Why:</strong> ${reason}</p>
    <div style="margin:0 0 16px 0;padding:12px 16px;background:#f1f5f9;border-left:3px solid #DC2626;border-radius:0 4px 4px 0;">
      <p style="margin:0 0 4px 0;font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Latest from ${firstName}:</p>
      <p style="margin:0;color:#475569;font-size:14px;white-space:pre-wrap;">${preview}</p>
    </div>
    <p style="margin:0 0 16px 0;">Please review the conversation history and respond to the customer.</p>
    <p style="margin:0 0 4px 0;">Thanks,</p>
    <p style="margin:0;font-weight:500;">${emailConfig.companyName} Support System</p>
  </div>
</body>
</html>`.trim()

        text = `[ESCALATED] Hi ${agentFirst},

${displayName} needs human help on "${ticketSubject}" (via ${channelLabel}).

Why: ${reason}

Latest from ${firstName}:
"${preview}"

Please review the conversation history and respond to the customer.

Thanks,
${emailConfig.companyName} Support System`.trim()

      } else {
        subject = `New customer reply: ${ticketSubject}`

        html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;">
  <div style="max-width:600px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1E293B;">
    <p style="margin:0 0 16px 0;">Hi ${agentFirst},</p>
    <p style="margin:0 0 16px 0;">${displayName} just replied on <strong>${ticketSubject}</strong> via ${channelLabel}:</p>
    <div style="margin:0 0 16px 0;padding:12px 16px;background:#f1f5f9;border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#475569;font-size:14px;white-space:pre-wrap;">${preview}</p>
    </div>
    <p style="margin:0 0 4px 0;">Best,</p>
    <p style="margin:0;font-weight:500;">${emailConfig.companyName} Support System</p>
  </div>
</body>
</html>`.trim()

        text = `Hi ${agentFirst},

${displayName} just replied on "${ticketSubject}" via ${channelLabel}:

"${preview}"

Best,
${emailConfig.companyName} Support System`.trim()
      }

      try {
        await sendEmail({
          to: agent.email,
          subject,
          html,
          text,
          tags: [
            { name: 'type', value: isEscalation ? 'escalation_alert' : 'agent_alert' },
            { name: 'ticket_id', value: ticketId },
          ],
        })
      } catch (emailErr) {
        console.error(`[Notify] Failed to email agent ${agent.id}:`, emailErr)
      }
    }
  } catch (error) {
    console.error('[Notify] Error in notifyAgentsOfCustomerReply:', error)
  }
}
