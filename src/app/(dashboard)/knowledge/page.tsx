'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, BarChart3, BookOpen, Search, TrendingUp, AlertTriangle, Sparkles, FileText, Hash } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string | null
  source_file: string | null
  section_path: string | null
  file_number: number | null
  chunk_index: number | null
  is_kb_source: boolean | null
  created_at: string
}

interface SearchResult {
  id: string
  title: string
  content: string
  category: string | null
  source_file: string | null
  section_path: string | null
  file_number: number | null
  chunk_index: number | null
  is_kb_source: boolean | null
  similarity: number
  combined_score?: number
}

interface DocumentGroup {
  source_file: string
  display_name: string
  category: string | null
  file_number: number | null
  chunks: KnowledgeArticle[]
  first_content: string
}

interface KBMetrics {
  period_days: number
  summary: {
    total_searches: number
    total_kb_articles: number
    avg_similarity: number
    coverage_rate: number
    widget_searches: number
    widget_high_confidence: number
  }
  search_by_source: Record<string, number>
  search_trend: { date: string; count: number }[]
  top_articles: { id: string; title: string; category: string | null; source_file: string | null; match_count: number }[]
  coverage_gaps: { query: string; top_similarity: number; source: string; count: number }[]
}

type TabType = 'articles' | 'effectiveness'

const CATEGORIES = ['Foundation', 'Studio Core', 'Studio Features', 'Admin', 'General']

/** Format a KB filename like "02-plans-and-pricing.md" -> "Plans and Pricing" */
function formatFileName(filename: string): string {
  return filename
    .replace(/^\d+-/, '')       // remove leading number prefix
    .replace(/\.md$/, '')       // remove .md extension
    .replace(/-/g, ' ')         // dashes to spaces
    .replace(/\b\w/g, c => c.toUpperCase()) // title case
}

