import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get a Supabase admin client with service role key for cron jobs
 */
export function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for cron jobs')
  }

  return createClient(supabaseUrl, serviceKey)
}

/**
 * Verify that a request is from Vercel Cron
 * Vercel sends a secret in the Authorization header
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In development, allow requests without auth
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // If no CRON_SECRET is set, reject all cron requests in production
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not set - rejecting request')
    return false
  }

  // Verify the authorization header
  return authHeader === `Bearer ${cronSecret}`
}

/**
 * Standard response for unauthorized cron requests
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

/**
 * Wrapper for cron handlers that handles auth and error handling
 */
export function withCronAuth<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | { error: string }>> {
  return async (request: NextRequest) => {
    if (!verifyCronRequest(request)) {
      return unauthorizedResponse() as NextResponse<T | { error: string }>
    }

    try {
      return await handler(request)
    } catch (error) {
      console.error('[Cron] Handler error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      ) as NextResponse<T | { error: string }>
    }
  }
}

/**
 * Log cron job execution
 */
export function logCronExecution(
  jobName: string,
  status: 'started' | 'completed' | 'failed',
  details?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    job: jobName,
    status,
    ...details,
  }
  console.log(`[Cron:${jobName}]`, JSON.stringify(logData))
}
