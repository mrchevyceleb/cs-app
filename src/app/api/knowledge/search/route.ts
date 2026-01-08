import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai/chat'

// POST /api/knowledge/search - Vector similarity search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      query,
      matchThreshold = 0.7,
      matchCount = 5,
    } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query' },
        { status: 400 }
      )
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query)

    // Perform vector similarity search
    const { data: results, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    })

    if (error) {
      console.error('Error searching knowledge base:', error)
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      results: results || [],
      query,
    })
  } catch (error) {
    console.error('Knowledge search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
