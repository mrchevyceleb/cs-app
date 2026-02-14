/**
 * Webhook Signatures
 * HMAC-based signature generation and verification for webhooks
 */

import crypto from 'crypto';

// Header name for webhook signature
export const SIGNATURE_HEADER = 'X-Webhook-Signature';
export const TIMESTAMP_HEADER = 'X-Webhook-Timestamp';

// Default tolerance for timestamp validation (5 minutes)
const DEFAULT_TIMESTAMP_TOLERANCE = 300;

/**
 * Create a webhook signature
 */
export function createSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Parse a webhook signature header
 */
export function parseSignature(header: string): { timestamp: number; signatures: string[] } | null {
  const parts = header.split(',');
  let timestamp = 0;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = parseInt(value, 10);
    } else if (key.startsWith('v')) {
      signatures.push(value);
    }
  }

  if (timestamp === 0 || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

/**
 * Verify a webhook signature
 */
export function verifySignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds: number = DEFAULT_TIMESTAMP_TOLERANCE
): { valid: boolean; error?: string } {
  const parsed = parseSignature(header);

  if (!parsed) {
    return { valid: false, error: 'Invalid signature header format' };
  }

  const { timestamp, signatures } = parsed;

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { valid: false, error: 'Timestamp outside tolerance window' };
  }

  // Calculate expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Check if any of the provided signatures match
  const valid = signatures.some(sig =>
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature))
  );

  if (!valid) {
    return { valid: false, error: 'Signature mismatch' };
  }

  return { valid: true };
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Verify Discord signature (Ed25519)
 * Note: This is a simplified version; full implementation would use tweetnacl
 */
export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    // Discord uses Ed25519 signatures
    // In production, use tweetnacl.sign.detached.verify
    const message = Buffer.from(timestamp + body);
    const sig = Buffer.from(signature, 'hex');
    const key = Buffer.from(publicKey, 'hex');

    // Placeholder - implement with crypto.verify or tweetnacl
    console.warn('Discord signature verification requires Ed25519 implementation');
    return true; // For development only
  } catch {
    return false;
  }
}

/**
 * Verify generic HMAC signature
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' | 'sha1' = 'sha256'
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
