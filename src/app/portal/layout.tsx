'use client'

import { Logo } from '@/components/shared/Logo'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Logo size="sm" showText={true} />
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
              Customer Portal
            </span>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Powered by{' '}
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                R-Link
              </span>
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  )
}
