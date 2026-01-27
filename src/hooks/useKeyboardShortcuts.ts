'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export interface ShortcutConfig {
  key: string
  description: string
  category: 'navigation' | 'ticket' | 'general'
  action: () => void
  condition?: () => boolean
  sequence?: string // For multi-key sequences like 'g t'
}

export interface KeyboardShortcutsOptions {
  enabled?: boolean
  onHelpToggle?: () => void
  onCommandPaletteToggle?: () => void
  onGetNextTicket?: () => void
  ticketActions?: {
    onResolve?: () => void
    onEscalate?: () => void
    onAssign?: () => void
    onUnassign?: () => void
    onFocusInput?: () => void
    onTogglePriority?: () => void
  }
}

// Check if the active element is an input field
function isInputFocused(): boolean {
  const activeElement = document.activeElement
  if (!activeElement) return false

  const tagName = activeElement.tagName.toLowerCase()
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  const isContentEditable = activeElement.getAttribute('contenteditable') === 'true'

  return isInput || isContentEditable
}

// Get the display key for a shortcut
export function getDisplayKey(key: string, isMac: boolean = false): string {
  const modKey = isMac ? 'Cmd' : 'Ctrl'

  return key
    .replace('mod', modKey)
    .replace('shift', 'Shift')
    .replace('alt', 'Alt')
    .replace('escape', 'Esc')
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const {
    enabled = true,
    onHelpToggle,
    onCommandPaletteToggle,
    onGetNextTicket,
    ticketActions,
  } = options

  const router = useRouter()
  const pathname = usePathname()

  // Track key sequence for multi-key shortcuts (like "g t")
  const keySequence = useRef<string[]>([])
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null)
  const [isMac, setIsMac] = useState(false)

  // Detect platform
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  // Check if we're on a ticket detail page
  const isOnTicketPage = useCallback(() => {
    return pathname.startsWith('/tickets/') && pathname !== '/tickets'
  }, [pathname])

  // Clear the key sequence
  const clearSequence = useCallback(() => {
    keySequence.current = []
    if (sequenceTimeout.current) {
      clearTimeout(sequenceTimeout.current)
      sequenceTimeout.current = null
    }
  }, [])

  // Build the shortcuts configuration
  const getShortcuts = useCallback((): ShortcutConfig[] => {
    const shortcuts: ShortcutConfig[] = [
      // Global Navigation (g + key sequences)
      {
        key: 'g t',
        sequence: 'g t',
        description: 'Go to Tickets',
        category: 'navigation',
        action: () => router.push('/tickets'),
      },
      {
        key: 'g d',
        sequence: 'g d',
        description: 'Go to Dashboard',
        category: 'navigation',
        action: () => router.push('/'),
      },
      {
        key: 'g k',
        sequence: 'g k',
        description: 'Go to Knowledge Base',
        category: 'navigation',
        action: () => router.push('/knowledge'),
      },
      {
        key: 'g a',
        sequence: 'g a',
        description: 'Go to Analytics',
        category: 'navigation',
        action: () => router.push('/analytics'),
      },
      {
        key: 'g s',
        sequence: 'g s',
        description: 'Go to Settings',
        category: 'navigation',
        action: () => router.push('/settings'),
      },
      {
        key: 'g n',
        sequence: 'g n',
        description: 'Get Next Ticket',
        category: 'navigation',
        action: () => onGetNextTicket?.(),
      },

      // Command Palette
      {
        key: 'mod+k',
        description: 'Open command palette',
        category: 'general',
        action: () => onCommandPaletteToggle?.(),
      },

      // General shortcuts
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: () => onHelpToggle?.(),
      },
      {
        key: 'escape',
        description: 'Close modal/dialog',
        category: 'general',
        action: () => {
          // This is handled by individual modals, but we trigger the help close
          onHelpToggle?.()
        },
      },
    ]

    // Ticket-specific shortcuts (only when viewing a ticket)
    if (ticketActions) {
      shortcuts.push(
        {
          key: 'r',
          description: 'Mark as Resolved',
          category: 'ticket',
          action: () => ticketActions.onResolve?.(),
          condition: isOnTicketPage,
        },
        {
          key: 'e',
          description: 'Escalate ticket',
          category: 'ticket',
          action: () => ticketActions.onEscalate?.(),
          condition: isOnTicketPage,
        },
        {
          key: 'a',
          description: 'Assign to me',
          category: 'ticket',
          action: () => ticketActions.onAssign?.(),
          condition: isOnTicketPage,
        },
        {
          key: 'u',
          description: 'Unassign',
          category: 'ticket',
          action: () => ticketActions.onUnassign?.(),
          condition: isOnTicketPage,
        },
        {
          key: 'n',
          description: 'Focus message input',
          category: 'ticket',
          action: () => ticketActions.onFocusInput?.(),
          condition: isOnTicketPage,
        },
        {
          key: 'p',
          description: 'Toggle priority',
          category: 'ticket',
          action: () => ticketActions.onTogglePriority?.(),
          condition: isOnTicketPage,
        }
      )
    }

    return shortcuts
  }, [router, onHelpToggle, onCommandPaletteToggle, ticketActions, isOnTicketPage])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Skip if input is focused (except for specific shortcuts like Escape or Cmd+K)
    const key = event.key.toLowerCase()
    const isModKey = event.metaKey || event.ctrlKey

    // Allow Escape and Cmd/Ctrl+K even in input fields
    if (isInputFocused() && key !== 'escape' && !(isModKey && key === 'k')) {
      return
    }

    // Build key string
    let keyString = ''
    if (event.metaKey || event.ctrlKey) keyString += 'mod+'
    if (event.shiftKey && key !== '?') keyString += 'shift+'
    if (event.altKey) keyString += 'alt+'
    keyString += key

    // Handle ? (shift + /)
    if (event.shiftKey && event.key === '?') {
      keyString = '?'
    }

    const shortcuts = getShortcuts()

    // Check for sequence shortcuts (g + key)
    if (key === 'g' && !isModKey && !event.shiftKey) {
      keySequence.current = ['g']
      // Set timeout to clear sequence after 1 second
      sequenceTimeout.current = setTimeout(clearSequence, 1000)
      return
    }

    // Check if we're in a sequence
    if (keySequence.current.length > 0) {
      const fullSequence = [...keySequence.current, key].join(' ')
      const sequenceShortcut = shortcuts.find(s => s.sequence === fullSequence)

      if (sequenceShortcut) {
        event.preventDefault()
        if (!sequenceShortcut.condition || sequenceShortcut.condition()) {
          sequenceShortcut.action()
        }
        clearSequence()
        return
      }

      // Invalid sequence, clear it
      clearSequence()
    }

    // Check for single-key or modifier shortcuts
    const shortcut = shortcuts.find(s => {
      if (s.sequence) return false // Skip sequence shortcuts
      return s.key === keyString
    })

    if (shortcut) {
      event.preventDefault()
      if (!shortcut.condition || shortcut.condition()) {
        shortcut.action()
      }
    }
  }, [enabled, getShortcuts, clearSequence])

  // Register keyboard event listener
  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearSequence()
    }
  }, [enabled, handleKeyDown, clearSequence])

  return {
    shortcuts: getShortcuts(),
    isMac,
    getDisplayKey: (key: string) => getDisplayKey(key, isMac),
  }
}

// Separate hook for getting just the shortcuts list (useful for the help modal)
export function useShortcutsList() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  const navigationShortcuts = [
    { key: 'g then t', description: 'Go to Tickets' },
    { key: 'g then d', description: 'Go to Dashboard' },
    { key: 'g then k', description: 'Go to Knowledge Base' },
    { key: 'g then a', description: 'Go to Analytics' },
    { key: 'g then s', description: 'Go to Settings' },
    { key: 'g then n', description: 'Get Next Ticket' },
    { key: isMac ? 'Cmd+K' : 'Ctrl+K', description: 'Open command palette' },
  ]

  const ticketShortcuts = [
    { key: 'r', description: 'Mark as Resolved' },
    { key: 'e', description: 'Escalate ticket' },
    { key: 'a', description: 'Assign to me' },
    { key: 'u', description: 'Unassign' },
    { key: 'n', description: 'Focus message input' },
    { key: 'p', description: 'Toggle priority (cycle through)' },
  ]

  const generalShortcuts = [
    { key: '?', description: 'Show this help' },
    { key: 'Esc', description: 'Close modal/dialog' },
  ]

  return {
    navigationShortcuts,
    ticketShortcuts,
    generalShortcuts,
    isMac,
  }
}