/** Group articles by source_file into document groups */
function groupByDocument(articles: KnowledgeArticle[]): { documents: DocumentGroup[]; manualArticles: KnowledgeArticle[] } {
  const kbArticles = articles.filter(a => a.is_kb_source && a.source_file)
  const manualArticles = articles.filter(a => !a.is_kb_source || !a.source_file)

  const groups = new Map<string, KnowledgeArticle[]>()
  for (const article of kbArticles) {
    const key = article.source_file!
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(article)
  }

  const documents: DocumentGroup[] = Array.from(groups.entries()).map(([source_file, chunks]) => {
    // Sort chunks by chunk_index
    chunks.sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0))
    return {
      source_file,
      display_name: formatFileName(source_file),
      category: chunks[0]?.category ?? null,
      file_number: chunks[0]?.file_number ?? null,
      chunks,
      first_content: chunks[0]?.content ?? '',
    }
  })

  // Sort documents by file_number
  documents.sort((a, b) => (a.file_number ?? 999) - (b.file_number ?? 999))

  return { documents, manualArticles }
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)

  // Search mode state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Document detail dialog
  const [selectedDocument, setSelectedDocument] = useState<DocumentGroup | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('')

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<KnowledgeArticle | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('articles')

  // Metrics state
  const [metrics, setMetrics] = useState<KBMetrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  // Ingest state
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestDialogOpen, setIngestDialogOpen] = useState(false)
  const [ingestResult, setIngestResult] = useState<string | null>(null)

  // Browse mode: fetch articles from API
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter)

      const response = await fetch(`/api/knowledge?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setArticles(data.articles || [])
        setTotal(data.total || 0)
      } else {
        setError('Failed to load articles. Please try again.')
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err)
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  // Search mode: hybrid search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setIsSearchMode(false)
      setSearchResults([])
      return
    }

    setIsSearchMode(true)
    setIsSearching(true)
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, hybrid: true, matchCount: 15 }),
      })
      const data = await response.json()

      if (response.ok) {
        setSearchResults(data.results || [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Fetch articles on mount and when category changes
  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  // Fetch metrics when effectiveness tab is active
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(null)
    try {
      const response = await fetch('/api/knowledge/metrics?days=30')
      const data = await response.json()
      if (response.ok) {
        setMetrics(data)
      } else {
        setMetricsError('Failed to load metrics.')
      }
    } catch {
      setMetricsError('Network error loading metrics.')
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'effectiveness') {
      fetchMetrics()
    }
  }, [activeTab, fetchMetrics])

  // Debounced search (400ms for hybrid which generates embeddings)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery)
      } else {
        setIsSearchMode(false)
        setSearchResults([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Group articles into documents
  const { documents, manualArticles } = useMemo(() => groupByDocument(articles), [articles])

  // Filter documents by category
  const filteredDocuments = useMemo(() => {
    if (categoryFilter === 'all') return documents
    return documents.filter(d => d.category === categoryFilter)
  }, [documents, categoryFilter])

  const filteredManualArticles = useMemo(() => {
    if (categoryFilter === 'all') return manualArticles
    return manualArticles.filter(a => a.category === categoryFilter)
  }, [manualArticles, categoryFilter])

  // Category counts for pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of CATEGORIES) {
      counts[cat] = documents.filter(d => d.category === cat).length
    }
    return counts
  }, [documents])

  // Open dialog for creating new article
  const handleCreateNew = () => {
    setEditingArticle(null)
    setFormTitle('')
    setFormContent('')
    setFormCategory('')
    setIsDialogOpen(true)
  }

  // Open dialog for editing article (manual articles only)
  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    setFormTitle(article.title)
    setFormContent(article.content)
    setFormCategory(article.category || '')
    setIsDialogOpen(true)
  }

  // Save article (create or update)
  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return

    setIsSaving(true)
    try {
      const url = editingArticle
        ? `/api/knowledge/${editingArticle.id}`
        : '/api/knowledge'

      const method = editingArticle ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory || null,
        }),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        fetchArticles()
      }
    } catch (error) {
      console.error('Failed to save article:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete article
  const handleDelete = async () => {
    if (!articleToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/knowledge/${articleToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setArticleToDelete(null)
        fetchArticles()
      }
    } catch (error) {
      console.error('Failed to delete article:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Confirm delete
  const confirmDelete = (article: KnowledgeArticle, e: React.MouseEvent) => {
    e.stopPropagation()
    setArticleToDelete(article)
    setDeleteDialogOpen(true)
  }

  // Handle ingest
  const handleIngest = async () => {
    setIngestDialogOpen(false)
    setIsIngesting(true)
    setIngestResult(null)
    try {
      const response = await fetch('/api/knowledge/ingest', {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setIngestResult(`Synced ${data.total_files} files, ${data.total_chunks} sections created`)
        fetchArticles()
      } else {
        setIngestResult(`Error: ${data.error || 'Ingestion failed'}`)
      }
    } catch (err) {
      console.error('Ingestion failed:', err)
      setIngestResult('Network error during ingestion')
    } finally {
      setIsIngesting(false)
    }
  }

  // Similarity score color
  const similarityColor = (score: number) => {
    const pct = Math.round(score * 100)
    if (pct >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (pct >= 60) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    return 'bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Knowledge Base
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isSearchMode
              ? `${searchResults.length} results for "${searchQuery}"`
              : `${documents.length} documents, ${total} sections`
            }
          </p>
        </div>
        {activeTab === 'articles' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIngestDialogOpen(true)}
              variant="outline"
              disabled={isIngesting}
              className="gap-2 flex-1 sm:flex-initial"
            >
              <RefreshCw className={`w-4 h-4 ${isIngesting ? 'animate-spin' : ''}`} />
              {isIngesting ? 'Syncing...' : 'Sync Knowledge Base'}
            </Button>
            <Button
              onClick={handleCreateNew}
              className="bg-primary-600 hover:bg-primary-700 text-white flex-1 sm:flex-initial"
            >
              + Add Article
            </Button>
          </div>
        )}
      </div>

      {/* Ingest result banner */}
      {ingestResult && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          ingestResult.startsWith('Error') || ingestResult.startsWith('Network')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
        }`}>
          {ingestResult}
          <button onClick={() => setIngestResult(null)} className="ml-3 text-xs underline">dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'articles'
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Articles
        </button>
        <button
          onClick={() => setActiveTab('effectiveness')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'effectiveness'
              ? 'bg-white dark:bg-gray-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Effectiveness
        </button>
      </div>

      {activeTab === 'effectiveness' && (
        <div className="space-y-6">
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass border-0">
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : metricsError ? (
            <Card className="glass border-0">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-4" />
                <p className="text-muted-foreground">{metricsError}</p>
                <Button onClick={fetchMetrics} variant="outline" className="mt-4 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : metrics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Search className="h-4 w-4" />
                      <span className="text-sm">Total Searches</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{metrics.summary.total_searches.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Last {metrics.period_days} days</p>
                  </CardContent>
                </Card>
                <Card className="glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Coverage Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{metrics.summary.coverage_rate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Queries with relevant articles</p>
                  </CardContent>
                </Card>
                <Card className="glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm">KB Articles</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{metrics.summary.total_kb_articles}</p>
                    <p className="text-xs text-muted-foreground mt-1">Avg similarity: {metrics.summary.avg_similarity}%</p>
                  </CardContent>
                </Card>
                <Card className="glass border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Widget Deflections</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{metrics.summary.widget_high_confidence}</p>
                    <p className="text-xs text-muted-foreground mt-1">of {metrics.summary.widget_searches} widget searches</p>
                  </CardContent>
                </Card>
              </div>

              {/* Search by Source */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass border-0">
                  <CardHeader>
                    <CardTitle className="text-base">Searches by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(metrics.search_by_source)
                        .sort(([, a], [, b]) => b - a)
                        .map(([source, count]) => {
                          const pct = metrics.summary.total_searches > 0
                            ? Math.round((count / metrics.summary.total_searches) * 100)
                            : 0
                          return (
                            <div key={source}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-foreground capitalize">{source.replace(/_/g, ' ')}</span>
                                <span className="text-muted-foreground">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary-500 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      {Object.keys(metrics.search_by_source).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No search data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Articles */}
                <Card className="glass border-0">
                  <CardHeader>
                    <CardTitle className="text-base">Most Matched Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {metrics.top_articles.map((article, i) => (
                        <div key={article.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span className="text-sm font-medium text-muted-foreground w-6 text-right">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{article.title}</p>
                            {article.category && (
                              <Badge variant="secondary" className="text-[10px] mt-0.5">{article.category}</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">{article.match_count} matches</Badge>
                        </div>
                      ))}
                      {metrics.top_articles.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No article data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coverage Gaps */}
              <Card className="glass border-0">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Coverage Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Queries where no KB article matched above 60% similarity. Consider adding articles for these topics.
                  </p>
                  {metrics.coverage_gaps.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {metrics.coverage_gaps.map((gap, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                          <Search className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm text-foreground truncate flex-1">{gap.query}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant="outline" className="text-[10px]">{gap.count}x</Badge>
                            <span className="text-xs text-muted-foreground">{Math.round(gap.top_similarity * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No coverage gaps detected</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'articles' && <>
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search knowledge base..."
            className="pl-10 pr-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {searchQuery && (
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          )}
        </div>

        {/* Category Filter Dropdown */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      {!isSearchMode && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            All ({documents.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {cat} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      )}

      {/* Search Results (ranked list) */}
      {isSearchMode ? (
        isSearching ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="glass border-0">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-6 w-6 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults.length === 0 ? (
          <Card className="glass border-0">
            <CardContent className="py-12 text-center">
              <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">
                Try different keywords or check your spelling
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {searchResults.map((result, index) => (
              <Card key={result.id} className="glass border-0 hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <span className="text-sm font-bold text-muted-foreground/60 w-6 text-right pt-0.5 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {result.category && (
                          <Badge variant="secondary" className="text-[10px]">{result.category}</Badge>
                        )}
                        {result.source_file && (
                          <span className="text-[10px] font-mono text-muted-foreground">{result.source_file}</span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-foreground">{result.title}</h4>
                      {result.section_path && (
                        <p className="text-xs text-muted-foreground mt-0.5">{result.section_path}</p>
                      )}
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-li:m-0">
                        <ReactMarkdown>{result.content}</ReactMarkdown>
                      </div>
                    </div>
                    {result.similarity > 0 && (
                      <Badge className={`text-[10px] flex-shrink-0 ${similarityColor(result.similarity)}`}>
                        {Math.round(result.similarity * 100)}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Browse Mode */
        <>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="glass border-0">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-20 mb-2" />
                    <Skeleton className="h-6 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="glass border-0">
              <CardContent className="py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Failed to load articles
                </h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={fetchArticles}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : filteredDocuments.length === 0 && filteredManualArticles.length === 0 ? (
            <Card className="glass border-0">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">
                  <BookOpen className="w-14 h-14 text-muted-foreground/30 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No articles found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {categoryFilter !== 'all'
                    ? 'Try a different category or sync the knowledge base'
                    : 'Get started by syncing the knowledge base or adding an article'}
                </p>
                {categoryFilter === 'all' && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => setIngestDialogOpen(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Sync Knowledge Base
                    </Button>
                    <Button
                      onClick={handleCreateNew}
                      className="bg-primary-600 hover:bg-primary-700 text-white"
                    >
                      + Add Article
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KB Documents Grid */}
              {filteredDocuments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <Card
                      key={doc.source_file}
                      className="glass border-0 hover:shadow-lg transition-all cursor-pointer group relative hover-lift"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <CardHeader className="pb-2">
                        {doc.category && (
                          <Badge variant="secondary" className="w-fit text-xs mb-2">
                            {doc.category}
                          </Badge>
                        )}
                        <CardTitle className="text-base leading-snug text-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                          {doc.display_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-li:m-0">
                          <ReactMarkdown>{doc.first_content}</ReactMarkdown>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                            <Hash className="w-3 h-3" />
                            {doc.chunks.length} sections
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/50">
                            {doc.source_file}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Manual Articles Section */}
              {filteredManualArticles.length > 0 && (
                <>
                  {filteredDocuments.length > 0 && (
                    <div className="flex items-center gap-3 pt-4">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Manual Articles</h2>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredManualArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="glass border-0 hover:shadow-lg transition-all cursor-pointer group relative hover-lift"
                        onClick={() => handleEdit(article)}
                      >
                        <CardHeader className="pb-2">
                          {article.category && (
                            <Badge variant="secondary" className="w-fit text-xs mb-2">
                              {article.category}
                            </Badge>
                          )}
                          <CardTitle className="text-base leading-snug pr-8 text-foreground">
                            {article.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-li:m-0">
                            <ReactMarkdown>{article.content}</ReactMarkdown>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground/70">
                              {new Date(article.created_at).toLocaleDateString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={(e) => confirmDelete(article, e)}
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => { if (!open) setSelectedDocument(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              {selectedDocument?.display_name}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {selectedDocument?.category && (
                <Badge variant="secondary" className="text-[10px]">{selectedDocument.category}</Badge>
              )}
              <span className="font-mono text-[10px]">{selectedDocument?.source_file}</span>
              <span className="text-xs">{selectedDocument?.chunks.length} sections</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {selectedDocument?.chunks.map((chunk, i) => (
              <div key={chunk.id} className="space-y-1">
                {chunk.section_path && (
                  <h3 className="text-sm font-semibold text-foreground">
                    {chunk.section_path}
                  </h3>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-gray-100 prose-code:dark:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-gray-100 prose-pre:dark:bg-gray-800 prose-a:text-indigo-600 prose-a:dark:text-indigo-400">
                  <ReactMarkdown>{chunk.content}</ReactMarkdown>
                </div>
                {i < selectedDocument.chunks.length - 1 && (
                  <div className="pt-4 border-b border-gray-100 dark:border-gray-800" />
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Edit Article' : 'Create New Article'}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? 'Update the knowledge base article details below.'
                : 'Add a new article to help the AI provide better responses.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., How to start a live stream"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write the article content here. This will be used by the AI to provide helpful responses to customers..."
                rows={8}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formTitle.trim() || !formContent.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isSaving ? 'Saving...' : editingArticle ? 'Save Changes' : 'Create Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{articleToDelete?.title}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ingest Confirmation Dialog */}
      <Dialog open={ingestDialogOpen} onOpenChange={setIngestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Knowledge Base</DialogTitle>
            <DialogDescription>
              This will re-sync all Knowledge Base files. Existing KB-sourced chunks will be replaced with fresh content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIngestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIngest}
              className="bg-primary-600 hover:bg-primary-700 text-white gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>}
    </div>
  )
}
