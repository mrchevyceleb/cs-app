import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Support Widget',
  description: 'Customer support chat widget',
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${inter.variable} font-sans antialiased bg-transparent overflow-hidden`}
      style={{ position: 'fixed', inset: 0, margin: 0, padding: 0 }}
    >
      {children}
    </div>
  )
}
