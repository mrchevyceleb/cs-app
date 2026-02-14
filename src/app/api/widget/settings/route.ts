import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// GET /api/widget/settings - Fetch current widget settings
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: settings, error } = await supabase
      .from('widget_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching widget settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch widget settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Widget settings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/widget/settings - Update widget settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate inputs
    const updates: Record<string, unknown> = {}

    if (body.company_name !== undefined) {
      if (typeof body.company_name !== 'string' || body.company_name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Company name cannot be empty' },
          { status: 400 }
        )
      }
      updates.company_name = body.company_name.trim()
    }

    if (body.greeting !== undefined) {
      if (typeof body.greeting !== 'string') {
        return NextResponse.json(
          { error: 'Greeting must be a string' },
          { status: 400 }
        )
      }
      updates.greeting = body.greeting
    }

    if (body.primary_color !== undefined) {
      if (typeof body.primary_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(body.primary_color)) {
        return NextResponse.json(
          { error: 'Primary color must be a valid hex color (e.g., #4F46E5)' },
          { status: 400 }
        )
      }
      updates.primary_color = body.primary_color
    }

    if (body.position !== undefined) {
      if (!['bottom-right', 'bottom-left'].includes(body.position)) {
        return NextResponse.json(
          { error: 'Position must be "bottom-right" or "bottom-left"' },
          { status: 400 }
        )
      }
      updates.position = body.position
    }

    if (body.theme !== undefined) {
      if (!['light', 'dark', 'auto'].includes(body.theme)) {
        return NextResponse.json(
          { error: 'Theme must be "light", "dark", or "auto"' },
          { status: 400 }
        )
      }
      updates.theme = body.theme
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Get current settings to find the ID
    const { data: current, error: fetchError } = await supabase
      .from('widget_settings')
      .select('id')
      .limit(1)
      .single()

    if (fetchError || !current) {
      return NextResponse.json(
        { error: 'Widget settings not found' },
        { status: 404 }
      )
    }

    // Update settings
    const { data: settings, error } = await supabase
      .from('widget_settings')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating widget settings:', error)
      return NextResponse.json(
        { error: 'Failed to update widget settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Widget settings PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
