/**
 * Widget KB Suggest API
 * GET /api/widget/kb-suggest?q=camera+not+working
 * Returns top KB article matches for ticket deflection
 * Public endpoint (no auth required), rate limited by query
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeHybrid } from '@/lib/knowledge/search'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 3) {
      return NextResponse.json({ suggestions: [] }, { headers: corsHeaders })
    }

    const results = await searchKnowledgeHybrid({
      query: query.trim(),
      limit: 3,
      source: 'widget',
    })

    // Return lightweight results for the widget
    const suggestions = results
      .filter(r => r.similarity > 0.5)
      .map(r => ({
        id: r.id,
        title: r.title,
        preview: r.content.slice(0, 150).trim() + (r.content.length > 150 ? '...' : ''),
        source_file: r.source_file,
        similarity: Math.round(r.similarity * 100),
        content: r.content.slice(0, 2000),
      }))

    return NextResponse.json({ suggestions }, { headers: corsHeaders })
  } catch (error) {
    console.error('Widget KB suggest error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
