'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Animated Logo Mark */}
      <div className={cn('relative', sizes[size])}>
        {/* Outer ring with gradient */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 animate-pulse-ring" />
        {/* Inner solid */}
        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-white"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* R-Link icon - stylized "R" with connection dots */}
            <path d="M4 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H4V4z" />
            <path d="M4 12h4l8 8" />
            <circle cx="18" cy="6" r="2" fill="currentColor" />
            <circle cx="18" cy="18" r="2" fill="currentColor" />
            <path d="M18 8v8" strokeDasharray="2 2" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={cn('font-bold tracking-tight text-foreground', textSizes[size])}>
            R-Link
          </span>
          <span className="text-xs -mt-1" style={{ color: '#475569' }}>
            Support Hub
          </span>
        </div>
      )}
    </div>
  )
}
