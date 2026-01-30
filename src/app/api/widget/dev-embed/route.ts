import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'widget_allow_all_in_dev'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ enabled: false }, { status: 404 })
  }

  const enabled = request.cookies.get(COOKIE_NAME)?.value === 'true'
  return NextResponse.json({ enabled })
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const enabled = body?.enabled === true

  const response = NextResponse.json({ enabled })

  if (enabled) {
    response.cookies.set(COOKIE_NAME, 'true', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  } else {
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  }

  return response
}
