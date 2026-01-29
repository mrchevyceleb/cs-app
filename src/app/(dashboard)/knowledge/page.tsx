'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw, BarChart3, BookOpen, Search, TrendingUp, AlertTriangle } from 'lucide-react'
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
  created_at: string
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

const CATEGORIES = [
  'Live Streaming',
  'Technical Support',
  'Commerce',
  'Account & Security',
  'Billing & Plans',
  'Gamification',
  'Integrations',
  'General',
]

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [total, setTotal] = useState(0)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  // Fetch articles
  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
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
  }, [searchQuery, categoryFilter])

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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArticles()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchArticles])

  // Open dialog for creating new article
  const handleCreateNew = () => {
    setEditingArticle(null)
    setFormTitle('')
    setFormContent('')
    setFormCategory('')
    setIsDialogOpen(true)
  }

  // Open dialog for editing article
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Knowledge Base
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage help articles for AI-powered responses ({total} articles)
          </p>
        </div>
        {activeTab === 'articles' && (
          <Button
            onClick={handleCreateNew}
            className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
          >
            + Add Article
          </Button>
        )}
      </div>

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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search articles..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>

        {/* Category Filter */}
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

      {/* Articles Grid */}
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
      ) : articles.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No articles found
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first knowledge base article'}
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <Button
                onClick={handleCreateNew}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                + Add Your First Article
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
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
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {article.content}
                </p>
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
      )}

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
      </>}
    </div>
  )
}

