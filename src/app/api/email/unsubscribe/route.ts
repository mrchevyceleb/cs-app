/**
 * Email Unsubscribe Endpoint
 *
 * GET  /api/email/unsubscribe?token=<base64url> - Show confirmation page
 * POST /api/email/unsubscribe?token=<base64url> - Process opt-out
 *
 * Token format: base64url(customerId:hmac(customerId))
 * Tokens are stateless and don't expire. The HMAC prevents forgery.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailConfig } from '@/lib/email/client'
import { validateUnsubscribeToken } from '@/lib/email/unsubscribe'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SB_SERVICE_ROLE_KEY is required')
  return createClient(supabaseUrl, serviceKey)
}

/**
 * GET - Show unsubscribe confirmation page
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return new NextResponse(renderPage('Invalid Link', 'This unsubscribe link is invalid or has expired.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const customerId = validateUnsubscribeToken(token)
  if (!customerId) {
    return new NextResponse(renderPage('Invalid Link', 'This unsubscribe link is invalid or has expired.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Check if already opted out
  const supabase = getServiceClient()
  const { data: customer } = await supabase
    .from('customers')
    .select('email, email_opt_out')
    .eq('id', customerId)
    .single()

  if (customer?.email_opt_out) {
    return new NextResponse(
      renderPage('Already Unsubscribed', `You've already been unsubscribed from proactive emails. You'll still receive replies to your support requests.`, false),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  return new NextResponse(
    renderPage(
      'Unsubscribe from Proactive Emails',
      `Click the button below to stop receiving proactive emails from ${emailConfig.companyName}. You'll still receive direct replies to your support requests.`,
      true,
      token
    ),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

/**
 * POST - Process the opt-out
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const customerId = validateUnsubscribeToken(token)
  if (!customerId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { error } = await supabase
    .from('customers')
    .update({
      email_opt_out: true,
      email_opt_out_at: new Date().toISOString(),
    })
    .eq('id', customerId)

  if (error) {
    console.error('[Unsubscribe] Error updating customer:', error)
    return new NextResponse(
      renderPage('Error', 'Something went wrong. Please try again later.', false),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    )
  }

  console.log(`[Unsubscribe] Customer ${customerId} opted out of proactive emails`)

  return new NextResponse(
    renderPage(
      'Unsubscribed',
      `You've been successfully unsubscribed from proactive emails. You'll still receive direct replies to your support requests.`,
      false
    ),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

/**
 * Render a simple HTML page for the unsubscribe flow.
 */
function renderPage(title: string, message: string, showButton: boolean, token?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${emailConfig.companyName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #1E293B;
    }
    .container {
      max-width: 480px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    p {
      color: #475569;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background-color: #DC2626;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { background-color: #B91C1C; }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 13px;
      color: #94A3B8;
    }
    .footer a { color: #3B82F6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <p>${message}</p>
    ${showButton && token ? `
    <form method="POST" action="${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}">
      <button type="submit" class="btn">Unsubscribe</button>
    </form>
    ` : ''}
  </div>
  <div class="footer">
    <a href="${appUrl}">${emailConfig.companyName}</a>
  </div>
</body>
</html>`
}
