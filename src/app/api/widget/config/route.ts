import { NextResponse } from 'next/server'
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
export async function GET() {
  try {
    // Create Supabase client with service role to bypass RLS for public widget requests
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SB_URL!,
      process.env.SB_SERVICE_ROLE_KEY!
    )

    const { data: settings, error } = await supabase
      .from('widget_settings')
      .select('company_name, greeting, primary_color, position, theme')
      .limit(1)
      .single()

    if (error || !settings) {
      return NextResponse.json({
        config: { ...DEFAULT_WIDGET_CONFIG },
      })
    }

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
