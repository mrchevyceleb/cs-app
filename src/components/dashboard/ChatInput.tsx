'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTicketTyping, formatTypingIndicator } from '@/contexts/RealtimeContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Send,
  Paperclip,
  Smile,
  Sparkles,
  Keyboard,
  ChevronDown,
  Headphones,
  Loader2,
  AlertCircle,
  Check,
  X,
  Lock,
  LockOpen,
  Hash,
} from 'lucide-react'
import { CannedResponsePicker, useCannedResponseShortcut } from './CannedResponsePicker'
import { FileChip, type UploadedFile } from './FileUpload'
import { extractMentionIds } from './AgentMentionInput'

// Supported file types
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 5

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

interface ChatInputProps {
  ticketId?: string
  onSend: (content: string, senderType: 'agent' | 'ai', isInternal?: boolean, attachmentIds?: string[], mentionedAgentIds?: string[]) => void
  placeholder?: string
  disabled?: boolean
  isSending?: boolean
  error?: string | null
  onRetry?: () => void
  onClearError?: () => void
  // Typing indicator props
  currentAgentId?: string
  currentAgentName?: string
}

function isValidFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }
  }

  const isValidType = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOCUMENT_TYPES].includes(file.type)
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const isValidExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension)

  if (!isValidType && !isValidExtension) {
    return { valid: false, error: 'Unsupported file type' }
  }

  return { valid: true }
}

