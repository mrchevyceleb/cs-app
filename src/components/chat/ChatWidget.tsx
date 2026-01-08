'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  confidence?: number
}

interface ChatWidgetProps {
  customerName?: string
  customerEmail?: string
  language?: string
}

export default function ChatWidget({
  customerName,
  customerEmail,
  language = 'en'
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [showEscalationNotice, setShowEscalationNotice] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = customerName
        ? `Hi ${customerName}! I'm R-Link's AI assistant. How can I help you today?`
        : "Hi! I'm R-Link's AI assistant. How can I help you today?"

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
        confidence: 1.0
      }])
    }
  }, [isOpen, messages.length, customerName])

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          ticketId: ticketId,
          customerName: customerName,
          customerEmail: customerEmail,
          language: language,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()

      if (data.ticketId) {
        setTicketId(data.ticketId)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        confidence: data.confidence
      }

      setMessages(prev => [...prev, assistantMessage])

      // Check if escalation was triggered
      if (data.shouldEscalate) {
        setShowEscalationNotice(true)
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: "I'm connecting you with a human support agent who can help you further. They'll be with you shortly!",
            timestamp: new Date(),
            confidence: 1.0
          }])
        }, 1000)
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const requestHuman = () => {
    setShowEscalationNotice(true)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: "No problem! I'm connecting you with a human support agent. They'll be with you shortly. In the meantime, feel free to provide any additional details about your issue.",
      timestamp: new Date(),
      confidence: 1.0
    }])
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed sm:absolute inset-4 sm:inset-auto sm:bottom-16 sm:right-0 sm:w-[380px] sm:h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 scale-enter">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative">
                <Bot className="w-6 h-6" />
                {/* Animated ring when AI is working */}
                {isLoading && (
                  <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">R-Link Support</h3>
                <p className="text-xs text-purple-100 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-powered assistance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Escalation Notice */}
          {showEscalationNotice && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
              <User className="w-4 h-4" />
              <span>Human agent notified • Avg wait: 2 min</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 message-enter ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.confidence && message.confidence < 0.7 && !showEscalationNotice && (
                    <button
                      onClick={requestHuman}
                      className="text-xs text-purple-600 hover:text-purple-700 mt-1.5 flex items-center gap-1 underline"
                    >
                      <User className="w-3 h-3" />
                      Talk to a human instead
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100 rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Powered by R-Link AI
            </p>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Notification Badge */}
      {!isOpen && messages.length === 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full new-item-pulse" />
      )}
    </div>
  )
}
