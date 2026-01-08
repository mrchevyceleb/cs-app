'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfidenceScore } from './ConfidenceScore'
import {
  User,
  Mail,
  Globe,
  Clock,
  MessageSquare,
  Tag,
  AlertCircle,
  Sparkles,
  ExternalLink,
  History,
} from 'lucide-react'
import type { Customer, Ticket } from '@/types/database'
import type { TicketWithCustomer } from './TicketCard'

interface CustomerContextProps {
  customer: Customer | null
  ticket: TicketWithCustomer
  onUpdateTicket: (updates: Partial<TicketWithCustomer>) => void
}

interface TicketHistory {
  id: string
  subject: string
  status: string
  created_at: string
}

const languageOptions = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'tl', label: 'Tagalog', flag: '🇵🇭' },
  { value: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  escalated: 'bg-red-100 text-red-700',
}

export function CustomerContext({
  customer,
  ticket,
  onUpdateTicket,
}: CustomerContextProps) {
  const [ticketHistory, setTicketHistory] = useState<TicketHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchTicketHistory = async () => {
      if (!customer?.id) return

      setIsLoadingHistory(true)
      const { data, error } = await supabase
        .from('tickets')
        .select('id, subject, status, created_at')
        .eq('customer_id', customer.id)
        .neq('id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setTicketHistory(data)
      }
      setIsLoadingHistory(false)
    }

    fetchTicketHistory()
  }, [customer?.id, ticket.id, supabase])

  const handleTagAdd = (tag: string) => {
    const currentTags = ticket.tags || []
    if (!currentTags.includes(tag)) {
      onUpdateTicket({ tags: [...currentTags, tag] })
    }
  }

  const handleTagRemove = (tag: string) => {
    const currentTags = ticket.tags || []
    onUpdateTicket({ tags: currentTags.filter((t) => t !== tag) })
  }

  if (!customer) {
    return (
      <Card className="h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Customer information unavailable</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const preferredLang = languageOptions.find(
    (l) => l.value === customer.preferred_language
  )

  return (
    <Card className="h-full overflow-y-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Context
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Customer Profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              {getInitials(customer.name || 'CU')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {customer.name || 'Unknown Customer'}
            </h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Mail className="h-3 w-3" />
              <span className="truncate">{customer.email || 'No email'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Customer Details */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Details
          </h4>

          {/* Preferred Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Globe className="h-4 w-4" />
              Language
            </div>
            <div className="flex items-center gap-1">
              <span>{preferredLang?.flag || '🌐'}</span>
              <span className="text-sm font-medium">
                {preferredLang?.label || customer.preferred_language || 'English'}
              </span>
            </div>
          </div>

          {/* Customer Since */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              Customer since
            </div>
            <span className="text-sm font-medium">
              {new Date(customer.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* AI Confidence */}
          {ticket.ai_confidence !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sparkles className="h-4 w-4" />
                AI Confidence
              </div>
              <ConfidenceScore value={ticket.ai_confidence} size="sm" showLabel />
            </div>
          )}
        </div>

        <Separator />

        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Tags
            </h4>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              + Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(ticket.tags || []).length > 0 ? (
              (ticket.tags || []).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-gray-200"
                  onClick={() => handleTagRemove(tag)}
                >
                  {tag} ×
                </Badge>
              ))
            ) : (
              <p className="text-xs text-gray-400">No tags assigned</p>
            )}
          </div>

          {/* Quick tag suggestions */}
          <div className="flex flex-wrap gap-1">
            {['billing', 'technical', 'feature-request', 'bug'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagAdd(tag)}
                className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Ticket History */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <History className="h-3 w-3" />
            Recent Tickets
          </h4>

          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : ticketHistory.length > 0 ? (
            <div className="space-y-2">
              {ticketHistory.map((historyTicket) => (
                <div
                  key={historyTicket.id}
                  className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-1">
                      {historyTicket.subject}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${statusColors[historyTicket.status] || ''}`}
                    >
                      {historyTicket.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {getRelativeTime(historyTicket.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">
              No previous tickets
            </p>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <Mail className="h-3 w-3 mr-1" />
              Email
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8">
              <ExternalLink className="h-3 w-3 mr-1" />
              Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