export function ChatInput({
  ticketId,
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  isSending = false,
  error,
  onRetry,
  onClearError,
  currentAgentId,
  currentAgentName,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [sendMode, setSendMode] = useState<'agent' | 'ai'>('agent')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Typing indicator integration
  const { typingUsers, startTyping, stopTyping } = useTicketTyping(ticketId)
  const typingIndicatorText = useMemo(() => formatTypingIndicator(typingUsers), [typingUsers])

  // Handle typing indicator on message change
  useEffect(() => {
    if (!ticketId || !currentAgentId || !message.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      if (currentAgentId) {
        stopTyping(currentAgentId, 'agent')
      }
      return
    }

    // Broadcast typing
    startTyping(currentAgentId, 'agent', currentAgentName)

    // Debounce stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(currentAgentId, 'agent')
    }, 3000)

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [message, ticketId, currentAgentId, currentAgentName, startTyping, stopTyping])

  // Canned response shortcut hook
  const handleShortcutMatch = useCallback((newValue: string) => {
    setMessage(newValue)
  }, [])

  const {
    suggestions: shortcutSuggestions,
    showSuggestions,
    selectSuggestion,
    dismissSuggestions,
    currentShortcut,
  } = useCannedResponseShortcut(message, handleShortcutMatch)

  // Clamp selected index to valid range when suggestions change
  const clampedSuggestionIndex = shortcutSuggestions.length > 0
    ? Math.min(selectedSuggestionIndex, shortcutSuggestions.length - 1)
    : 0

  // Handle canned response selection from picker
  const handleCannedResponseSelect = useCallback((content: string) => {
    setMessage((prev) => prev + content)
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  // Upload a single file
  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`
    const previewUrl = ACCEPTED_IMAGE_TYPES.includes(file.type)
      ? URL.createObjectURL(file)
      : undefined

    const uploadedFile: UploadedFile = {
      id: tempId,
      file,
      url: '',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'uploading',
      progress: 0,
      previewUrl,
    }

    if (!ticketId) {
      return {
        ...uploadedFile,
        status: 'error',
        error: 'No ticket context for upload',
      }
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ticketId', ticketId)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()

      return {
        ...uploadedFile,
        id: data.id,
        url: data.url,
        status: 'completed',
        progress: 100,
      }
    } catch (err) {
      return {
        ...uploadedFile,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      }
    }
  }, [ticketId])

  // Handle file selection
  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList)
    const remainingSlots = MAX_FILES - attachments.length
    const filesToUpload = newFiles.slice(0, remainingSlots)

    if (filesToUpload.length === 0) return

    // Validate files first
    const validatedFiles: { file: File; error?: string }[] = filesToUpload.map(file => {
      const validation = isValidFile(file)
      return { file, error: validation.error }
    })

    // Add files to state as uploading
    const newUploadedFiles: UploadedFile[] = validatedFiles.map(({ file, error: fileError }) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      file,
      url: '',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: fileError ? 'error' as const : 'uploading' as const,
      progress: fileError ? 0 : 10,
      error: fileError,
      previewUrl: ACCEPTED_IMAGE_TYPES.includes(file.type)
        ? URL.createObjectURL(file)
        : undefined,
    }))

    setAttachments(prev => [...prev, ...newUploadedFiles])

    // Upload valid files
    const uploadPromises = validatedFiles
      .filter(({ error: fileError }) => !fileError)
      .map(({ file }) => uploadFile(file))

    const results = await Promise.all(uploadPromises)

    // Update state with results
    setAttachments(prevFiles => {
      const uploadingIds = newUploadedFiles
        .filter(f => f.status === 'uploading')
        .map(f => f.id)
      const nonUploadingFiles = prevFiles.filter(f => !uploadingIds.includes(f.id))
      const errorFiles = newUploadedFiles.filter(f => f.status === 'error')
      return [...nonUploadingFiles, ...errorFiles, ...results]
    })
  }, [attachments.length, uploadFile])

  // Handle attachment button click
  const handleAttachClick = useCallback(() => {
    if (!disabled && !isSending && ticketId) {
      fileInputRef.current?.click()
    }
  }, [disabled, isSending, ticketId])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      // Reset input so the same file can be selected again
      e.target.value = ''
    }
  }, [handleFiles])

  // Remove an attachment
  const removeAttachment = useCallback(async (fileId: string) => {
    const fileToRemove = attachments.find(f => f.id === fileId)

    // Cleanup preview URL
    if (fileToRemove?.previewUrl) {
      URL.revokeObjectURL(fileToRemove.previewUrl)
    }

    // If file was uploaded, delete from server
    if (fileToRemove && fileToRemove.status === 'completed' && !fileToRemove.id.startsWith('temp_')) {
      try {
        await fetch(`/api/upload?id=${fileToRemove.id}`, {
          method: 'DELETE',
        })
      } catch (err) {
        console.error('Failed to delete file:', err)
      }
    }

    setAttachments(prev => prev.filter(f => f.id !== fileId))
  }, [attachments])

  // Check if we can send
  const canSend = (message.trim() || attachments.some(a => a.status === 'completed')) &&
    !disabled &&
    !isSending &&
    !attachments.some(a => a.status === 'uploading')

  const handleSend = useCallback(() => {
    if (!canSend) return

    // Get completed attachment IDs
    const attachmentIds = attachments
      .filter(a => a.status === 'completed' && !a.id.startsWith('temp_'))
      .map(a => a.id)

    // Extract @mentions from internal notes
    const mentionedAgentIds = isInternalNote ? extractMentionIds(message) : []

    onSend(
      message.trim(),
      sendMode,
      isInternalNote,
      attachmentIds.length > 0 ? attachmentIds : undefined,
      mentionedAgentIds.length > 0 ? mentionedAgentIds : undefined
    )
    setMessage('')
    setAttachments([])
    setIsExpanded(false)
    // Reset internal note mode after sending
    if (isInternalNote) {
      setIsInternalNote(false)
    }
  }, [canSend, message, sendMode, isInternalNote, attachments, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle shortcut suggestions navigation
    if (showSuggestions && shortcutSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev < shortcutSuggestions.length - 1 ? prev + 1 : 0
        )
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : shortcutSuggestions.length - 1
        )
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        selectSuggestion(shortcutSuggestions[clampedSuggestionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissSuggestions()
        return
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Check if attachments are available (ticketId exists)
  const attachmentsEnabled = !!ticketId
  const hasReachedFileLimit = attachments.length >= MAX_FILES

  return (
    <div className="space-y-2 relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isSending || !attachmentsEnabled}
      />

      {/* Shortcut Suggestions Dropdown */}
      {showSuggestions && shortcutSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Canned responses matching <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">/{currentShortcut}</kbd>
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {shortcutSuggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  'w-full text-left px-3 py-2 transition-colors',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  index === clampedSuggestionIndex && 'bg-primary-50 dark:bg-primary-900/20'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {suggestion.title}
                  </span>
                  {suggestion.shortcut && (
                    <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-400 shrink-0">
                      <Hash className="h-2.5 w-2.5" />
                      {suggestion.shortcut}
                    </kbd>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {suggestion.content}
                </p>
              </button>
            ))}
          </div>
          <div className="p-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-[10px] text-gray-400">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Tab</kbd> or{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to select,{' '}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to dismiss
            </span>
          </div>
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2">
          {attachments.map(file => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => removeAttachment(file.id)}
              disabled={disabled || isSending}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-2 p-2 rounded-xl transition-all duration-200 border shadow-sm',
          isInternalNote
            ? 'border-amber-200 bg-amber-50/80 dark:bg-amber-900/20 dark:border-amber-800'
            : 'border-indigo-100 dark:border-slate-700 bg-gradient-to-r from-white via-indigo-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900',
          isInternalNote
            ? 'focus-within:ring-2 focus-within:ring-amber-500/20'
            : 'focus-within:ring-2 focus-within:ring-primary-500/10 focus-within:border-primary-400/50',
          (disabled || isSending) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Attachment Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 transition-colors',
                  attachments.length > 0
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                )}
                disabled={disabled || isSending || !attachmentsEnabled || hasReachedFileLimit}
                onClick={handleAttachClick}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!attachmentsEnabled
                ? 'Select a ticket to attach files'
                : hasReachedFileLimit
                  ? `Max ${MAX_FILES} files`
                  : 'Attach file'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Text Input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          disabled={disabled || isSending}
          data-chat-input="true"
          className={cn(
            'flex-1 resize-none border-0 shadow-none focus-visible:ring-0 p-0',
                        'min-h-[36px] max-h-[120px]',
                        'text-sm placeholder:text-muted-foreground'
                      )
                    }
          rows={1}
        />

        {/* Canned Response Picker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <CannedResponsePicker
                  onSelect={handleCannedResponseSelect}
                  disabled={disabled || isSending}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>Insert canned response</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Emoji Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                disabled={disabled || isSending}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add emoji</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Internal Note Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isInternalNote ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 shrink-0 transition-colors',
                  isInternalNote
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                )}
                disabled={disabled || isSending}
                onClick={() => setIsInternalNote(!isInternalNote)}
              >
                {isInternalNote ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <LockOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isInternalNote ? 'Internal note (click to disable)' : 'Add internal note'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Send Button with Mode Dropdown */}
        <div className="flex shrink-0">
          {/* Main Send Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-r-none',
                    canSend
                      ? sendMode === 'ai'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : sendMode === 'ai' ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {sendMode === 'ai' ? 'Send as AI' : 'Send as Agent'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mode Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                disabled={disabled || isSending}
                className={cn(
                  'h-8 w-6 rounded-l-none border-l-0 px-1',
                  canSend
                    ? sendMode === 'ai'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600'
                      : 'bg-primary-600 hover:bg-primary-700 text-white border-primary-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 border-gray-200 dark:border-gray-600'
                )}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setSendMode('agent')}
                className="flex items-center gap-2"
              >
                <Headphones className="h-4 w-4" />
                <span className="flex-1">Send as Agent</span>
                {sendMode === 'agent' && <Check className="h-4 w-4 text-primary-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSendMode('ai')}
                className="flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span className="flex-1">Send as AI</span>
                {sendMode === 'ai' && <Check className="h-4 w-4 text-purple-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-red-700 dark:text-red-300 hover:underline font-medium"
            >
              Retry
            </button>
          )}
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Typing Indicator */}
      {typingIndicatorText && (
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{typingIndicatorText}</span>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isExpanded && !error && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            {isInternalNote ? (
              <>
                <Lock className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500 font-medium">Internal Note - Not visible to customer</span>
              </>
            ) : sendMode === 'ai' ? (
              <>
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span className="text-purple-500">Sending as AI</span>
              </>
            ) : (
              <>
                <Headphones className="h-3 w-3" />
                <span>Sending as Agent</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Keyboard className="h-3 w-3" />
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Enter</kbd> to send,{' '}
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">Shift+Enter</kbd> for new line
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
