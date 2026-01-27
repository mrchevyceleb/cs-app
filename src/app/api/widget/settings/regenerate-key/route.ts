import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/widget/settings/regenerate-key - Generate a new API key
export async function POST() {
  try {
    const supabase = await createClient()

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

    // Generate a new API key in JavaScript
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const hexKey = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const newApiKey = `wk_${hexKey}`

    const { data: settings, error: updateError } = await supabase
      .from('widget_settings')
      .update({ api_key: newApiKey })
      .eq('id', current.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating API key:', updateError)
      return NextResponse.json(
        { error: 'Failed to regenerate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Regenerate key error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
