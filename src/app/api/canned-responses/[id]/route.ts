import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/canned-responses/[id] - Get a single canned response
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: response, error } = await supabase
      .from('canned_responses')
      .select('*')
      .eq('id', id)
      .or(`agent_id.is.null,agent_id.eq.${user.id}`)
      .single()

    if (error || !response) {
      console.error('Error fetching canned response:', error)
      return NextResponse.json(
        { error: 'Canned response not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Get canned response API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/canned-responses/[id] - Update a canned response
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First check if user owns this response (can't edit shared responses unless you created them)
    const { data: existing } = await supabase
      .from('canned_responses')
      .select('agent_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Canned response not found' },
        { status: 404 }
      )
    }

    // Only allow editing your own responses (agent_id matches or is null - shared but you check ownership)
    if (existing.agent_id !== null && existing.agent_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own canned responses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, shortcut, category, tags, incrementUsage } = body

    // Handle usage count increment separately
    if (incrementUsage) {
      // First get the current usage count
      const currentResponse = await supabase
        .from('canned_responses')
        .select('usage_count')
        .eq('id', id)
        .single()

      const currentCount = currentResponse.data?.usage_count ?? 0

      const { data: response, error } = await supabase
        .from('canned_responses')
        .update({
          usage_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating usage count:', error)
        return NextResponse.json(
          { error: 'Failed to update usage count' },
          { status: 500 }
        )
      }

      return NextResponse.json({ response })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (shortcut !== undefined) updates.shortcut = shortcut || null
    if (category !== undefined) updates.category = category
    if (tags !== undefined) updates.tags = tags

    // Check if shortcut is unique if being updated
    if (shortcut) {
      const { data: existingShortcut } = await supabase
        .from('canned_responses')
        .select('id')
        .eq('shortcut', shortcut)
        .neq('id', id)
        .or(`agent_id.is.null,agent_id.eq.${user.id}`)
        .single()

      if (existingShortcut) {
        return NextResponse.json(
          { error: 'Shortcut already exists' },
          { status: 400 }
        )
      }
    }

    const { data: response, error } = await supabase
      .from('canned_responses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating canned response:', error)
      return NextResponse.json(
        { error: 'Failed to update canned response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Update canned response API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/canned-responses/[id] - Delete a canned response
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First check if user owns this response
    const { data: existing } = await supabase
      .from('canned_responses')
      .select('agent_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Canned response not found' },
        { status: 404 }
      )
    }

    // Only allow deleting your own responses
    if (existing.agent_id !== null && existing.agent_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own canned responses' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('canned_responses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting canned response:', error)
      return NextResponse.json(
        { error: 'Failed to delete canned response' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete canned response API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
