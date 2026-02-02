'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, ArrowLeft, LogOut, Sparkles, MoreVertical, MessageSquarePlus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetConfig, WidgetState } from '@/types/widget'

interface WidgetHeaderProps {
  config: WidgetConfig
  state: WidgetState
  onClose: () => void
  onBack?: () => void
  onLogout?: () => void
  onNewConversation?: () => void
  onPastConversations?: () => void
}

export function WidgetHeader({
  config,
  state,
  onClose,
  onBack,
  onLogout,
  onNewConversation,
  onPastConversations,
}: WidgetHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const agentName = config.agentName || 'Nova'
  const agentAvatarUrl = config.agentAvatarUrl
  const isChatView = state.currentView === 'chat'
  const showAvatar = agentAvatarUrl && !avatarError

  const handleAvatarError = useCallback(() => setAvatarError(true), [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  // Get title based on current view
  const getTitle = () => {
    switch (state.currentView) {
      case 'auth':
        return config.companyName
      case 'tickets':
        return 'Past Conversations'
      case 'new-ticket':
        return 'New Conversation'
      case 'chat':
        return agentName
      default:
        return config.companyName
    }
  }

  const getSubtitle = () => {
    if (state.currentView === 'chat') {
      return 'AI Assistant'
    }
    return null
  }

  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'px-4 py-3',
        'text-white',
        'shrink-0'
      )}
      style={{
        backgroundColor: config.primaryColor,
      }}
    >
      <div className="flex items-center gap-3">
        {onBack && !isChatView && (
          <button
            onClick={onBack}
            className={cn(
              'p-1.5 rounded-full',
              'hover:bg-white/20 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/50'
            )}
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Nova avatar + title for chat view */}
        {isChatView && (
          showAvatar ? (
            <img
              src={agentAvatarUrl}
              alt={agentName}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20"
              onError={handleAvatarError}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )
        )}

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-base leading-tight">{getTitle()}</h1>
            {isChatView && (
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Online" />
            )}
          </div>
          {getSubtitle() && (
            <span className="text-xs text-white/70 leading-tight">{getSubtitle()}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Menu button (only in chat view) */}
        {isChatView && (onNewConversation || onPastConversations || onLogout) && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(
                'p-1.5 rounded-full',
                'hover:bg-white/20 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-white/50'
              )}
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                {onNewConversation && (
                  <button
                    onClick={() => { setMenuOpen(false); onNewConversation() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    New conversation
                  </button>
                )}
                {onPastConversations && state.isAuthenticated && (
                  <button
                    onClick={() => { setMenuOpen(false); onPastConversations() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Past conversations
                  </button>
                )}
                {onLogout && state.isAuthenticated && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => { setMenuOpen(false); onLogout() }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logout button (non-chat views) */}
        {!isChatView && onLogout && state.isAuthenticated && (
          <button
            onClick={onLogout}
            className={cn(
              'p-1.5 rounded-full',
              'hover:bg-white/20 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/50'
            )}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onClose}
          className={cn(
            'p-1.5 rounded-full',
            'hover:bg-white/20 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
          aria-label="Close widget"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
