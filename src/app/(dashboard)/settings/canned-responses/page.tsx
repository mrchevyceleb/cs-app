'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Hash,
  Users,
  User,
  FileText,
  Loader2,
  ArrowLeft,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import type { CannedResponse, CannedResponseCategory } from '@/types/database'
import { CANNED_RESPONSE_CATEGORIES, CATEGORY_COLORS } from '@/types/database'

interface FormData {
  title: string
  content: string
  shortcut: string
  category: CannedResponseCategory
  isShared: boolean
}

const defaultFormData: FormData = {
  title: '',
  content: '',
  shortcut: '',
  category: 'general',
  isShared: false,
}

export default function CannedResponsesPage() {
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CannedResponseCategory | 'all'>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<CannedResponse | null>(null)
  const [formData, setFormData] = useState<FormData>(defaultFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResponses = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)

      const response = await fetch(`/api/canned-responses?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setResponses(data.responses || [])
      }
    } catch (error) {
      console.error('Failed to fetch canned responses:', error)
    } finally {
      setIsLoading(false)
    }
  }, [search, selectedCategory])

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/canned-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData(defaultFormData)
        fetchResponses()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create canned response')
      }
    } catch (error) {
      console.error('Failed to create canned response:', error)
      setError('Failed to create canned response')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedResponse) return
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/canned-responses/${selectedResponse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setSelectedResponse(null)
        setFormData(defaultFormData)
        fetchResponses()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update canned response')
      }
    } catch (error) {
      console.error('Failed to update canned response:', error)
      setError('Failed to update canned response')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedResponse) return

    setIsSaving(true)

    try {
      const response = await fetch(`/api/canned-responses/${selectedResponse.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedResponse(null)
        fetchResponses()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete canned response')
      }
    } catch (error) {
      console.error('Failed to delete canned response:', error)
      setError('Failed to delete canned response')
    } finally {
      setIsSaving(false)
    }
  }

  const openEditDialog = (response: CannedResponse) => {
    setSelectedResponse(response)
    setFormData({
      title: response.title,
      content: response.content,
      shortcut: response.shortcut || '',
      category: response.category,
      isShared: response.agent_id === null,
    })
    setError(null)
    setShowEditDialog(true)
  }

  const openDeleteDialog = (response: CannedResponse) => {
    setSelectedResponse(response)
    setShowDeleteDialog(true)
  }

  const openCreateDialog = () => {
    setFormData(defaultFormData)
    setError(null)
    setShowCreateDialog(true)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Canned Responses
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage pre-written responses for quick replies
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Response
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/70">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search responses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as CannedResponseCategory | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CANNED_RESPONSE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Responses List */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Your Responses</CardTitle>
          <CardDescription>
            {responses.length} response{responses.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No canned responses found</p>
              <p className="text-sm text-gray-400 mt-1">
                {search || selectedCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first canned response to get started'}
              </p>
              {!search && selectedCategory === 'all' && (
                <Button
                  onClick={openCreateDialog}
                  className="mt-4 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Response
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {responses.map((response) => {
                  const colors = CATEGORY_COLORS[response.category]
                  const isShared = response.agent_id === null

                  return (
                    <div
                      key={response.id}
                      className={cn(
                        'p-4 border rounded-lg transition-colors',
                        'border-gray-200 dark:border-gray-700',
                        'hover:border-gray-300 dark:hover:border-gray-600',
                        'bg-white dark:bg-gray-800/50'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Category Indicator */}
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                          colors.bg
                        )}>
                          <FileText className={cn('h-5 w-5', colors.text)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {response.title}
                            </h3>
                            <Badge
                              className={cn(
                                'capitalize text-[10px] px-1.5 py-0',
                                colors.bg,
                                colors.text,
                                colors.border
                              )}
                              variant="outline"
                            >
                              {response.category}
                            </Badge>
                            {response.shortcut && (
                              <kbd className={cn(
                                'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono',
                                'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded',
                                'text-gray-600 dark:text-gray-400'
                              )}>
                                <Hash className="h-2.5 w-2.5" />
                                {response.shortcut}
                              </kbd>
                            )}
                            {isShared ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Users className="h-2.5 w-2.5 mr-0.5" />
                                Shared
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                <User className="h-2.5 w-2.5 mr-0.5" />
                                Personal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {response.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <BarChart3 className="h-3 w-3" />
                              Used {response.usage_count} time{response.usage_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            onClick={() => openEditDialog(response)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => openDeleteDialog(response)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Canned Response</DialogTitle>
            <DialogDescription>
              Create a new pre-written response for quick replies
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Welcome message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Type your response content..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shortcut">Shortcut</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, '') })}
                    placeholder="greet"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Type /shortcut to use</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as CannedResponseCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANNED_RESPONSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category} className="capitalize">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isShared"
                checked={formData.isShared}
                onCheckedChange={(checked) => setFormData({ ...formData, isShared: checked as boolean })}
              />
              <Label htmlFor="isShared" className="text-sm font-normal">
                Share with team (visible to all agents)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Response'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Canned Response</DialogTitle>
            <DialogDescription>
              Update this canned response
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Welcome message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Type your response content..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-shortcut">Shortcut</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-shortcut"
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, '') })}
                    placeholder="greet"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Type /shortcut to use</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as CannedResponseCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANNED_RESPONSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category} className="capitalize">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Canned Response</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedResponse?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

