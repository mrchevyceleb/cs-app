'use client'

import { useRef, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  UserPlus,
  UserMinus,
  User,
  Copy,
  ExternalLink,
  Tag,
  Trash2,
  Archive,
} from 'lucide-react'
import type { TicketWithCustomer } from './TicketCard'
import type { Message } from '@/types/database'

interface TicketDetailProps {
  ticket: TicketWithCustomer
  messages: Message[]
  onSendMessage: (content: string, senderType: 'agent' | 'ai') => void
  onUpdateTicket: (updates: Partial<TicketWithCustomer>) => void
  currentAgentId?: string | null
  isSending?: boolean
  sendError?: string | null
  onRetry?: () => void
  onClearError?: () => void
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TicketDetail({
  ticket,
  messages,
  onSendMessage,
  onUpdateTicket,
  currentAgentId,
  isSending,
  sendError,
  onRetry,
  onClearError,
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

  const handleAssignToMe = () => {
    if (currentAgentId) {
      onUpdateTicket({ assigned_agent_id: currentAgentId })
    }
  }

  const handleUnassign = () => {
    onUpdateTicket({ assigned_agent_id: null })
  }

  const isAssignedToMe = ticket.assigned_agent_id === currentAgentId
  const isAssigned = !!ticket.assigned_agent_id

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
            <SelectContent position="popper" sideOffset={4} className="z-[9999]">
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
            <SelectContent position="popper" sideOffset={4} className="z-[9999]">
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

          {/* Assigned Agent Badge - hidden on small screens */}
          {ticket.assigned_agent && (
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Avatar className="h-4 w-4">
                <AvatarImage src={ticket.assigned_agent.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-blue-200 dark:bg-blue-800">
                  {getInitials(ticket.assigned_agent.name || 'AG')}
                </AvatarFallback>
              </Avatar>
              {ticket.assigned_agent.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Assign/Unassign Button */}
          {currentAgentId && (
            isAssignedToMe ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassign}
                className="text-gray-600 border-gray-300 hover:bg-gray-50 flex-1 sm:flex-none"
              >
                <UserMinus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Unassign</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAssignToMe}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 flex-1 sm:flex-none"
              >
                <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{isAssigned ? 'Reassign to Me' : 'Assign to Me'}</span>
              </Button>
            )
          )}

          {/* Escalate Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 border-amber-300 hover:bg-amber-50 flex-1 sm:flex-none"
              >
                <AlertTriangle className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Escalate</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Escalate Ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will escalate the ticket to a human agent. The AI will stop handling this ticket and it will be marked as needing human attention.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEscalate}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Escalate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Resolve Button with Confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
              >
                <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Resolve</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resolve Ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the ticket as resolved. The customer will be notified that their issue has been addressed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResolve}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Resolve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 z-[9999]">
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(ticket.id)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Ticket ID
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`/tickets/${ticket.id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Archive className="h-4 w-4 mr-2" />
                Archive Ticket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              isPending={message.id.startsWith('pending-')}
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
      <QuickSuggestions onSelect={(text) => onSendMessage(text, 'agent')} />

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <ChatInput
          onSend={onSendMessage}
          isSending={isSending}
          error={sendError}
          onRetry={onRetry}
          onClearError={onClearError}
        />
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
