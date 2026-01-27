'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  BookMarked,
  Search,
  Hash,
  Users,
  User,
  Loader2,
  FileText,
} from 'lucide-react'
import type { CannedResponse, CannedResponseCategory } from '@/types/database'
import { CANNED_RESPONSE_CATEGORIES, CATEGORY_COLORS } from '@/types/database'

interface CannedResponsePickerProps {
  onSelect: (content: string) => void
  disabled?: boolean
}

export function CannedResponsePicker({
  onSelect,
  disabled = false,
}: CannedResponsePickerProps) {
  const [open, setOpen] = useState(false)
  const [responses, setResponses] = useState<CannedResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CannedResponseCategory | null>(null)

  const fetchResponses = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (selectedCategory) params.set('category', selectedCategory)

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
    if (open) {
      fetchResponses()
    }
  }, [open, fetchResponses])

  const handleSelect = async (response: CannedResponse) => {
    onSelect(response.content)
    setOpen(false)
    setSearch('')
    setSelectedCategory(null)

    // Increment usage count
    try {
      await fetch(`/api/canned-responses/${response.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementUsage: true }),
      })
    } catch (error) {
      console.error('Failed to increment usage count:', error)
    }
  }

  const groupedResponses = useMemo(() => {
    const grouped: Record<CannedResponseCategory, CannedResponse[]> = {} as Record<CannedResponseCategory, CannedResponse[]>
    CANNED_RESPONSE_CATEGORIES.forEach((cat) => {
      grouped[cat] = []
    })
    responses.forEach((response) => {
      const category = response.category as CannedResponseCategory
      if (grouped[category]) {
        grouped[category].push(response)
      } else {
        grouped['general'].push(response)
      }
    })
    return grouped
  }, [responses])

  const hasResponses = responses.length > 0
  const categoriesToShow = selectedCategory
    ? [selectedCategory]
    : CANNED_RESPONSE_CATEGORIES.filter((cat) => groupedResponses[cat].length > 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          disabled={disabled}
          title="Insert canned response"
        >
          <BookMarked className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        className="w-[400px] p-0"
        sideOffset={8}
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <BookMarked className="h-4 w-4 text-primary-600" />
              <span className="font-medium text-sm">Canned Responses</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search responses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <div className="flex gap-1">
              <Button
                variant={selectedCategory === null ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs shrink-0"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {CANNED_RESPONSE_CATEGORIES.map((category) => {
                const colors = CATEGORY_COLORS[category]
                return (
                  <Button
                    key={category}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-6 px-2 text-xs capitalize shrink-0',
                      selectedCategory === category && `${colors.bg} ${colors.text}`
                    )}
                    onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                  >
                    {category}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Response List */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !hasResponses ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-gray-500 dark:text-gray-400">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No canned responses found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? 'Try a different search' : 'Create one in Settings'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {categoriesToShow.map((category) => {
                  const items = groupedResponses[category]
                  if (items.length === 0) return null
                  const colors = CATEGORY_COLORS[category]

                  return (
                    <div key={category} className="mb-3 last:mb-0">
                      <div className={cn(
                        'text-xs font-medium px-2 py-1 mb-1 capitalize rounded',
                        colors.bg,
                        colors.text
                      )}>
                        {category}
                      </div>
                      <div className="space-y-1">
                        {items.map((response) => (
                          <button
                            key={response.id}
                            onClick={() => handleSelect(response)}
                            className={cn(
                              'w-full text-left p-2 rounded-md transition-colors',
                              'hover:bg-gray-100 dark:hover:bg-gray-800',
                              'focus:outline-none focus:ring-2 focus:ring-primary-500/20'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {response.title}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
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
                                {response.agent_id === null ? (
                                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                    <Users className="h-2.5 w-2.5 mr-0.5" />
                                    Shared
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                    <User className="h-2.5 w-2.5 mr-0.5" />
                                    Mine
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {response.content}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
              Type <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[9px]">/shortcut</kbd> in the message box for quick access
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Hook for shortcut detection in input
export function useCannedResponseShortcut(
  inputValue: string,
  onMatch: (content: string) => void
) {
  const [suggestions, setSuggestions] = useState<CannedResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Detect /shortcut pattern
  const shortcutMatch = inputValue.match(/\/(\w+)$/)
  const currentShortcut = shortcutMatch ? shortcutMatch[1] : null

  useEffect(() => {
    if (!currentShortcut) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/canned-responses?search=${currentShortcut}`)
        if (response.ok) {
          const data = await response.json()
          // Filter to only show responses with shortcuts that match
          const matching = (data.responses || []).filter((r: CannedResponse) =>
            r.shortcut?.toLowerCase().includes(currentShortcut.toLowerCase())
          )
          setSuggestions(matching.slice(0, 5))
          setShowSuggestions(matching.length > 0)
        }
      } catch (error) {
        console.error('Failed to fetch shortcut suggestions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchSuggestions, 150)
    return () => clearTimeout(debounce)
  }, [currentShortcut])

  const selectSuggestion = useCallback(async (response: CannedResponse) => {
    // Replace the /shortcut with the content
    const newValue = inputValue.replace(/\/\w+$/, response.content)
    onMatch(newValue)
    setShowSuggestions(false)

    // Increment usage count
    try {
      await fetch(`/api/canned-responses/${response.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incrementUsage: true }),
      })
    } catch (error) {
      console.error('Failed to increment usage count:', error)
    }
  }, [inputValue, onMatch])

  const dismissSuggestions = useCallback(() => {
    setShowSuggestions(false)
  }, [])

  return {
    suggestions,
    isLoading,
    showSuggestions,
    selectSuggestion,
    dismissSuggestions,
    currentShortcut,
  }
}
