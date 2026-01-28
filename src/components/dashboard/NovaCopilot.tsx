'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Sparkles, User, Bot, RefreshCw } from 'lucide-react'
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

export function NovaCopilot() {
  const { isOpen, close } = useNovaCopilot()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const initialized = useRef(false)
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Placeholder for assistant response while streaming
    const assistantMessageId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: assistantMessageId,
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
                // Keep streaming flow intact without altering content.
              } else if (data.type === 'error' && data.error) {
                assistantContent += `\n**Error:** ${data.error}\n`
              }

              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: assistantContent }
                  : msg
              ))
              
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: "I'm sorry, I encountered an error. Please try again." }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Chat history cleared. How else can I help you?",
        timestamp: new Date()
      }
    ])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-[400px] bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out slide-in-from-right">
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearChat} title="Clear Chat">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={close}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 overflow-hidden">
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
                "rounded-lg px-3 py-2 max-w-[80%]",
                message.role === 'user' 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-foreground"
              )}>
                <div
                  className={cn(
                    "whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none",
                    message.role === 'user'
                      ? "prose-invert text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-headings:text-primary-foreground prose-a:text-primary-foreground"
                      : "dark:prose-invert"
                  )}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
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
          <input
            ref={inputRef}
            className="flex-1 bg-muted/50 border border-input rounded-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ask Nova anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}
