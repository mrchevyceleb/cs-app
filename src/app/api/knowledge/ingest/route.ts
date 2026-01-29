/**
 * Knowledge Base Ingestion API
 * POST /api/knowledge/ingest - Full or single-file re-ingestion
 * Protected by agent auth (Supabase Auth)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ingestKnowledgeBase } from '@/lib/knowledge/ingest'

export async function POST(request: NextRequest) {
  try {
    // Verify agent auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is an agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent access required' },
        { status: 403 }
      )
    }

    // Get optional single-file parameter
    const { searchParams } = new URL(request.url)
    const singleFile = searchParams.get('file') || undefined

    // Run ingestion
    const result = await ingestKnowledgeBase(singleFile)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Ingestion API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
