'use client'

import { useRef, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { ConfidenceScore } from './ConfidenceScore'
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react'
import type { TicketWithCustomer } from './TicketCard'
import type { Message } from '@/types/database'

interface TicketDetailProps {
  ticket: TicketWithCustomer
  messages: Message[]
  onSendMessage: (content: string) => void
  onUpdateTicket: (updates: Partial<TicketWithCustomer>) => void
}

const statusOptions = [
  { value: 'open', label: 'Open', icon: Clock, color: 'text-blue-500' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-500' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-500' },
  { value: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'text-red-500' },
]

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TicketDetail({
  ticket,
  messages,
  onSendMessage,
  onUpdateTicket,
}: TicketDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isAiTyping, setIsAiTyping] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStatusChange = (status: string) => {
    onUpdateTicket({ status: status as TicketWithCustomer['status'] })
  }

  const handlePriorityChange = (priority: string) => {
    onUpdateTicket({ priority: priority as TicketWithCustomer['priority'] })
  }

  const handleResolve = () => {
    onUpdateTicket({ status: 'resolved' })
  }

  const handleEscalate = () => {
    onUpdateTicket({ status: 'escalated', ai_handled: false })
  }

  return (
    <Card className="h-full flex flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
      {/* Ticket Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Status Select */}
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[100px] sm:w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className={`h-3.5 w-3.5 ${option.color}`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Select */}
          <Select value={ticket.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[90px] sm:w-28 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* AI Confidence - hidden on small screens */}
          {ticket.ai_confidence !== null && (
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-md">
              <Sparkles className="h-3.5 w-3.5 text-primary-500" />
              <ConfidenceScore value={ticket.ai_confidence} size="sm" />
            </div>
          )}

          {/* AI Handled Badge - hidden on small screens */}
          {ticket.ai_handled && (
            <Badge variant="secondary" className="hidden sm:inline-flex bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              AI Handling
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEscalate}
            className="text-amber-600 border-amber-300 hover:bg-amber-50 flex-1 sm:flex-none"
          >
            <AlertTriangle className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Escalate</span>
          </Button>
          <Button
            size="sm"
            onClick={handleResolve}
            className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
          >
            <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Resolve</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyMessages />
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              customerName={ticket.customer?.name || 'Customer'}
            />
          ))
        )}

        {/* Typing Indicator */}
        {isAiTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <TypingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <QuickSuggestions onSelect={onSendMessage} />

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <ChatInput onSend={onSendMessage} />
      </div>
    </Card>
  )
}

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Sparkles className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
        No messages yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Start the conversation or wait for the customer to respond
      </p>
    </div>
  )
}

function QuickSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const suggestions = [
    "I'll look into this right away!",
    "Thank you for contacting R-Link support.",
    "Could you please provide more details?",
    "Let me check your account information.",
  ]

  return (
    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500 mb-2">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
