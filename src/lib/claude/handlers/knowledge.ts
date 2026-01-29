import type {
  ToolContext,
  ToolResult,
  SearchKnowledgeBaseInput,
  KnowledgeSearchResult,
} from '../types'
import { searchKnowledgeHybrid } from '@/lib/knowledge/search'

/**
 * Browse a specific KB article by source file name
 */
export interface BrowseKBArticleInput {
  source_file: string
  section?: string
}

/**
 * Search the knowledge base using hybrid vector + keyword search
 */
export async function searchKnowledgeBase(
  input: SearchKnowledgeBaseInput,
  context: ToolContext
): Promise<ToolResult> {
  const limit = input.limit || 5

  if (!input.query) {
    return {
      success: false,
      error: 'query is required',
    }
  }

  try {
    const results = await searchKnowledgeHybrid({
      query: input.query,
      limit,
      source: 'nova',
      ticketId: context.ticketId,
      customerId: context.customerId,
    })

    // Filter by category if specified
    let filteredResults = results
    if (input.category) {
      filteredResults = results.filter(
        r => r.category?.toLowerCase() === input.category?.toLowerCase()
      )
    }

    const searchResults: KnowledgeSearchResult[] = filteredResults.map(r => ({
      id: r.id,
      title: r.title,
      content: r.content.length > 1000 ? r.content.substring(0, 1000) + '...' : r.content,
      category: r.category || null,
      similarity: Math.round(r.similarity * 100) / 100,
    }))

    return {
      success: true,
      data: {
        articles: searchResults,
        count: searchResults.length,
        query: input.query,
        category_filter: input.category || null,
        sources: filteredResults.map(r => ({
          source_file: r.source_file,
          section_path: r.section_path,
          similarity: Math.round(r.similarity * 100) / 100,
        })),
      },
    }
  } catch (error) {
    console.error('searchKnowledgeBase error:', error)
    return {
      success: false,
      error: 'Failed to search knowledge base',
    }
  }
}

/**
 * Browse a specific KB article by source file
 * Concatenates all chunks from a given source file for full context
 */
export async function browseKBArticle(
  input: BrowseKBArticleInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context

  if (!input.source_file) {
    return {
      success: false,
      error: 'source_file is required',
    }
  }

  try {
    let query = supabase
      .from('knowledge_articles')
      .select('title, content, section_path, chunk_index, metadata')
      .eq('source_file', input.source_file)
      .eq('is_kb_source', true)
      .order('chunk_index', { ascending: true })

    // Optionally filter by section
    if (input.section) {
      query = query.ilike('section_path', `%${input.section}%`)
    }

    const { data: chunks, error } = await query

    if (error) {
      return {
        success: false,
        error: `Failed to browse article: ${error.message}`,
      }
    }

    if (!chunks || chunks.length === 0) {
      return {
        success: false,
        error: `No KB article found for source file: ${input.source_file}`,
      }
    }

    // Concatenate chunks into full article content
    const fullContent = chunks
      .map(c => `## ${c.title}\n${c.content}`)
      .join('\n\n---\n\n')

    const sections = chunks.map(c => c.section_path).filter(Boolean)

    return {
      success: true,
      data: {
        source_file: input.source_file,
        section_filter: input.section || null,
        chunk_count: chunks.length,
        sections: [...new Set(sections)],
        content: fullContent,
      },
    }
  } catch (error) {
    console.error('browseKBArticle error:', error)
    return {
      success: false,
      error: 'Failed to browse KB article',
    }
  }
}
