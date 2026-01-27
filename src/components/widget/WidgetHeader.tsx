'use client'

import { X, ArrowLeft, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetConfig, WidgetState } from '@/types/widget'

interface WidgetHeaderProps {
  config: WidgetConfig
  state: WidgetState
  onClose: () => void
  onBack?: () => void
  onLogout?: () => void
}

export function WidgetHeader({
  config,
  state,
  onClose,
  onBack,
  onLogout,
}: WidgetHeaderProps) {
  // Get title based on current view
  const getTitle = () => {
    switch (state.currentView) {
      case 'auth':
        return config.companyName
      case 'tickets':
        return 'My Conversations'
      case 'new-ticket':
        return 'New Conversation'
      case 'chat':
        return 'Conversation'
      default:
        return config.companyName
    }
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
        {onBack && (
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
        <h1 className="font-semibold text-base">{getTitle()}</h1>
      </div>

      <div className="flex items-center gap-1">
        {onLogout && state.isAuthenticated && (
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
