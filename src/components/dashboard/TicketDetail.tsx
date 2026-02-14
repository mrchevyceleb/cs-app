'use client'

import { useRef, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { ChatBubble, ChatBubbleSkeleton } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { ConfidenceScore } from './ConfidenceScore'
import { TagManager } from './TagManager'
import { TicketTimeline } from './TicketTimeline'
import { LifecycleBadge } from './LifecycleBadge'
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Copy,
  ExternalLink,
  Tag,
  Trash2,
  Archive,
  MessageSquare,
  History,
} from 'lucide-react'
import type { TicketWithCustomer } from './TicketCard'
import type { Message } from '@/types/database'

interface TicketDetailProps {
  ticket: TicketWithCustomer
  messages: Message[]
  onSendMessage: (content: string, senderType: 'agent' | 'ai', isInternal?: boolean, attachmentIds?: string[]) => void
  onUpdateTicket: (updates: Partial<TicketWithCustomer>) => void
  currentAgentId?: string | null
  isSending?: boolean
  sendError?: string | null
  onRetry?: () => void
  onClearError?: () => void
  isMessagesLoading?: boolean
  onDeleteTicket?: () => void
}

const statusOptions = [
  { value: 'open', label: 'Open', icon: Clock, color: 'text-primary-600' },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-emerald-600' },
  { value: 'escalated', label: 'Escalated', icon: AlertTriangle, color: 'text-rose-600' },
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
  isMessagesLoading = false,
  onDeleteTicket,
}: TicketDetailProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isAiTyping] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'timeline'>('messages')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleAddTag = (tag: string) => {
    const currentTags = ticket.tags || []
    if (!currentTags.includes(tag)) {
      onUpdateTicket({ tags: [...currentTags, tag] })
    }
  }

  const handleRemoveTag = (tag: string) => {
    const currentTags = ticket.tags || []
    onUpdateTicket({ tags: currentTags.filter((t) => t !== tag) })
  }

  const isAssignedToMe = ticket.assigned_agent_id === currentAgentId
  const isAssigned = !!ticket.assigned_agent_id

  return (
    <div className="h-full flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]">
      {/* Ticket Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-border/60 bg-card gap-2 sm:gap-0">
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
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-primary-50 rounded-md border border-primary-100">
              <Sparkles className="h-3.5 w-3.5 text-primary-600" />
              <ConfidenceScore value={ticket.ai_confidence} size="sm" />
            </div>
          )}

          {/* AI Handled Badge - hidden on small screens */}
          {ticket.ai_handled && (
            <Badge variant="secondary" className="hidden sm:inline-flex bg-primary-50 text-primary-700 border-primary-100">
              AI Handling
            </Badge>
          )}

          {/* Assigned Agent Badge - hidden on small screens */}
          {ticket.assigned_agent && (
            <Badge variant="secondary" className="hidden sm:inline-flex gap-1.5 bg-muted text-foreground border-border/60">
              <Avatar className="h-4 w-4">
                <AvatarImage src={ticket.assigned_agent.avatar_url || undefined} />
                <AvatarFallback className="text-[8px] bg-primary-100 text-primary-700">
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
                className="text-muted-foreground border-border/70 hover:bg-muted flex-1 sm:flex-none"
              >
                <UserMinus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Unassign</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAssignToMe}
                className="text-primary-700 border-primary-200 hover:bg-primary-50 flex-1 sm:flex-none"
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
                className="text-amber-700 border-amber-200 hover:bg-amber-50 flex-1 sm:flex-none"
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
                className="bg-primary-600 hover:bg-primary-700 text-white flex-1 sm:flex-none"
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
              <TagManager
                tags={ticket.tags || []}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Tag className="h-4 w-4 mr-2" />
                    Manage Tags
                    {(ticket.tags?.length || 0) > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {ticket.tags?.length}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuItem disabled>
                <Archive className="h-4 w-4 mr-2" />
                Archive Ticket
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  setShowDeleteConfirm(true)
                }}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lifecycle Badge */}
      <div className="px-4 pt-3">
        <LifecycleBadge ticket={ticket} />
      </div>

      {/* Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'messages' | 'timeline')}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Tab Navigation */}
        <div className="px-4 pt-2 border-b border-border/60 bg-card">
          <TabsList className="w-auto">
            <TabsTrigger value="messages" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Messages
              {messages.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {messages.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <History className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Messages Tab Content */}
        <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isMessagesLoading ? (
              <div className="space-y-4">
                <ChatBubbleSkeleton />
                <ChatBubbleSkeleton align="right" />
                <ChatBubbleSkeleton />
              </div>
            ) : messages.length === 0 ? (
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
          <div className="p-4 border-t border-border/60 bg-card">
            <ChatInput
              ticketId={ticket.id}
              onSend={onSendMessage}
              isSending={isSending}
              error={sendError}
              onRetry={onRetry}
              onClearError={onClearError}
            />
          </div>
        </TabsContent>

        {/* Timeline Tab Content */}
        <TabsContent value="timeline" className="flex-1 overflow-y-auto m-0">
          <TicketTimeline ticketId={ticket.id} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this ticket and its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteTicket?.()}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 shadow-[var(--shadow-xs)]">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground">
        No messages yet
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
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
    <div className="px-4 py-2 border-t border-border/60 bg-card">
      <p className="text-xs text-muted-foreground mb-2">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs bg-card border border-border/60 text-foreground rounded-full hover:bg-muted transition-colors shadow-[var(--shadow-xs)]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
