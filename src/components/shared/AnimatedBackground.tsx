'use client'

import { cn } from '@/lib/utils'

interface AnimatedBackgroundProps {
  className?: string
  intensity?: 'subtle' | 'medium' | 'strong'
}

export function AnimatedBackground({
  className,
  intensity = 'subtle'
}: AnimatedBackgroundProps) {
  const opacityMap = {
    subtle: 'opacity-30',
    medium: 'opacity-50',
    strong: 'opacity-70',
  }

  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-100 dark:from-[#09090B] dark:via-[#1A1625]/30 dark:to-[#09090B]" />

      {/* Animated gradient mesh */}
      <div className={cn('absolute inset-0', opacityMap[intensity])}>
        {/* Blob 1 - Top left */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-primary-200 to-primary-400 rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '0s' }}
        />

        {/* Blob 2 - Top right */}
        <div
          className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-purple-200 to-primary-300 rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '-10s' }}
        />

        {/* Blob 3 - Bottom center */}
        <div
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-tr from-pink-100 to-primary-200 rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '-20s' }}
        />

        {/* Blob 4 - Center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary-100/50 to-transparent rounded-full blur-3xl"
          style={{ animation: 'pulse 8s ease-in-out infinite' }}
        />
      </div>

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
