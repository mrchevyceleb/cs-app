'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { WidgetContainer } from '@/components/widget/WidgetContainer'
import { WidgetThemeProvider } from '@/components/widget/WidgetThemeProvider'
import type { WidgetConfig, WidgetState, WidgetSession, WidgetIdentifyPayload } from '@/types/widget'
import { DEFAULT_WIDGET_CONFIG, INITIAL_WIDGET_STATE } from '@/types/widget'
import { loadWidgetSession, saveWidgetSession, clearWidgetSession, generateFingerprint } from '@/lib/widget/auth'
import { subscribeToMessages, sendToParent } from '@/lib/widget/messaging'

export default function WidgetPage() {
  const [config, setConfig] = useState<WidgetConfig>({
    ...DEFAULT_WIDGET_CONFIG,
  })
  const [state, setState] = useState<WidgetState>(INITIAL_WIDGET_STATE)
  const [session, setSession] = useState<WidgetSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initRef = useRef(false)

  // Style the body for iframe transparency (root layout owns <body>)
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.background = 'transparent'
    document.body.style.overflow = 'hidden'
  }, [])

  // Create anonymous session
  const createAnonymousSession = useCallback(async () => {
    try {
      const fingerprint = generateFingerprint()
      const response = await fetch('/api/widget/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      })

      if (!response.ok) return null

      const data = await response.json()
      const newSession: WidgetSession = {
        token: data.token,
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        expiresAt: data.expiresAt,
        isAnonymous: true,
      }

      setSession(newSession)
      saveWidgetSession(newSession)
      setState(prev => ({
        ...prev,
        customerId: newSession.customerId,
        customerEmail: newSession.customerEmail,
        customerName: newSession.customerName,
      }))

      return newSession
    } catch (error) {
      console.error('Anonymous auth error:', error)
      return null
    }
  }, [])

  // Initialize widget
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function init() {
      // Load session from localStorage
      const savedSession = loadWidgetSession()
      if (savedSession) {
        setSession(savedSession)
        setState(prev => ({
          ...prev,
          isAuthenticated: !savedSession.isAnonymous,
          customerEmail: savedSession.customerEmail,
          customerName: savedSession.customerName,
          customerId: savedSession.customerId,
        }))
      } else {
        // Auto-create anonymous session
        await createAnonymousSession()
      }

      // Parse config from URL params
      const params = new URLSearchParams(window.location.search)
      const urlConfig: Partial<WidgetConfig> = {}

      if (params.get('position')) {
        const pos = params.get('position')
        if (pos === 'bottom-right' || pos === 'bottom-left') {
          urlConfig.position = pos
        }
      }
      if (params.get('primaryColor')) urlConfig.primaryColor = params.get('primaryColor')!
      if (params.get('greeting')) urlConfig.greeting = params.get('greeting')!
      if (params.get('companyName')) urlConfig.companyName = params.get('companyName')!
      if (params.get('theme')) {
        const theme = params.get('theme')
        if (theme === 'light' || theme === 'dark' || theme === 'auto') {
          urlConfig.theme = theme
        }
      }
      if (params.get('agentName')) urlConfig.agentName = params.get('agentName')!
      if (params.get('agentAvatarUrl')) urlConfig.agentAvatarUrl = params.get('agentAvatarUrl')!

      setConfig(prev => ({ ...prev, ...urlConfig }))
      setIsLoading(false)

      // Notify parent that widget is ready
      sendToParent('widget:ready')
    }

    init()
  }, [createAnonymousSession])

  // Subscribe to messages from parent
  useEffect(() => {
    const unsubscribe = subscribeToMessages({
      'widget:init': (payload) => {
        const initPayload = payload as { config: Partial<WidgetConfig> }
        if (initPayload?.config) {
          setConfig(prev => ({ ...prev, ...initPayload.config }))
        }
      },
      'widget:open': () => {
        handleOpen()
      },
      'widget:close': () => {
        handleClose()
      },
      'widget:identify': async (payload) => {
        const identifyPayload = payload as WidgetIdentifyPayload
        if (identifyPayload?.email) {
          await handleIdentify(identifyPayload)
        }
      },
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Handle widget open - always go to chat
  const handleOpen = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      currentView: 'chat',
    }))
  }, [])

  // Handle widget close
  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // Handle identify (pre-fill customer info / upgrade anonymous session)
  const handleIdentify = useCallback(async (payload: WidgetIdentifyPayload) => {
    try {
      const response = await fetch('/api/widget/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          name: payload.name,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newSession: WidgetSession = {
          token: data.token,
          customerId: data.customerId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          expiresAt: data.expiresAt,
          isAnonymous: false,
        }
        setSession(newSession)
        saveWidgetSession(newSession)
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          customerEmail: newSession.customerEmail,
          customerName: newSession.customerName,
          customerId: newSession.customerId,
        }))
      }
    } catch (error) {
      console.error('Identify error:', error)
    }
  }, [])

  // Handle authentication
  const handleAuth = useCallback(async (email: string, name?: string) => {
    try {
      const response = await fetch('/api/widget/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      const newSession: WidgetSession = {
        token: data.token,
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        expiresAt: data.expiresAt,
        isAnonymous: false,
      }

      setSession(newSession)
      saveWidgetSession(newSession)
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        customerEmail: newSession.customerEmail,
        customerName: newSession.customerName,
        customerId: newSession.customerId,
        currentView: 'chat',
      }))

      return true
    } catch (error) {
      console.error('Auth error:', error)
      sendToParent('widget:error', { message: 'Authentication failed' })
      return false
    }
  }, [])

  // Handle logout
  const handleLogout = useCallback(() => {
    setSession(null)
    clearWidgetSession()
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      customerEmail: null,
      customerName: null,
      customerId: null,
      currentTicketId: null,
      currentView: 'chat',
    }))
    // Re-create anonymous session
    createAnonymousSession()
  }, [createAnonymousSession])

  // Handle view navigation
  const handleNavigate = useCallback((view: WidgetState['currentView'], ticketId?: string | null) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      currentTicketId: ticketId ?? prev.currentTicketId,
    }))
  }, [])

  // Handle ticket selection
  const handleSelectTicket = useCallback((ticketId: string) => {
    setState(prev => ({
      ...prev,
      currentView: 'chat',
      currentTicketId: ticketId,
    }))
  }, [])

  // Handle new ticket created
  const handleTicketCreated = useCallback((ticketId: string) => {
    setState(prev => ({
      ...prev,
      currentTicketId: ticketId,
    }))
  }, [])

  // Handle new conversation (reset to fresh chat)
  const handleNewConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentView: 'chat',
      currentTicketId: null,
    }))
  }, [])

  if (isLoading) {
    return null
  }

  return (
    <WidgetThemeProvider config={config}>
      <WidgetContainer
        config={config}
        state={state}
        session={session}
        onOpen={handleOpen}
        onClose={handleClose}
        onAuth={handleAuth}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onSelectTicket={handleSelectTicket}
        onTicketCreated={handleTicketCreated}
        onNewConversation={handleNewConversation}
      />
    </WidgetThemeProvider>
  )
}
