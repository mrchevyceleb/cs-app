'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileHeader, MobileSidebarOverlay } from '@/components/dashboard/MobileHeader'
import { AnimatedBackground } from '@/components/shared/AnimatedBackground'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Animated background */}
      <AnimatedBackground intensity="subtle" />

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
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
