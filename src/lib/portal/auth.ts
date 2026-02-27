import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { PortalSession } from '@/types/database'

// Create a Supabase client with service role for portal auth
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, serviceKey)
}

/**
 * Validates a portal access token and returns session info
 */
export async function validatePortalToken(token: string): Promise<PortalSession | null> {
  if (!token) return null

  try {
    const supabase = getServiceClient()

    // Query customer_access_tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from('customer_access_tokens')
      .select(`
        id,
        customer_id,
        ticket_id,
        expires_at,
        customers:customer_id (
          id,
          name,
          email
        )
      `)
      .eq('token', token)
      .single()

    if (tokenError || !tokenData) {
      console.error('Token validation error:', tokenError)
      return null
    }

    // Check expiration
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at)
      if (expiresAt < new Date()) {
        console.log('Token expired')
        return null
      }
    }

    // Update last_used_at
    await supabase
      .from('customer_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    // Build session from token data
    // Handle the customers relation - it could be an array or single object
    const customersData = tokenData.customers as unknown
    let customer: { id: string; name: string | null; email: string | null } | null = null

    if (Array.isArray(customersData) && customersData.length > 0) {
      customer = customersData[0] as { id: string; name: string | null; email: string | null }
    } else if (customersData && typeof customersData === 'object') {
      customer = customersData as { id: string; name: string | null; email: string | null }
    }

    return {
      customerId: tokenData.customer_id,
      customerName: customer?.name || null,
      customerEmail: customer?.email || null,
      tokenId: tokenData.id,
      ticketId: tokenData.ticket_id,
      expiresAt: tokenData.expires_at,
    }
  } catch (error) {
    console.error('Portal auth error:', error)
    return null
  }
}

/**
 * Extracts token from Authorization header or cookie
 */
export function extractToken(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try cookie
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const tokenCookie = cookies.find(c => c.startsWith('portal_token='))
    if (tokenCookie) {
      return tokenCookie.split('=')[1]
    }
  }

  return null
}

/**
 * Middleware helper to validate token and get session
 */
export async function getPortalSession(request: Request): Promise<PortalSession | null> {
  const token = extractToken(request)
  if (!token) return null

  return validatePortalToken(token)
}

/**
 * Generate a portal access token for a customer
 * (Useful for testing or sending via email)
 */
export async function generatePortalToken(
  customerId: string,
  ticketId?: string | null,
  expiresInDays: number = 30
): Promise<string | null> {
  try {
    const supabase = getServiceClient()

    // Generate a secure random token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Insert token
    const { error } = await supabase
      .from('customer_access_tokens')
      .insert({
        customer_id: customerId,
        ticket_id: ticketId || null,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      console.error('Error generating token:', error)
      return null
    }

    return token
  } catch (error) {
    console.error('Token generation error:', error)
    return null
  }
}
