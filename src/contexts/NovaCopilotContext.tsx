'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface NovaCopilotContextType {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

const NovaCopilotContext = createContext<NovaCopilotContextType | undefined>(undefined)

export function NovaCopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen(prev => !prev)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return (
    <NovaCopilotContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </NovaCopilotContext.Provider>
  )
}

export function useNovaCopilot() {
  const context = useContext(NovaCopilotContext)
  if (context === undefined) {
    throw new Error('useNovaCopilot must be used within a NovaCopilotProvider')
  }
  return context
}
