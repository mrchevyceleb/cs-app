'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Loader2, ArrowRight, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

// Cooldown after an empty-queue response so rapid clicks don't stack toasts.
// The /api/queue/next 204 returns in under 100ms, so the disabled-while-loading
// guard alone doesn't prevent repeats — without this cooldown the user gets one
// toast per click.
const EMPTY_QUEUE_COOLDOWN_MS = 3000

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
  const [isCoolingDown, setIsCoolingDown] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    }
  }, [])

  const startEmptyQueueCooldown = useCallback(() => {
    setIsCoolingDown(true)
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current)
    cooldownTimer.current = setTimeout(() => setIsCoolingDown(false), EMPTY_QUEUE_COOLDOWN_MS)
  }, [])

  const handleGetNext = useCallback(async () => {
    if (isLoading || isCoolingDown) return

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
        startEmptyQueueCooldown()
        return
      }

      if (response.status === 409) {
        // Conflict - ticket was assigned by another agent.
        // Retry once silently so users only see one final message.
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

        if (retryResponse.status === 409) {
          toast({
            type: 'warning',
            title: 'Ticket taken',
            description: 'Another agent grabbed the next ticket. Please try again.',
          })
          return
        }

        if (!retryResponse.ok) {
          const retryErrorData = await retryResponse.json().catch(() => ({}))
          throw new Error(retryErrorData.error || 'Failed to get next ticket on retry')
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
  }, [isLoading, isCoolingDown, router, toast, startEmptyQueueCooldown])

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleGetNext}
      disabled={isLoading || isCoolingDown}
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
