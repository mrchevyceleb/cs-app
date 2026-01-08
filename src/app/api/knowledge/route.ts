import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/openai/chat'

// GET /api/knowledge - List knowledge base articles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('knowledge_articles')
      .select('id, title, content, category, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: articles, error, count } = await query

    if (error) {
      console.error('Error fetching articles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch articles' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      articles,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Knowledge API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge - Create a new knowledge base article
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { title, content, category } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Missing title or content' },
        { status: 400 }
      )
    }

    // Generate embedding for the article content
    const combinedText = `${title}\n\n${content}`
    const embedding = await generateEmbedding(combinedText)

    // Use raw SQL to insert with vector embedding (bypasses PostgREST schema cache issue)
    const { data: article, error } = await supabase.rpc('insert_knowledge_article', {
      p_title: title,
      p_content: content,
      p_category: category || null,
      p_embedding: embedding,
    })

    if (error) {
      console.error('Error creating article:', error)

      // Fallback: insert without embedding if RPC doesn't exist
      if (error.code === 'PGRST202') {
        const { data: fallbackArticle, error: fallbackError } = await supabase
          .from('knowledge_articles')
          .insert({
            title,
            content,
            category: category || null,
          })
          .select('id, title, content, category, created_at')
          .single()

        if (fallbackError) {
          console.error('Fallback insert error:', fallbackError)
          return NextResponse.json(
            { error: 'Failed to create article' },
            { status: 500 }
          )
        }

        return NextResponse.json({ article: fallbackArticle }, { status: 201 })
      }

      return NextResponse.json(
        { error: 'Failed to create article' },
        { status: 500 }
      )
    }

    return NextResponse.json({ article }, { status: 201 })
  } catch (error) {
    console.error('Create article API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
