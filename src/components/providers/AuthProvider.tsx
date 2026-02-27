'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface Agent {
  id: string
  email: string
  name: string
  avatar_url: string | null
  status: 'online' | 'away' | 'offline'
  created_at: string
}

interface AuthContextType {
  user: User | null
  agent: Agent | null
  session: Session | null
  isLoading: boolean
  updateAgentStatus: (status: 'online' | 'away' | 'offline') => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  agent: null,
  session: null,
  isLoading: true,
  updateAgentStatus: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchAgent = async (userId: string) => {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setAgent(data as Agent)
    }
  }

  const updateAgentStatus = async (status: 'online' | 'away' | 'offline') => {
    if (!user) return

    const { error } = await supabase
      .from('agents')
      .update({ status })
      .eq('id', user.id)

    if (!error && agent) {
      setAgent({ ...agent, status })
    }
  }

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession()

      if (initialSession?.user) {
        setSession(initialSession)
        setUser(initialSession.user)
        await fetchAgent(initialSession.user.id)
      }

      setIsLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await fetchAgent(currentSession.user.id)

          // Update status to online on sign in
          if (event === 'SIGNED_IN') {
            await supabase
              .from('agents')
              .update({ status: 'online' })
              .eq('id', currentSession.user.id)
          }
        } else {
          setAgent(null)
        }

        setIsLoading(false)
      }
    )

    // Handle visibility change to update status
    const handleVisibilityChange = async () => {
      if (!user) return

      if (document.hidden) {
        await updateAgentStatus('away')
      } else {
        await updateAgentStatus('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Handle beforeunload to set offline
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for reliable delivery during page unload
        const url = `${process.env.NEXT_PUBLIC_SB_URL}/rest/v1/agents?id=eq.${user.id}`
        navigator.sendBeacon(url, JSON.stringify({ status: 'offline' }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, agent, session, isLoading, updateAgentStatus }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
