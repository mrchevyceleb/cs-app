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
    <div className={cn('fixed inset-0 -z-10 overflow-hidden pointer-events-none', className)}>
      {/* Animated gradient mesh */}
      <div className={cn('absolute inset-0', opacityMap[intensity])}>
        {/* Blob 1 - Top left - Softer Indigo */}
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-300/50 dark:bg-primary-900/30 rounded-full blur-[100px] animate-gradient-shift mix-blend-multiply dark:mix-blend-screen"
          style={{ animationDelay: '0s' }}
        />

        {/* Blob 2 - Top right - Subtle Purple */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-300/40 dark:bg-purple-900/30 rounded-full blur-[120px] animate-gradient-shift mix-blend-multiply dark:mix-blend-screen"
          style={{ animationDelay: '-5s' }}
        />

        {/* Blob 3 - Bottom left - Warm Slate */}
        <div
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-slate-300/60 dark:bg-slate-800/30 rounded-full blur-[100px] animate-gradient-shift mix-blend-multiply dark:mix-blend-screen"
          style={{ animationDelay: '-10s' }}
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
