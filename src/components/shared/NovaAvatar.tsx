'use client'

import { cn } from '@/lib/utils'

interface NovaAvatarProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  isThinking?: boolean
}

export function NovaAvatar({
  className,
  size = 'md',
  isThinking = false
}: NovaAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  return (
    <div className={cn('relative', sizes[size], className)}>
      {/* Outer glow ring when thinking */}
      {isThinking && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-400 via-purple-500 to-primary-400 animate-spin-slow opacity-75 blur-sm" />
      )}

      {/* Main orb */}
      <div className={cn(
        'absolute inset-0 rounded-full bg-gradient-to-br from-primary-400 via-purple-500 to-primary-600',
        isThinking && 'animate-pulse'
      )}>
        {/* Inner shine */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 to-transparent" />

        {/* Core */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          {/* Nova symbol - stylized star/sparkle */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-1/2 h-1/2 text-white"
          >
            <path d="M12 2L13.09 8.26L19 9L14.14 12.14L15.77 18.5L12 15.27L8.23 18.5L9.86 12.14L5 9L10.91 8.26L12 2Z" />
          </svg>
        </div>
      </div>

      {/* Orbiting dots when thinking */}
      {isThinking && (
        <>
          <div className="absolute w-2 h-2 rounded-full bg-primary-300 animate-nova-orbit" style={{ animationDelay: '0s' }} />
          <div className="absolute w-1.5 h-1.5 rounded-full bg-purple-300 animate-nova-orbit" style={{ animationDelay: '-0.5s' }} />
          <div className="absolute w-1 h-1 rounded-full bg-primary-400 animate-nova-orbit" style={{ animationDelay: '-1s' }} />
        </>
      )}
    </div>
  )
}
