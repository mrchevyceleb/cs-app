import type {
  ToolContext,
  ToolResult,
  LookupCustomerInput,
  UpdateCustomerInput,
  CustomerInfo,
} from '../types'

/**
 * Look up customer information by email or customer ID
 * Returns customer profile with recent tickets
 */
export async function lookupCustomer(
  input: LookupCustomerInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context

  // Need at least one identifier
  if (!input.customer_id && !input.email) {
    return {
      success: false,
      error: 'Please provide either a customer_id or email to look up',
    }
  }

  try {
    // Build query based on provided identifier
    let query = supabase.from('customers').select('*')

    if (input.customer_id) {
      query = query.eq('id', input.customer_id)
    } else if (input.email) {
      query = query.ilike('email', input.email)
    }

    const { data: customer, error: customerError } = await query.single()

    if (customerError || !customer) {
      return {
        success: false,
        error: `Customer not found${input.email ? ` with email: ${input.email}` : ''}${input.customer_id ? ` with ID: ${input.customer_id}` : ''}`,
      }
    }

    // Fetch recent tickets for this customer
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, subject, status, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (ticketsError) {
      console.error('Error fetching customer tickets:', ticketsError)
    }

    // Get total ticket count
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id)

    const customerInfo: CustomerInfo = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      preferred_language: customer.preferred_language,
      created_at: customer.created_at,
      metadata: (customer.metadata as Record<string, unknown>) || {},
      recent_tickets: (tickets || []).map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        created_at: t.created_at,
      })),
      total_tickets: count || 0,
    }

    return {
      success: true,
      data: customerInfo,
    }
  } catch (error) {
    console.error('lookupCustomer error:', error)
    return {
      success: false,
      error: 'Failed to look up customer information',
    }
  }
}

/**
 * Update customer profile settings
 */
export async function updateCustomer(
  input: UpdateCustomerInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context

  if (!input.customer_id) {
    return {
      success: false,
      error: 'customer_id is required',
    }
  }

  try {
    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}

    if (input.name !== undefined) {
      updates.name = input.name
    }

    if (input.preferred_language !== undefined) {
      updates.preferred_language = input.preferred_language
    }

    if (input.metadata !== undefined) {
      // Fetch existing metadata and merge
      const { data: existing } = await supabase
        .from('customers')
        .select('metadata')
        .eq('id', input.customer_id)
        .single()

      const existingMetadata = (existing?.metadata as Record<string, unknown>) || {}
      updates.metadata = { ...existingMetadata, ...input.metadata }
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: 'No fields to update. Provide name, preferred_language, or metadata.',
      }
    }

    // Perform the update
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', input.customer_id)
      .select()
      .single()

    if (error) {
      console.error('updateCustomer error:', error)
      return {
        success: false,
        error: `Failed to update customer: ${error.message}`,
      }
    }

    return {
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        preferred_language: customer.preferred_language,
        metadata: customer.metadata,
        updated_fields: Object.keys(updates),
      },
    }
  } catch (error) {
    console.error('updateCustomer error:', error)
    return {
      success: false,
      error: 'Failed to update customer',
    }
  }
}
