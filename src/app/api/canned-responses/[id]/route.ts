import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Service role client for admin operations (bypasses RLS).
// Required because the canned_responses UPDATE/DELETE policies require
// agent_id = auth.uid(), which blocks edits to shared responses (agent_id IS NULL)
// even when the API has already verified the caller's permission.
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SB_SERVICE_ROLE_KEY is required')
  }
  return createAdminClient(supabaseUrl, serviceKey)
}

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

    // Only the creator can edit a canned response. Shared rows (agent_id IS NULL)
    // are read-only — the service-role writer below bypasses RLS, so this check is
    // the only gate stopping any agent from modifying seeded team templates.
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

    if (existing.agent_id === null) {
      return NextResponse.json(
        { error: 'Shared canned responses cannot be edited. Duplicate it to make a personal copy.' },
        { status: 403 }
      )
    }

    if (existing.agent_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own canned responses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, content, shortcut, category, tags, incrementUsage } = body

    // Use service role for the actual write so shared responses (agent_id IS NULL)
    // are not blocked by RLS even though the caller has permission.
    const writer = getServiceClient()

    // Handle usage count increment separately
    if (incrementUsage) {
      // First get the current usage count
      const currentResponse = await writer
        .from('canned_responses')
        .select('usage_count')
        .eq('id', id)
        .single()

      const currentCount = currentResponse.data?.usage_count ?? 0

      const { data: response, error } = await writer
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

    const { data: response, error } = await writer
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

    // Only the creator can delete a canned response. Shared rows (agent_id IS NULL)
    // are protected — the service-role writer below bypasses RLS, so this check is
    // the only gate stopping any agent from deleting seeded team templates.
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

    if (existing.agent_id === null) {
      return NextResponse.json(
        { error: 'Shared canned responses cannot be deleted.' },
        { status: 403 }
      )
    }

    if (existing.agent_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own canned responses' },
        { status: 403 }
      )
    }

    const { error } = await getServiceClient()
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
