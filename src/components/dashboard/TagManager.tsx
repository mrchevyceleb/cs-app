'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tag, X, Plus } from 'lucide-react'

interface TagManagerProps {
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  trigger?: React.ReactNode
}

const TAG_SUGGESTIONS = [
  'billing',
  'technical',
  'feature-request',
  'bug',
  'urgent',
  'vip',
  'onboarding',
  'integration',
]

export function TagManager({
  tags,
  onAddTag,
  onRemoveTag,
  trigger,
}: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions based on input and exclude already added tags
  const filteredSuggestions = TAG_SUGGESTIONS.filter(
    (suggestion) =>
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  )

  // Also show custom tag option if input doesn't match any suggestion exactly
  const showCustomOption =
    inputValue.trim() &&
    !tags.includes(inputValue.trim().toLowerCase()) &&
    !TAG_SUGGESTIONS.includes(inputValue.trim().toLowerCase())

  const allOptions = showCustomOption
    ? [inputValue.trim().toLowerCase(), ...filteredSuggestions]
    : filteredSuggestions

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  // Reset state when popover closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('')
      setHighlightedIndex(-1)
    }
  }, [isOpen])

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase()
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onAddTag(normalizedTag)
      setInputValue('')
      setHighlightedIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
        handleAddTag(allOptions[highlightedIndex])
      } else if (inputValue.trim()) {
        handleAddTag(inputValue)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < allOptions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-1.5">
      <Tag className="h-4 w-4" />
      Manage Tags
    </Button>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{trigger || defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Ticket Tags
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tags.length} tag{tags.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Current Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => onRemoveTag(tag)}
                >
                  {tag}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Add a tag..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setHighlightedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              className="pr-8"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* Suggestions */}
          {allOptions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {inputValue ? 'Matching tags' : 'Suggested tags'}
              </p>
              <div className="flex flex-wrap gap-1">
                {allOptions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => handleAddTag(suggestion)}
                    className={`
                      text-xs px-2 py-1 rounded-md transition-colors
                      ${
                        index === highlightedIndex
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Plus className="h-3 w-3 inline-block mr-1" />
                    {suggestion}
                    {showCustomOption && index === 0 && (
                      <span className="ml-1 text-gray-400">(new)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {tags.length === 0 && !inputValue && (
            <p className="text-xs text-gray-400 text-center py-2">
              No tags yet. Add tags to organize this ticket.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
