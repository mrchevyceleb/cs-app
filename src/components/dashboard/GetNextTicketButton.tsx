'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Loader2, ArrowRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GetNextTicketButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showIcon?: boolean
  showText?: boolean
}

export function GetNextTicketButton({
  className,
  variant = 'default',
  size = 'default',
  showIcon = true,
  showText = true,
}: GetNextTicketButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleGetNext = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 204) {
        // No tickets available
        toast({
          type: 'info',
          title: 'No tickets in queue',
          description: 'All tickets are assigned or resolved. Great job!',
        })
        return
      }

      if (response.status === 409) {
        // Conflict - ticket was assigned by another agent
        toast({
          type: 'warning',
          title: 'Ticket taken',
          description: 'Another agent grabbed that ticket. Trying again...',
        })
        // Retry once
        const retryResponse = await fetch('/api/queue/next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (retryResponse.status === 204) {
          toast({
            type: 'info',
            title: 'No tickets in queue',
            description: 'All tickets are assigned or resolved.',
          })
          return
        }

        if (!retryResponse.ok) {
          throw new Error('Failed to get next ticket on retry')
        }

        const retryData = await retryResponse.json()
        if (retryData.ticket) {
          toast({
            type: 'success',
            title: 'Ticket assigned',
            description: `"${retryData.ticket.subject}" is now yours.`,
          })
          router.push(`/tickets/${retryData.ticket.id}`)
        }
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get next ticket')
      }

      const data = await response.json()

      if (data.ticket) {
        toast({
          type: 'success',
          title: 'Ticket assigned',
          description: `"${data.ticket.subject}" is now yours.`,
        })
        router.push(`/tickets/${data.ticket.id}`)
      }
    } catch (error) {
      console.error('Error getting next ticket:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get next ticket',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, router, toast])

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGetNext}
      disabled={isLoading}
      className={cn(
        variant === 'default' && 'bg-primary-600 hover:bg-primary-700 text-white',
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {showText && <span>Finding ticket...</span>}
        </>
      ) : (
        <>
          {showIcon && <ArrowRight className="w-4 h-4" />}
          {showText && <span>Get Next</span>}
        </>
      )}
    </Button>
  )
}

// Compact version for sidebar or header
export function GetNextTicketButtonCompact({ className }: { className?: string }) {
  return (
    <GetNextTicketButton
      variant="outline"
      size="sm"
      showText={true}
      showIcon={true}
      className={cn('gap-2', className)}
    />
  )
}

// Icon-only version for tight spaces
export function GetNextTicketButtonIcon({ className }: { className?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleGetNext = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.status === 204) {
        toast({
          type: 'info',
          title: 'No tickets in queue',
          description: 'All tickets are assigned or resolved.',
        })
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get next ticket')
      }

      const data = await response.json()

      if (data.ticket) {
        toast({
          type: 'success',
          title: 'Ticket assigned',
          description: `"${data.ticket.subject}" is now yours.`,
        })
        router.push(`/tickets/${data.ticket.id}`)
      }
    } catch (error) {
      console.error('Error getting next ticket:', error)
      toast({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get next ticket',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, router, toast])

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleGetNext}
      disabled={isLoading}
      className={cn('shrink-0', className)}
      title="Get next ticket (g then n)"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Inbox className="w-4 h-4" />
      )}
    </Button>
  )
}
