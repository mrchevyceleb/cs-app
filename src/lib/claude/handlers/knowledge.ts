import type {
  ToolContext,
  ToolResult,
  SearchKnowledgeBaseInput,
  KnowledgeSearchResult,
} from '../types'
import { generateEmbedding } from '@/lib/openai/chat'

/**
 * Search the knowledge base for relevant articles using semantic search
 */
export async function searchKnowledgeBase(
  input: SearchKnowledgeBaseInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context
  const limit = input.limit || 5

  if (!input.query) {
    return {
      success: false,
      error: 'query is required',
    }
  }

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(input.query)

    // Use the match_knowledge RPC function for semantic search
    const { data: articles, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.6, // Lower threshold for broader results
      match_count: limit,
    })

    if (error) {
      console.error('Knowledge base search error:', error)
      return {
        success: false,
        error: `Failed to search knowledge base: ${error.message}`,
      }
    }

    // Filter by category if specified
    let results = articles || []
    if (input.category && results.length > 0) {
      // Fetch full article data to filter by category
      const articleIds = results.map((a: { id: string }) => a.id)
      const { data: fullArticles } = await supabase
        .from('knowledge_articles')
        .select('id, title, content, category')
        .in('id', articleIds)

      if (fullArticles) {
        const categoryFiltered = fullArticles.filter(
          (a) => a.category?.toLowerCase() === input.category?.toLowerCase()
        )

        // Re-order by similarity score
        results = categoryFiltered.map((a) => {
          const original = results.find((r: { id: string }) => r.id === a.id)
          return {
            ...a,
            similarity: original?.similarity || 0,
          }
        })
      }
    }

    const searchResults: KnowledgeSearchResult[] = results.map((a: {
      id: string
      title: string
      content: string
      category?: string | null
      similarity: number
    }) => ({
      id: a.id,
      title: a.title,
      content: a.content.length > 500 ? a.content.substring(0, 500) + '...' : a.content,
      category: a.category || null,
      similarity: Math.round(a.similarity * 100) / 100, // Round to 2 decimal places
    }))

    return {
      success: true,
      data: {
        articles: searchResults,
        count: searchResults.length,
        query: input.query,
        category_filter: input.category || null,
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
