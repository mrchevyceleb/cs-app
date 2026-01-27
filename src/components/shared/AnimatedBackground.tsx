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
      <div className="absolute inset-0 bg-gradient-to-br from-[#F6F8FB] via-[#EEF2FF]/40 to-[#F1F5F9] dark:from-[#0B0F16] dark:via-[#121A2A]/55 dark:to-[#0B0F16]" />

      {/* Animated gradient mesh */}
      <div className={cn('absolute inset-0', opacityMap[intensity])}>
        {/* Blob 1 - Top left */}
        <div
          className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-primary-200 to-primary-400 dark:from-[#1A223B] dark:to-[#26305A] rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '0s' }}
        />

        {/* Blob 2 - Top right */}
        <div
          className="absolute -top-20 right-0 w-80 h-80 bg-gradient-to-bl from-[#E0E7FF] to-primary-300 dark:from-[#1B2540] dark:to-[#2B3358] rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '-10s' }}
        />

        {/* Blob 3 - Bottom center */}
        <div
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-tr from-[#E2E8F0] to-primary-200 dark:from-[#172435] dark:to-[#25324B] rounded-full blur-3xl animate-gradient-shift"
          style={{ animationDelay: '-20s' }}
        />

        {/* Blob 4 - Center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary-100/45 dark:from-[#253050]/45 to-transparent rounded-full blur-3xl"
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
