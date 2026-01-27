import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
// Loads config from database based on API key
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.nextUrl.searchParams.get('apiKey')

    // If no API key provided, return default config
    if (!apiKey) {
      return NextResponse.json({
        config: { ...DEFAULT_WIDGET_CONFIG },
      })
    }

    // Create Supabase client with service role to bypass RLS for public widget requests
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Look up settings by API key
    const { data: settings, error } = await supabase
      .from('widget_settings')
      .select('company_name, greeting, primary_color, position, theme')
      .eq('api_key', apiKey)
      .single()

    if (error || !settings) {
      // Invalid API key - return default config
      console.warn('Widget config: Invalid API key or settings not found')
      return NextResponse.json({
        config: { ...DEFAULT_WIDGET_CONFIG },
      })
    }

    // Build config from database settings
    const config = {
      position: settings.position as 'bottom-right' | 'bottom-left',
      primaryColor: settings.primary_color,
      greeting: settings.greeting,
      companyName: settings.company_name,
      theme: settings.theme as 'light' | 'dark' | 'auto',
      zIndex: DEFAULT_WIDGET_CONFIG.zIndex,
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
