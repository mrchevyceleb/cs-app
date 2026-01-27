'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Agent, ParsedMention } from '@/types/database'

interface AgentMentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange?: (mentions: ParsedMention[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minRows?: number
  maxRows?: number
}

export interface AgentMentionInputRef {
  focus: () => void
  blur: () => void
}

export const AgentMentionInput = forwardRef<AgentMentionInputRef, AgentMentionInputProps>(
  function AgentMentionInput(
    {
      value,
      onChange,
      onMentionsChange,
      placeholder = 'Type @ to mention an agent...',
      disabled = false,
      className,
      minRows = 2,
      maxRows = 6,
    },
    ref
  ) {
    const [agents, setAgents] = useState<Agent[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<Agent[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const suggestionsRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
    }))

    // Fetch agents on mount
    useEffect(() => {
      fetchAgents()
    }, [])

    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents')
        if (response.ok) {
          const data = await response.json()
          setAgents(data.agents || [])
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err)
      }
    }

    // Parse mentions from text
    const parseMentions = useCallback(
      (text: string): ParsedMention[] => {
        const mentions: ParsedMention[] = []
        const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
        let match

        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push({
            agentName: match[1],
            agentId: match[2],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          })
        }

        return mentions
      },
      []
    )

    // Notify parent of mention changes
    useEffect(() => {
      const mentions = parseMentions(value)
      onMentionsChange?.(mentions)
    }, [value, parseMentions, onMentionsChange])

    // Filter suggestions based on query
    useEffect(() => {
      if (mentionQuery) {
        const filtered = agents.filter((agent) =>
          agent.name.toLowerCase().includes(mentionQuery.toLowerCase())
        )
        setSuggestions(filtered)
        setSelectedIndex(0)
      } else {
        setSuggestions(agents)
      }
    }, [mentionQuery, agents])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart

      onChange(newValue)

      // Check if we're in a mention context
      const textBeforeCursor = newValue.slice(0, cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
        // Check if there's a space or newline between @ and cursor
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionStartIndex(lastAtIndex)
          setMentionQuery(textAfterAt)
          setShowSuggestions(true)
          return
        }
      }

      setShowSuggestions(false)
      setMentionStartIndex(null)
      setMentionQuery('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
        case 'Tab':
        case 'Enter':
          if (showSuggestions) {
            e.preventDefault()
            selectAgent(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          break
      }
    }

    const selectAgent = (agent: Agent) => {
      if (mentionStartIndex === null) return

      const cursorPosition = textareaRef.current?.selectionStart || value.length
      const textBefore = value.slice(0, mentionStartIndex)
      const textAfter = value.slice(cursorPosition)

      // Insert mention in the format @[Name](id)
      const mention = `@[${agent.name}](${agent.id})`
      const newValue = textBefore + mention + ' ' + textAfter

      onChange(newValue)
      setShowSuggestions(false)
      setMentionStartIndex(null)
      setMentionQuery('')

      // Move cursor to after the mention
      setTimeout(() => {
        const newCursorPosition = textBefore.length + mention.length + 1
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition)
        textareaRef.current?.focus()
      }, 0)
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const getStatusColor = (status: Agent['status']) => {
      switch (status) {
        case 'online':
          return 'bg-green-500'
        case 'away':
          return 'bg-amber-500'
        default:
          return 'bg-gray-400'
      }
    }

    // Render text with highlighted mentions
    const renderDisplayValue = (text: string) => {
      const parts: React.ReactNode[] = []
      let lastIndex = 0
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = mentionRegex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index))
        }
        // Add highlighted mention
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
          >
            @{match[1]}
          </span>
        )
        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }

      return parts
    }

    return (
      <div className={cn('relative', className)}>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'resize-none',
            minRows && `min-h-[${minRows * 24}px]`,
            maxRows && `max-h-[${maxRows * 24}px]`
          )}
          rows={minRows}
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mention an agent
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((agent, index) => (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={agent.avatar_url || ''} />
                      <AvatarFallback className="text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                        {getInitials(agent.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-gray-800',
                        getStatusColor(agent.status)
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {agent.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {agent.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-1.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <span className="text-[10px] text-gray-400">
                <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Tab</kbd> or{' '}
                <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to select
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }
)

// Helper component to display text with mention highlights
export function MentionText({ text, className }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      )
    }
    parts.push(
      <span
        key={`mention-${match.index}`}
        className="inline-flex items-center px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
      >
        @{match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return <span className={className}>{parts}</span>
}

// Extract plain mention names from text
export function extractMentionIds(text: string): string[] {
  const mentionIds: string[] = []
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentionIds.push(match[2])
  }

  return mentionIds
}
