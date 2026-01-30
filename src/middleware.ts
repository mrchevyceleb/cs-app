import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  const pathname = request.nextUrl.pathname
  if (pathname === '/widget' || pathname === '/widget/') {
    const allowAllInDev = process.env.NODE_ENV === 'development' && (
      process.env.WIDGET_ALLOW_ALL_IN_DEV === 'true' ||
      request.cookies.get('widget_allow_all_in_dev')?.value === 'true'
    )

    if (allowAllInDev) {
      return response
    }

    const allowedOrigins = (process.env.WIDGET_ALLOWED_ORIGINS || '')
      .split(/[,\s]+/)
      .map(origin => origin.trim())
      .filter(Boolean)

    const frameAncestors = [`'self'`, ...allowedOrigins].join(' ')
    response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
