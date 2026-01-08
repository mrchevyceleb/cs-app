'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, RefreshCw } from 'lucide-react'
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Knowledge Base
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage help articles for AI-powered responses ({total} articles)
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
        >
          + Add Article
        </Button>
      </div>

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
            <Card key={i} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
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
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to load articles
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
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
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No articles found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
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
              className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all cursor-pointer group relative hover-lift"
              onClick={() => handleEdit(article)}
            >
              <CardHeader className="pb-2">
                {article.category && (
                  <Badge variant="secondary" className="w-fit text-xs mb-2">
                    {article.category}
                  </Badge>
                )}
                <CardTitle className="text-base leading-snug pr-8">
                  {article.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                  {article.content}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
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
    </div>
  )
}
