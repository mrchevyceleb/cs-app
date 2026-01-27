import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateCustomer, generateWidgetToken } from '@/lib/widget/auth'
import type { WidgetAuthRequest, WidgetAuthResponse } from '@/types/widget'

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// POST /api/widget/auth - Authenticate/register customer by email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WidgetAuthRequest
    const { email, name } = body

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(email, name)

    if (!customer) {
      return NextResponse.json(
        { error: 'Failed to create customer account' },
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
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Widget auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/widget/auth - Validate existing token
export async function GET(request: NextRequest) {
  try {
    const { getWidgetSession } = await import('@/lib/widget/auth')
    const session = await getWidgetSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', valid: false },
        { status: 401 }
      )
    }

    return NextResponse.json({
      valid: true,
      customerId: session.customerId,
      customerEmail: session.customerEmail,
      customerName: session.customerName,
      expiresAt: session.expiresAt,
    })
  } catch (error) {
    console.error('Widget token validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
