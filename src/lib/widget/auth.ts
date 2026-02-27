// Widget authentication utilities

import { createClient } from '@supabase/supabase-js'
import type { WidgetSession, WidgetAccessToken } from '@/types/widget'

const WIDGET_TOKEN_PREFIX = 'wt_'
const WIDGET_SESSION_KEY = 'cs_widget_session'

// Server-side: Create Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceKey)
}

/**
 * Generate a widget access token
 */
export async function generateWidgetToken(
  customerId: string,
  metadata: { origin?: string; userAgent?: string } = {},
  expiresInDays: number = 30
): Promise<string | null> {
  try {
    const supabase = getServiceClient()

    // Generate a secure token with widget prefix
    const token = WIDGET_TOKEN_PREFIX + crypto.randomUUID() + '-' + crypto.randomUUID()

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Insert token with widget source
    const { error } = await supabase
      .from('customer_access_tokens')
      .insert({
        customer_id: customerId,
        ticket_id: null,
        token,
        source: 'widget',
        metadata,
        expires_at: expiresAt.toISOString(),
      })

    if (error) {
      console.error('Error generating widget token:', error)
      return null
    }

    return token
  } catch (error) {
    console.error('Widget token generation error:', error)
    return null
  }
}

/**
 * Validate a widget access token
 */
export async function validateWidgetToken(token: string): Promise<WidgetSession | null> {
  if (!token || !token.startsWith(WIDGET_TOKEN_PREFIX)) {
    return null
  }

  try {
    const supabase = getServiceClient()

    // Query token with customer info
    const { data: tokenData, error: tokenError } = await supabase
      .from('customer_access_tokens')
      .select(`
        id,
        customer_id,
        expires_at,
        source,
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
        console.log('Widget token expired')
        return null
      }
    }

    // Update last_used_at
    await supabase
      .from('customer_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    // Extract customer data
    const customersData = tokenData.customers as unknown
    let customer: { id: string; name: string | null; email: string | null } | null = null

    if (Array.isArray(customersData) && customersData.length > 0) {
      customer = customersData[0] as { id: string; name: string | null; email: string | null }
    } else if (customersData && typeof customersData === 'object') {
      customer = customersData as { id: string; name: string | null; email: string | null }
    }

    if (!customer) {
      return null
    }

    return {
      token,
      customerId: tokenData.customer_id,
      customerEmail: customer.email || null,
      customerName: customer.name,
      expiresAt: tokenData.expires_at,
      isAnonymous: !customer.email,
    }
  } catch (error) {
    console.error('Widget auth error:', error)
    return null
  }
}

/**
 * Find or create a customer by email
 */
export async function findOrCreateCustomer(
  email: string,
  name?: string
): Promise<{ id: string; name: string | null; email: string } | null> {
  try {
    const supabase = getServiceClient()

    // Try to find existing customer
    const { data: existing, error: findError } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existing && !findError) {
      // Update name if provided and different
      if (name && name !== existing.name) {
        await supabase
          .from('customers')
          .update({ name })
          .eq('id', existing.id)
        return { ...existing, name }
      }
      return existing
    }

    // Create new customer
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        metadata: { source: 'widget' },
      })
      .select('id, name, email')
      .single()

    if (createError) {
      console.error('Error creating customer:', createError)
      return null
    }

    return newCustomer
  } catch (error) {
    console.error('Find/create customer error:', error)
    return null
  }
}

/**
 * Find or create an anonymous customer by fingerprint
 */
export async function findOrCreateAnonymousCustomer(
  fingerprint?: string
): Promise<{ id: string; name: string | null; email: string | null } | null> {
  try {
    const supabase = getServiceClient()

    // If fingerprint provided, try to find existing anonymous customer
    if (fingerprint) {
      const { data: existing, error: findError } = await supabase
        .from('customers')
        .select('id, name, email')
        .is('email', null)
        .eq('metadata->>fingerprint', fingerprint)
        .single()

      if (existing && !findError) {
        return existing
      }
    }

    // Create new anonymous customer
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        email: null,
        name: null,
        metadata: {
          source: 'widget',
          anonymous: true,
          fingerprint: fingerprint || null,
        },
      })
      .select('id, name, email')
      .single()

    if (createError) {
      console.error('Error creating anonymous customer:', createError)
      return null
    }

    return newCustomer
  } catch (error) {
    console.error('Find/create anonymous customer error:', error)
    return null
  }
}

/**
 * Extract widget token from request
 */
export function extractWidgetToken(request: Request): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token.startsWith(WIDGET_TOKEN_PREFIX)) {
      return token
    }
  }

  // Try cookie
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    const tokenCookie = cookies.find(c => c.startsWith('widget_token='))
    if (tokenCookie) {
      const token = tokenCookie.split('=')[1]
      if (token.startsWith(WIDGET_TOKEN_PREFIX)) {
        return token
      }
    }
  }

  return null
}

/**
 * Get widget session from request
 */
export async function getWidgetSession(request: Request): Promise<WidgetSession | null> {
  const token = extractWidgetToken(request)
  if (!token) return null

  return validateWidgetToken(token)
}

// Client-side utilities

/**
 * Save widget session to localStorage (client-side only)
 */
export function saveWidgetSession(session: WidgetSession): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(WIDGET_SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Failed to save widget session:', error)
  }
}

/**
 * Load widget session from localStorage (client-side only)
 */
export function loadWidgetSession(): WidgetSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(WIDGET_SESSION_KEY)
    if (!stored) return null

    const session = JSON.parse(stored) as WidgetSession

    // Check if session is expired
    if (session.expiresAt) {
      const expiresAt = new Date(session.expiresAt)
      if (expiresAt < new Date()) {
        clearWidgetSession()
        return null
      }
    }

    return session
  } catch (error) {
    console.error('Failed to load widget session:', error)
    return null
  }
}

/**
 * Clear widget session from localStorage (client-side only)
 */
export function clearWidgetSession(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(WIDGET_SESSION_KEY)
  } catch (error) {
    console.error('Failed to clear widget session:', error)
  }
}

/**
 * Generate a simple browser fingerprint (client-side only)
 * Uses UA + screen dimensions + timezone for basic uniqueness
 */
export function generateFingerprint(): string {
  if (typeof window === 'undefined') return ''

  const parts = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ]

  // Simple hash
  const str = parts.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'fp_' + Math.abs(hash).toString(36)
}
