'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'

export interface TicketShortcutActions {
  onResolve?: () => void
  onEscalate?: () => void
  onAssign?: () => void
  onUnassign?: () => void
  onFocusInput?: () => void
  onTogglePriority?: () => void
}

interface KeyboardShortcutsContextValue {
  // Help modal state
  isHelpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
  toggleHelp: () => void

  // Command palette state
  isCommandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  // Ticket actions - set by ticket detail page
  ticketActions: TicketShortcutActions
  registerTicketActions: (actions: TicketShortcutActions) => void
  unregisterTicketActions: () => void

  // Input ref for focusing
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>
  setMessageInputRef: (ref: HTMLTextAreaElement | null) => void

  // Get next ticket handler
  onGetNextTicket: (() => void) | null
  registerGetNextTicket: (handler: () => void) => void
  unregisterGetNextTicket: () => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null)

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  // Help modal state
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  // Ticket actions (ref to avoid re-render loops when actions change)
  const ticketActionsRef = useRef<TicketShortcutActions>({})
  const ticketActions = ticketActionsRef.current

  // Get next ticket handler
  const [getNextTicketHandler, setGetNextTicketHandler] = useState<(() => void) | null>(null)

  // Message input ref
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const inputRefCallback = useRef<HTMLTextAreaElement | null>(null)

  // Help modal handlers
  const openHelp = useCallback(() => setIsHelpOpen(true), [])
  const closeHelp = useCallback(() => setIsHelpOpen(false), [])
  const toggleHelp = useCallback(() => setIsHelpOpen(prev => !prev), [])

  // Command palette handlers
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), [])
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen(prev => !prev), [])

  // Ticket action registration (uses ref to avoid re-render cascade)
  const registerTicketActions = useCallback((actions: TicketShortcutActions) => {
    ticketActionsRef.current = actions
  }, [])

  const unregisterTicketActions = useCallback(() => {
    ticketActionsRef.current = {}
  }, [])

  // Message input ref setter
  const setMessageInputRef = useCallback((ref: HTMLTextAreaElement | null) => {
    inputRefCallback.current = ref
    // @ts-ignore - we're using a mutable ref pattern here
    messageInputRef.current = ref
  }, [])

  // Get next ticket registration
  const registerGetNextTicket = useCallback((handler: () => void) => {
    setGetNextTicketHandler(() => handler)
  }, [])

  const unregisterGetNextTicket = useCallback(() => {
    setGetNextTicketHandler(null)
  }, [])

  const value: KeyboardShortcutsContextValue = {
    isHelpOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    ticketActions,
    registerTicketActions,
    unregisterTicketActions,
    messageInputRef,
    setMessageInputRef,
    onGetNextTicket: getNextTicketHandler,
    registerGetNextTicket,
    unregisterGetNextTicket,
  }

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider')
  }
  return context
}

// Hook for ticket pages to register their actions
export function useRegisterTicketShortcuts(actions: TicketShortcutActions) {
  const { registerTicketActions, unregisterTicketActions } = useKeyboardShortcutsContext()

  React.useEffect(() => {
    registerTicketActions(actions)
    return () => unregisterTicketActions()
  }, [actions, registerTicketActions, unregisterTicketActions])
}
