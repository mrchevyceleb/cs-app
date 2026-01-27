'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Loader2, ArrowRightLeft, User } from 'lucide-react'
import type { Agent, Ticket } from '@/types/database'

interface HandoffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Pick<Ticket, 'id' | 'subject'> | null
  currentAgentId?: string
  onHandoffCreated?: () => void
}

export function HandoffDialog({
  open,
  onOpenChange,
  ticket,
  currentAgentId,
  onHandoffCreated,
}: HandoffDialogProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available agents
  useEffect(() => {
    if (open) {
      fetchAgents()
    }
  }, [open])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedAgentId('')
      setReason('')
      setNotes('')
      setError(null)
    }
  }, [open])

  const fetchAgents = async () => {
    setIsLoadingAgents(true)
    try {
      // Build URL with optional exclude parameter
      const url = currentAgentId
        ? `/api/agents?exclude=${currentAgentId}`
        : '/api/agents'

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch agents')

      const { agents: agentList } = await response.json()
      setAgents(agentList || [])
    } catch (err) {
      console.error('Failed to fetch agents:', err)
      setAgents([])
    } finally {
      setIsLoadingAgents(false)
    }
  }

  const handleSubmit = async () => {
    if (!ticket || !selectedAgentId || !reason.trim()) {
      setError('Please select an agent and provide a reason')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_agent_id: selectedAgentId,
          reason: reason.trim(),
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create handoff')
      }

      onOpenChange(false)
      onHandoffCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create handoff')
    } finally {
      setIsLoading(false)
    }
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

  const availableAgents = agents.filter((agent) => agent.id !== currentAgentId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary-600" />
            Hand Off Ticket
          </DialogTitle>
          <DialogDescription>
            Transfer this ticket to another agent. They will receive a notification
            and can accept or decline the handoff.
          </DialogDescription>
        </DialogHeader>

        {ticket && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {ticket.subject}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ticket ID: {ticket.id.slice(0, 8)}...
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Agent Selection */}
          <div className="space-y-2">
            <Label htmlFor="agent">Hand off to</Label>
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isLoadingAgents}
            >
              <SelectTrigger id="agent">
                <SelectValue placeholder={isLoadingAgents ? 'Loading agents...' : 'Select an agent'} />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No other agents available
                  </div>
                ) : (
                  availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-6 w-6">
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
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({agent.status})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you handing off this ticket?"
              className="min-h-[80px]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context or information for the receiving agent..."
              className="min-h-[60px]"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedAgentId || !reason.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Send Handoff Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
