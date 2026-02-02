import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateAnonymousCustomer, generateWidgetToken } from '@/lib/widget/auth'
import type { WidgetAuthResponse } from '@/types/widget'

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// POST /api/widget/auth/anonymous - Create anonymous customer session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { fingerprint } = body as { fingerprint?: string }

    // Find or create anonymous customer
    const customer = await findOrCreateAnonymousCustomer(fingerprint || undefined)

    if (!customer) {
      return NextResponse.json(
        { error: 'Failed to create anonymous session' },
        { status: 500 }
      )
    }

    // Get request metadata for token
    const origin = request.headers.get('origin') || request.headers.get('referer') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Generate widget token
    const token = await generateWidgetToken(customer.id, { origin, userAgent })

    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate access token' },
        { status: 500 }
      )
    }

    // Calculate expiration (30 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const response: WidgetAuthResponse = {
      token,
      customerId: customer.id,
      customerEmail: customer.email,
      customerName: customer.name,
      expiresAt: expiresAt.toISOString(),
      isAnonymous: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Anonymous auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
