import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CannedResponseCategory } from '@/types/database'

// GET /api/canned-responses - List all canned responses (own + shared)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as CannedResponseCategory | null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get responses that are either shared (agent_id is null) or belong to the current agent
    let query = supabase
      .from('canned_responses')
      .select('*', { count: 'exact' })
      .or(`agent_id.is.null,agent_id.eq.${user.id}`)
      .order('usage_count', { ascending: false })
      .order('title', { ascending: true })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,shortcut.ilike.%${search}%`)
    }

    const { data: responses, error, count } = await query

    if (error) {
      console.error('Error fetching canned responses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch canned responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      responses,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Canned responses API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/canned-responses - Create a new canned response
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, shortcut, category, tags, isShared } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Check if shortcut is unique if provided
    if (shortcut) {
      const { data: existing } = await supabase
        .from('canned_responses')
        .select('id')
        .eq('shortcut', shortcut)
        .or(`agent_id.is.null,agent_id.eq.${user.id}`)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'Shortcut already exists' },
          { status: 400 }
        )
      }
    }

    const { data: response, error } = await supabase
      .from('canned_responses')
      .insert({
        title,
        content,
        shortcut: shortcut || null,
        category: category || 'general',
        tags: tags || [],
        agent_id: isShared ? null : user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating canned response:', error)
      return NextResponse.json(
        { error: 'Failed to create canned response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ response }, { status: 201 })
  } catch (error) {
    console.error('Create canned response API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
