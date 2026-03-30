'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Sparkles, User, Bot, RefreshCw, Mic, MicOff, GripVertical } from 'lucide-react'
import { useNovaCopilot } from '@/contexts/NovaCopilotContext'
import { NovaAvatar } from '@/components/shared/NovaAvatar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const MIN_PANEL_WIDTH = 360
const MAX_PANEL_WIDTH = 700
const DEFAULT_PANEL_WIDTH = 400

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionConstructor = new () => any

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return (
    (window as unknown as Record<string, unknown>).SpeechRecognition as SpeechRecognitionConstructor ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition as SpeechRecognitionConstructor ??
    null
  )
}

let msgCounter = 0

export function NovaCopilot() {
  const { isOpen, close } = useNovaCopilot()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)
  const isDragging = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const preVoiceInputRef = useRef('')
  const inputValueRef = useRef('')

  // Detect speech support on client only (avoids SSR hydration mismatch)
  useEffect(() => {
    setSpeechSupported(getSpeechRecognition() !== null)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom, isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Initial welcome message
  useEffect(() => {
    if (!initialized.current && messages.length === 0) {
      initialized.current = true
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Nova, your AI Copilot. I can help you look up tickets, analyze customer data, or draft responses. How can I assist you today?",
        timestamp: new Date()
      }])
    }
  }, [messages.length])

  // Keep inputValueRef in sync for voice input
  useEffect(() => {
    inputValueRef.current = input
  }, [input])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Clamp panel width when window resizes
  useEffect(() => {
    const handleWindowResize = () => {
      setPanelWidth(prev => Math.min(prev, window.innerWidth))
    }
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  // Panel resize via drag handle
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const maxAllowed = Math.min(MAX_PANEL_WIDTH, window.innerWidth)
      const newWidth = window.innerWidth - e.clientX
      setPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(maxAllowed, newWidth)))
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      // Clean up body styles in case unmount happens mid-drag
      if (isDragging.current) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // Voice input
  const toggleListening = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) return

    // Use ref to avoid stale closure race condition on rapid clicks
    if (isListeningRef.current && recognitionRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setIsListening(false)
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = navigator.language || 'en-US'

    // Capture existing input so voice appends rather than replacing
    preVoiceInputRef.current = inputValueRef.current

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Only process from resultIndex to avoid re-reading finalized results
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      const prefix = preVoiceInputRef.current
      setInput(prefix ? `${prefix} ${transcript}` : transcript)
    }

    recognition.onerror = () => {
      isListeningRef.current = false
      setIsListening(false)
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      isListeningRef.current = true
      setIsListening(true)
    } catch {
      // Microphone permission denied or recognition already running
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [])

  // Stop listening on close
  useEffect(() => {
    if (!isOpen && recognitionRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setIsListening(false)
    }
  }, [isOpen])

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Stop voice input if active
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
      isListeningRef.current = false
      setIsListening(false)
    }

    const msgId = `msg_${Date.now()}_${++msgCounter}`
    const assistantMsgId = `msg_${Date.now()}_${++msgCounter}`

    const userMessage: Message = {
      id: msgId,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Placeholder for assistant response while streaming
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }])

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      let assistantContent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep the last partial line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'text' && data.content) {
                assistantContent += data.content
              } else if (data.type === 'tool_start' && data.tool) {
                // Intentionally hide tool usage details from UI.
                continue
              } else if (data.type === 'error' && data.error) {
                assistantContent += `\n**Error:** ${data.error}\n`
              }

              setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                  ? { ...msg, content: assistantContent }
                  : msg
              ))

            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

      // Flush any remaining buffered data
      if (buffer.trim() && buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6))

          if (data.type === 'text' && data.content) {
            assistantContent += data.content
          } else if (data.type === 'error' && data.error) {
            assistantContent += `\n**Error:** ${data.error}\n`
          }

          setMessages(prev => prev.map(msg =>
            msg.id === assistantMsgId
              ? { ...msg, content: assistantContent }
              : msg
          ))
        } catch (e) {
          console.error('Error parsing final SSE data:', e)
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMsgId
          ? { ...msg, content: "I'm sorry, I encountered an error. Please try again." }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: `msg_${Date.now()}_${++msgCounter}`,
        role: 'assistant',
        content: "Chat history cleared. How else can I help you?",
        timestamp: new Date()
      }
    ])
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, close])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-y-0 right-0 max-w-full bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-[transform] duration-300 ease-in-out slide-in-from-right"
      style={{ width: panelWidth }}
      role="complementary"
      aria-label="Nova Copilot"
    >
      {/* Drag handle for resizing */}
      <div
        className="absolute inset-y-0 left-0 w-3 cursor-col-resize group transition-colors z-10 flex items-center justify-center hover:bg-primary/10 active:bg-primary/20"
        onMouseDown={handleDragStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={panelWidth}
        aria-valuemin={MIN_PANEL_WIDTH}
        aria-valuemax={MAX_PANEL_WIDTH}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setPanelWidth(prev => Math.min(MAX_PANEL_WIDTH, prev + 20))
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            setPanelWidth(prev => Math.max(MIN_PANEL_WIDTH, prev - 20))
          }
        }}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
      </div>

      {/* Header */}
      <div className="p-4 border-b border-border/60 bg-sidebar flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NovaAvatar size="sm" />
          <div>
            <h3 className="font-semibold text-sm">Nova Copilot</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              AI Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearChat} aria-label="Clear chat history">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={close} aria-label="Close Nova Copilot">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden" aria-live="polite" aria-relevant="additions">
        <div className="space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 text-sm",
                message.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "rounded-lg px-3 py-2 min-w-0",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground max-w-[85%]"
                  : "bg-muted text-foreground max-w-[95%]"
              )}>
                <div
                  className={cn(
                    "leading-normal prose prose-sm max-w-none break-words prose-p:mt-3 prose-p:mb-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-4 prose-headings:mb-1 prose-hr:my-3 prose-blockquote:my-2 prose-pre:my-2 prose-pre:overflow-x-auto prose-strong:font-semibold [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                    message.role === 'user'
                      ? "prose-invert text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-headings:text-primary-foreground prose-a:text-primary-foreground"
                      : "dark:prose-invert"
                  )}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.role === 'assistant' && message.content === '' && (
                   <span className="flex gap-1 items-center mt-1 h-4">
                     <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                     <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                     <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                   </span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-background">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 bg-muted/50 border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto"
            placeholder="Ask Nova anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            disabled={isLoading || isListening}
            rows={1}
            style={{ maxHeight: 120 }}
            aria-label="Message Nova"
          />
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "default" : "outline"}
              onClick={toggleListening}
              disabled={isLoading}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              className={cn(
                isListening && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className={cn("text-[10px] text-muted-foreground mt-1.5 px-1 transition-opacity", inputFocused ? "opacity-100" : "opacity-0")}>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
