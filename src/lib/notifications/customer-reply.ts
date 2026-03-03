/**
 * Notify agents when a customer replies on a ticket.
 * Creates in-app notification (bell) and sends email alert to assigned agent.
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
}

/**
 * Create in-app notification and send email alert when a customer sends a message.
 * Notifies the assigned agent, or all agents if unassigned.
 */
export async function notifyAgentsOfCustomerReply(options: NotifyOptions): Promise<void> {
  const { ticketId, ticketSubject, customerName, customerEmail, messagePreview, channel } = options
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
    const preview = messagePreview.length > 100
      ? messagePreview.slice(0, 100) + '...'
      : messagePreview

    // Create in-app notifications for each agent
    const notifications = agentIds.map(agentId => ({
      agent_id: agentId,
      type: 'new_customer_message' as const,
      title: `New reply on "${ticketSubject}"`,
      message: `${displayName}: ${preview}`,
      ticket_id: ticketId,
    }))

    const { error: notifError } = await supabase
      .from('agent_notifications')
      .insert(notifications)

    if (notifError) {
      console.error('[Notify] Failed to create notifications:', notifError)
    }

    // Send email alerts to agents (fetch their emails)
    const { data: agents } = await supabase
      .from('agents')
      .select('id, email, name')
      .in('id', agentIds)

    if (!agents || agents.length === 0) return

    const channelLabel = channel === 'email' ? 'email' : channel === 'widget' ? 'the chat widget' : 'the portal'

    for (const agent of agents) {
      if (!agent.email) continue

      const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fff;">
  <div style="max-width:600px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1E293B;">
    <p style="margin:0 0 16px 0;">Hi ${agent.name || 'there'},</p>
    <p style="margin:0 0 16px 0;">${displayName} just replied on <strong>${ticketSubject}</strong> via ${channelLabel}:</p>
    <div style="margin:0 0 16px 0;padding:12px 16px;background:#f1f5f9;border-left:3px solid #3b82f6;border-radius:0 4px 4px 0;">
      <p style="margin:0;color:#475569;font-size:14px;white-space:pre-wrap;">${preview}</p>
    </div>
    <p style="margin:0 0 4px 0;">Best,</p>
    <p style="margin:0;font-weight:500;">${emailConfig.companyName} Support System</p>
  </div>
</body>
</html>`.trim()

      const text = `Hi ${agent.name || 'there'},

${displayName} just replied on "${ticketSubject}" via ${channelLabel}:

"${preview}"

Best,
${emailConfig.companyName} Support System`.trim()

      try {
        await sendEmail({
          to: agent.email,
          subject: `New customer reply: ${ticketSubject}`,
          html,
          text,
          tags: [
            { name: 'type', value: 'agent_alert' },
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
