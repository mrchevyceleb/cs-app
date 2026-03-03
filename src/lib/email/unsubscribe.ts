/**
 * Email Unsubscribe Token Utilities
 *
 * Generates and validates HMAC-based unsubscribe tokens for CAN-SPAM compliance.
 * Tokens are stateless and don't expire. The HMAC prevents forgery.
 *
 * Token format: base64url(customerId:hmac(customerId))
 */

import { createHmac } from 'crypto'

/**
 * HMAC secret for unsubscribe tokens. Uses the service role key as the secret
 * since it's already available and sufficiently random.
 */
function getHmacSecret(): string {
  return process.env.SB_SERVICE_ROLE_KEY || process.env.CRON_SECRET || 'fallback-dev-secret'
}

/**
 * Generate an unsubscribe token for a customer.
 */
export function generateUnsubscribeToken(customerId: string): string {
  const hmac = createHmac('sha256', getHmacSecret())
    .update(customerId)
    .digest('hex')
    .slice(0, 16) // 16 hex chars = 64 bits, sufficient for tamper protection
  const payload = `${customerId}:${hmac}`
  return Buffer.from(payload, 'utf-8').toString('base64url')
}

/**
 * Validate and decode an unsubscribe token.
 * Returns the customer ID if valid, null otherwise.
 */
export function validateUnsubscribeToken(token: string): string | null {
  try {
    const payload = Buffer.from(token, 'base64url').toString('utf-8')
    const [customerId, providedHmac] = payload.split(':')
    if (!customerId || !providedHmac) return null

    const expectedHmac = createHmac('sha256', getHmacSecret())
      .update(customerId)
      .digest('hex')
      .slice(0, 16)

    // Constant-time comparison
    if (providedHmac.length !== expectedHmac.length) return null
    let match = true
    for (let i = 0; i < providedHmac.length; i++) {
      if (providedHmac[i] !== expectedHmac[i]) match = false
    }

    return match ? customerId : null
  } catch {
    return null
  }
}

/**
 * Generate an unsubscribe URL for a customer.
 * Used in proactive/broadcast email footers.
 */
export function getUnsubscribeUrl(customerId: string): string {
  const token = generateUnsubscribeToken(customerId)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'
  return `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}
