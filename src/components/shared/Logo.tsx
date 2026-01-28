'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
  }

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Image
        src="/r-link-logo.png"
        alt="R-Link Logo"
        width={sizes[size]}
        height={sizes[size]}
        className="object-contain"
      />

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
