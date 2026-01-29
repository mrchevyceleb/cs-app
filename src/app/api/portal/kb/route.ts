/**
 * Portal Knowledge Base API
 * GET /api/portal/kb - List KB categories and top articles
 * GET /api/portal/kb?q=breakout+rooms - Search KB
 * Protected by portal token auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeHybrid } from '@/lib/knowledge/search'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Verify portal token auth
    const token = request.cookies.get('portal_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify token
    const { data: accessToken } = await supabase
      .from('customer_access_tokens')
      .select('customer_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (query) {
      // Search mode
      const results = await searchKnowledgeHybrid({
        query,
        limit: 8,
        source: 'portal',
        customerId: accessToken.customer_id,
      })

      return NextResponse.json({
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          content: r.content.slice(0, 500),
          category: r.category,
          source_file: r.source_file,
          similarity: Math.round(r.similarity * 100),
        })),
        query,
      })
    }

    // Browse mode: list categories and top articles
    const { data: articles } = await supabase
      .from('knowledge_articles')
      .select('id, title, category, source_file')
      .eq('is_kb_source', true)
      .order('file_number', { ascending: true })
      .order('chunk_index', { ascending: true })

    // Group by category
    const categories = new Map<string, { title: string; source_file: string }[]>()
    for (const article of articles || []) {
      const cat = article.category || 'General'
      if (!categories.has(cat)) categories.set(cat, [])
      // Deduplicate by source file
      const existing = categories.get(cat)!
      if (!existing.some(a => a.source_file === article.source_file)) {
        existing.push({ title: article.title, source_file: article.source_file || '' })
      }
    }

    return NextResponse.json({
      categories: Object.fromEntries(categories),
    })
  } catch (error) {
    console.error('Portal KB API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
