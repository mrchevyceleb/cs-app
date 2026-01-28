import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type {
  Json,
  ProactiveOutreachType,
  OutreachChannel,
  ProactiveOutreachLogInsert,
} from '@/types/database'

// Get admin Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  return createClient(supabaseUrl, serviceKey)
}

// Request body type
interface SendOutreachRequest {
  customerId: string
  ticketId?: string
  outreachType: ProactiveOutreachType
  channel: OutreachChannel
  subject?: string
  content: string
  triggerReason?: string
  triggerData?: Record<string, unknown>
}

// Response type
interface SendOutreachResponse {
  success: boolean
  outreachId: string
  channel: OutreachChannel
  deliveryStatus: string
  error?: string
}

/**
 * Send outreach via email channel
 */
async function sendEmailOutreach(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string,
  ticketId: string | undefined,
  subject: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  // Get customer email
  const { data: customer } = await supabase
    .from('customers')
    .select('email, name')
    .eq('id', customerId)
    .single()

  if (!customer?.email) {
    return { success: false, error: 'Customer has no email address' }
  }

  // Use the existing email sending infrastructure
  // Import dynamically to avoid circular dependencies
  try {
    const { sendEmail } = await import('@/lib/email/client')

    const result = await sendEmail({
      to: customer.email,
      subject,
      text: content,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">
        <p>${content.replace(/\n/g, '</p><p>')}</p>
      </div>`,
      tags: [
        { name: 'type', value: 'proactive_outreach' },
        ...(ticketId ? [{ name: 'ticket_id', value: ticketId }] : []),
      ],
    })

    return { success: result.success, error: result.error }
  } catch (err) {
    console.error('[Proactive] Email send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Email send failed' }
  }
}

/**
 * Send outreach via SMS channel
 */
async function sendSmsOutreach(
  supabase: ReturnType<typeof getServiceClient>,
  customerId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  // Get customer phone
  const { data: customer } = await supabase
    .from('customers')
    .select('phone_number')
    .eq('id', customerId)
    .single()

  if (!customer?.phone_number) {
    return { success: false, error: 'Customer has no phone number' }
  }

  // Use the existing SMS infrastructure
  try {
    const { sendSms } = await import('@/lib/twilio/client')

    const result = await sendSms(customer.phone_number, content)
    return { success: result.success, error: result.error }
  } catch (err) {
    console.error('[Proactive] SMS send error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'SMS send failed' }
  }
}

/**
 * Add outreach as message to ticket (internal channel)
 */
async function addInternalOutreach(
  supabase: ReturnType<typeof getServiceClient>,
  ticketId: string,
  content: string,
  outreachType: ProactiveOutreachType
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('messages')
    .insert({
      ticket_id: ticketId,
      sender_type: 'ai',
      content,
      metadata: {
        is_proactive: true,
        outreach_type: outreachType,
      },
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * POST /api/proactive/send-outreach
 * Unified API for sending proactive outreach across channels
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const body: SendOutreachRequest = await request.json()

    const {
      customerId,
      ticketId,
      outreachType,
      channel,
      subject,
      content,
      triggerReason,
      triggerData,
    } = body

    // Validate required fields
    if (!customerId || !outreachType || !channel || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, outreachType, channel, content' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, phone_number')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Create outreach log entry (status: pending)
    const outreachLog: ProactiveOutreachLogInsert = {
      customer_id: customerId,
      ticket_id: ticketId || null,
      outreach_type: outreachType,
      channel,
      message_content: content,
      message_subject: subject || null,
      trigger_reason: triggerReason || null,
      trigger_data: (triggerData as Json) || {},
      delivery_status: 'pending',
    }

    const { data: logEntry, error: logError } = await supabase
      .from('proactive_outreach_log')
      .insert(outreachLog)
      .select()
      .single()

    if (logError || !logEntry) {
      console.error('[Proactive] Error creating log entry:', logError)
      return NextResponse.json(
        { error: 'Failed to create outreach log' },
        { status: 500 }
      )
    }

    // Send the outreach based on channel
    let sendResult: { success: boolean; error?: string }

    switch (channel) {
      case 'email':
        sendResult = await sendEmailOutreach(
          supabase,
          customerId,
          ticketId,
          subject || `Message from Support`,
          content
        )
        break

      case 'sms':
        sendResult = await sendSmsOutreach(supabase, customerId, content)
        break

      case 'internal':
        if (!ticketId) {
          sendResult = { success: false, error: 'ticketId required for internal channel' }
        } else {
          sendResult = await addInternalOutreach(supabase, ticketId, content, outreachType)
        }
        break

      case 'widget':
        // Widget messages are handled by adding to ticket and relying on real-time updates
        if (!ticketId) {
          sendResult = { success: false, error: 'ticketId required for widget channel' }
        } else {
          sendResult = await addInternalOutreach(supabase, ticketId, content, outreachType)
        }
        break

      case 'slack':
        // Slack would need integration with the customer's Slack workspace
        // For now, fall back to internal
        if (ticketId) {
          sendResult = await addInternalOutreach(supabase, ticketId, content, outreachType)
        } else {
          sendResult = { success: false, error: 'Slack outreach not yet implemented' }
        }
        break

      default:
        sendResult = { success: false, error: `Unknown channel: ${channel}` }
    }

    // Update the log entry with the result
    const now = new Date().toISOString()
    await supabase
      .from('proactive_outreach_log')
      .update({
        delivery_status: sendResult.success ? 'sent' : 'failed',
        delivered_at: sendResult.success ? now : null,
        error_message: sendResult.error || null,
      })
      .eq('id', logEntry.id)

    const response: SendOutreachResponse = {
      success: sendResult.success,
      outreachId: logEntry.id,
      channel,
      deliveryStatus: sendResult.success ? 'sent' : 'failed',
      error: sendResult.error,
    }

    return NextResponse.json(response, {
      status: sendResult.success ? 200 : 500,
    })
  } catch (error) {
    console.error('[Proactive] Send outreach error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/proactive/send-outreach
 * Get outreach history for a customer or ticket
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const customerId = searchParams.get('customerId')
    const ticketId = searchParams.get('ticketId')
    const outreachType = searchParams.get('outreachType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('proactive_outreach_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    if (ticketId) {
      query = query.eq('ticket_id', ticketId)
    }

    if (outreachType) {
      query = query.eq('outreach_type', outreachType)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: outreaches, error, count } = await query

    if (error) {
      console.error('[Proactive] Error fetching outreach log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch outreach history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      outreaches: outreaches || [],
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Proactive] Get outreach error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
