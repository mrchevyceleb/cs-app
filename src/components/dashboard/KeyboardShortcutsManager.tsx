'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useKeyboardShortcutsContext } from '@/contexts/KeyboardShortcutsContext'
import { useCommandPalette } from './CommandPalette'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import { useToast } from '@/components/ui/toast'

export function KeyboardShortcutsManager() {
  const {
    isHelpOpen,
    toggleHelp,
    closeHelp,
    ticketActions,
    messageInputRef,
    onGetNextTicket,
    registerGetNextTicket,
    unregisterGetNextTicket,
  } = useKeyboardShortcutsContext()

  const router = useRouter()
  const { toast } = useToast()

  // Get command palette from existing provider
  const { setOpen: setCommandPaletteOpen } = useCommandPalette()

  // Create the get next ticket handler
  const handleGetNextTicket = useCallback(async () => {
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
          description: 'All tickets are assigned or resolved. Great job!',
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
    }
  }, [router, toast])

  // Register the get next ticket handler on mount
  useEffect(() => {
    registerGetNextTicket(handleGetNextTicket)
    return () => unregisterGetNextTicket()
  }, [handleGetNextTicket, registerGetNextTicket, unregisterGetNextTicket])

  // Use the keyboard shortcuts hook with the context values
  useKeyboardShortcuts({
    enabled: true,
    onHelpToggle: toggleHelp,
    onCommandPaletteToggle: () => setCommandPaletteOpen(true),
    onGetNextTicket: handleGetNextTicket,
    ticketActions: {
      onResolve: ticketActions.onResolve,
      onEscalate: ticketActions.onEscalate,
      onAssign: ticketActions.onAssign,
      onUnassign: ticketActions.onUnassign,
      onFocusInput: () => {
        // Focus the message input
        if (messageInputRef.current) {
          messageInputRef.current.focus()
        }
        ticketActions.onFocusInput?.()
      },
      onTogglePriority: ticketActions.onTogglePriority,
    },
  })

  return (
    <KeyboardShortcutsHelp
      open={isHelpOpen}
      onOpenChange={(open) => {
        if (!open) closeHelp()
      }}
    />
  )
}
