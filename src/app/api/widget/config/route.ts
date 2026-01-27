import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_WIDGET_CONFIG } from '@/types/widget'

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/widget/config - Get widget configuration
// This could be extended to load config from database based on API key
export async function GET(request: NextRequest) {
  try {
    // API key can be used in the future to load organization-specific config
    const _apiKey = request.nextUrl.searchParams.get('apiKey')

    // In a production system, you would:
    // 1. Validate the API key against a database
    // 2. Load organization-specific config
    // 3. Return custom branding, greeting, etc.

    // For now, return default config
    const config = {
      ...DEFAULT_WIDGET_CONFIG,
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Widget config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
