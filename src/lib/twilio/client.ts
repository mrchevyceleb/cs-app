/**
 * Twilio Client
 * Handles SMS sending and receiving via Twilio
 */

import type { TwilioOutboundSms } from '@/types/channels';

// Twilio configuration from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Base URL for webhook callbacks
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

interface TwilioMessage {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
  dateSent: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface SendSmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSms(
  to: string,
  body: string,
  options?: {
    statusCallback?: string;
    messagingServiceSid?: string;
  }
): Promise<SendSmsResult> {
  if (!isTwilioConfigured()) {
    return { success: false, error: 'Twilio is not configured' };
  }

  try {
    // Normalize phone number
    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
      return { success: false, error: 'Invalid phone number' };
    }

    // Build request body
    const formData = new URLSearchParams();
    formData.append('To', normalizedTo);
    formData.append('From', TWILIO_PHONE_NUMBER!);
    formData.append('Body', body);

    // Add status callback if provided
    if (options?.statusCallback) {
      formData.append('StatusCallback', options.statusCallback);
    } else if (BASE_URL) {
      formData.append('StatusCallback', `${BASE_URL}/api/webhooks/twilio/status`);
    }

    // Use messaging service if provided
    if (options?.messagingServiceSid) {
      formData.delete('From');
      formData.append('MessagingServiceSid', options.messagingServiceSid);
    }

    // Send via Twilio REST API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `Twilio error: ${result.code}`,
      };
    }

    return {
      success: true,
      messageSid: result.sid,
    };
  } catch (error) {
    console.error('Twilio send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a formatted support response via SMS
 */
export async function sendSupportSms(
  to: string,
  content: string,
  ticketId: string
): Promise<SendSmsResult> {
  // SMS messages have a 1600 character limit (split into segments)
  // We'll keep single messages under 160 for best deliverability
  const MAX_SMS_LENGTH = 1500;

  let body = content;

  // Truncate if too long
  if (body.length > MAX_SMS_LENGTH) {
    body = body.substring(0, MAX_SMS_LENGTH - 3) + '...';
  }

  // Add ticket reference footer if there's room
  const footer = `\n\nRef: ${ticketId.slice(0, 8)}`;
  if (body.length + footer.length <= MAX_SMS_LENGTH) {
    body += footer;
  }

  return sendSms(to, body, {
    statusCallback: BASE_URL ? `${BASE_URL}/api/webhooks/twilio/status?ticket_id=${ticketId}` : undefined,
  });
}

/**
 * Validate and normalize a phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // If it starts with +, keep it
  if (normalized.startsWith('+')) {
    // Validate E.164 format: + followed by 1-15 digits
    if (/^\+\d{1,15}$/.test(normalized)) {
      return normalized;
    }
    return null;
  }

  // Assume US number if 10 digits
  if (/^\d{10}$/.test(normalized)) {
    return `+1${normalized}`;
  }

  // If 11 digits starting with 1, assume US with country code
  if (/^1\d{10}$/.test(normalized)) {
    return `+${normalized}`;
  }

  // For other cases, try adding + prefix
  if (/^\d{1,15}$/.test(normalized)) {
    return `+${normalized}`;
  }

  return null;
}

/**
 * Validate Twilio webhook signature
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!TWILIO_AUTH_TOKEN) return false;

  try {
    // Build the validation string
    const sortedKeys = Object.keys(params).sort();
    const paramString = sortedKeys.map(key => `${key}${params[key]}`).join('');
    const data = url + paramString;

    // Calculate expected signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha1', TWILIO_AUTH_TOKEN)
      .update(data)
      .digest('base64');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Twilio signature validation error:', error);
    return false;
  }
}

/**
 * Parse Twilio webhook body (form-encoded)
 */
export function parseTwilioWebhook(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(body);

  urlParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Get message status from Twilio
 */
export async function getMessageStatus(messageSid: string): Promise<TwilioMessage | null> {
  if (!isTwilioConfigured()) return null;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      body: data.body,
      dateCreated: data.date_created,
      dateSent: data.date_sent,
      errorCode: data.error_code,
      errorMessage: data.error_message,
    };
  } catch (error) {
    console.error('Failed to get Twilio message status:', error);
    return null;
  }
}

/**
 * Format delivery status from Twilio status
 */
export function twilioStatusToDeliveryStatus(twilioStatus: string): 'pending' | 'sent' | 'delivered' | 'failed' {
  switch (twilioStatus) {
    case 'queued':
    case 'sending':
      return 'pending';
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'failed':
      return 'failed';
    default:
      return 'sent';
  }
}
