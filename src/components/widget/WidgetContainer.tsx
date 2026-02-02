'use client'

import { cn } from '@/lib/utils'
import type { WidgetConfig, WidgetState, WidgetSession, WidgetView } from '@/types/widget'
import { WidgetLauncher } from './WidgetLauncher'
import { WidgetHeader } from './WidgetHeader'
import { WidgetAuth } from './WidgetAuth'
import { WidgetTicketList } from './WidgetTicketList'
import { WidgetChat } from './WidgetChat'
import { WidgetNewTicket } from './WidgetNewTicket'
import { getContainerPositionStyles, getLauncherPositionStyles } from '@/lib/widget/config'

interface WidgetContainerProps {
  config: WidgetConfig
  state: WidgetState
  session: WidgetSession | null
  onOpen: () => void
  onClose: () => void
  onAuth: (email: string, name?: string) => Promise<boolean>
  onLogout: () => void
  onNavigate: (view: WidgetView, ticketId?: string | null) => void
  onSelectTicket: (ticketId: string) => void
  onTicketCreated: (ticketId: string) => void
  onNewConversation: () => void
}

export function WidgetContainer({
  config,
  state,
  session,
  onOpen,
  onClose,
  onAuth,
  onLogout,
  onNavigate,
  onSelectTicket,
  onTicketCreated,
  onNewConversation,
}: WidgetContainerProps) {
  const launcherPosition = getLauncherPositionStyles(config.position)
  const containerPosition = getContainerPositionStyles(config.position)

  // Render content based on current view
  const renderContent = () => {
    switch (state.currentView) {
      case 'auth':
        return (
          <WidgetAuth
            config={config}
            onAuth={onAuth}
          />
        )
      case 'tickets':
        return (
          <WidgetTicketList
            session={session}
            onSelectTicket={onSelectTicket}
            onNewTicket={() => onNavigate('new-ticket')}
          />
        )
      case 'new-ticket':
        return (
          <WidgetNewTicket
            session={session}
            onTicketCreated={onTicketCreated}
            onCancel={() => onNavigate('tickets')}
          />
        )
      case 'chat':
        return (
          <WidgetChat
            session={session}
            ticketId={state.currentTicketId}
            config={config}
            isNewSession={!state.currentTicketId}
            onBack={() => onNavigate('tickets', null)}
            onTicketCreated={onTicketCreated}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      {/* Launcher Button */}
      {!state.isOpen && (
        <WidgetLauncher
          config={config}
          onClick={onOpen}
          style={{
            position: 'fixed',
            ...launcherPosition,
            zIndex: config.zIndex,
          }}
        />
      )}

      {/* Widget Container */}
      {state.isOpen && (
        <div
          className={cn(
            'fixed flex flex-col overflow-hidden',
            'w-full h-full sm:w-[400px] sm:h-[600px]',
            'sm:rounded-2xl shadow-2xl',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'widget-enter'
          )}
          style={{
            position: 'fixed',
            ...containerPosition,
            zIndex: config.zIndex,
            // On mobile, full screen
            ...(typeof window !== 'undefined' && window.innerWidth < 640 ? {
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              borderRadius: 0,
            } : {}),
          }}
        >
          {/* Header */}
          <WidgetHeader
            config={config}
            state={state}
            onClose={onClose}
            onBack={state.currentView === 'tickets' || state.currentView === 'new-ticket'
              ? () => onNavigate('chat', null)
              : undefined}
            onLogout={state.isAuthenticated ? onLogout : undefined}
            onNewConversation={onNewConversation}
            onPastConversations={state.isAuthenticated
              ? () => onNavigate('tickets', null)
              : undefined}
          />

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes widget-slide-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .widget-enter {
          animation: widget-slide-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
