import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai/chat'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/knowledge/[id] - Get a single article
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .select('id, title, content, category, created_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching article:', error)
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Get article API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/knowledge/[id] - Update an article
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const { title, content, category } = body

    const updates: Record<string, unknown> = {}

    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (category !== undefined) updates.category = category

    // If title or content changed, regenerate embedding
    if (title !== undefined || content !== undefined) {
      // Fetch current article to get complete text for embedding
      const { data: currentArticle } = await supabase
        .from('knowledge_articles')
        .select('title, content')
        .eq('id', id)
        .single()

      if (currentArticle) {
        const newTitle = title !== undefined ? title : currentArticle.title
        const newContent = content !== undefined ? content : currentArticle.content
        const combinedText = `${newTitle}\n\n${newContent}`
        const embedding = await generateEmbedding(combinedText)
        updates.embedding = embedding
      }
    }

    const { data: article, error } = await supabase
      .from('knowledge_articles')
      .update(updates)
      .eq('id', id)
      .select('id, title, content, category, created_at')
      .single()

    if (error) {
      console.error('Error updating article:', error)
      return NextResponse.json(
        { error: 'Failed to update article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error('Update article API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge/[id] - Delete an article
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting article:', error)
      return NextResponse.json(
        { error: 'Failed to delete article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete article API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
