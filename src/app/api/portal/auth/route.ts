import { NextRequest, NextResponse } from 'next/server'
import { validatePortalToken } from '@/lib/portal/auth'

// POST /api/portal/auth - Validate token and return session info
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const session = await validatePortalToken(token)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        customerId: session.customerId,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        ticketId: session.ticketId,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error) {
    console.error('Portal auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

// GET /api/portal/auth - Check current session from cookie
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('portal_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token found' },
        { status: 401 }
      )
    }

    const session = await validatePortalToken(token)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        customerId: session.customerId,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        ticketId: session.ticketId,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error) {
    console.error('Portal auth check error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
