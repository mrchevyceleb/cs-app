'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader, MobileSidebarOverlay } from '@/components/dashboard/MobileHeader'
import { CommandPaletteProvider } from '@/components/dashboard/CommandPalette'
import { KeyboardShortcutsProvider } from '@/contexts/KeyboardShortcutsContext'
import { KeyboardShortcutsManager } from '@/components/dashboard/KeyboardShortcutsManager'
import { ToastProvider } from '@/components/ui/toast'
import { NovaCopilotProvider } from '@/contexts/NovaCopilotContext'
import { NovaCopilot } from '@/components/dashboard/NovaCopilot'
import { RealtimeProvider } from '@/contexts/RealtimeContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <ToastProvider>
      <KeyboardShortcutsProvider>
        <CommandPaletteProvider>
          <RealtimeProvider>
          <NovaCopilotProvider>
            <div className="flex h-screen overflow-hidden bg-transparent">

              {/* Mobile header */}
              <MobileHeader
                onMenuClick={toggleMobileMenu}
                isMenuOpen={isMobileMenuOpen}
              />

              {/* Desktop sidebar - hidden on mobile */}
              <div className="hidden lg:block">
                <Sidebar />
              </div>

              {/* Mobile sidebar overlay */}
              <MobileSidebarOverlay isOpen={isMobileMenuOpen} onClose={closeMobileMenu}>
                <Sidebar className="h-full" onNavigate={closeMobileMenu} />
              </MobileSidebarOverlay>

              {/* Main content area */}
            <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 bg-background">
              <div className="p-4 lg:p-6 animate-page-enter">
                {children}
              </div>
            </main>

              {/* Keyboard Shortcuts Manager - handles global shortcuts and help modal */}
              <KeyboardShortcutsManager />

              {/* Nova Copilot UI */}
              <NovaCopilot />
            </div>
          </NovaCopilotProvider>
          </RealtimeProvider>
        </CommandPaletteProvider>
      </KeyboardShortcutsProvider>
    </ToastProvider>
  )
}
