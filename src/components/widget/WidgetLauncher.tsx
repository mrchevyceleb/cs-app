'use client'

import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetConfig } from '@/types/widget'
import type { CSSProperties } from 'react'

interface WidgetLauncherProps {
  config: WidgetConfig
  onClick: () => void
  style?: CSSProperties
}

export function WidgetLauncher({ config, onClick, style }: WidgetLauncherProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center',
        'w-14 h-14 rounded-full',
        'shadow-lg hover:shadow-xl',
        'transition-all duration-200',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'text-white'
      )}
      style={{
        ...style,
        backgroundColor: config.primaryColor,
      }}
      aria-label="Open support chat"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  )
}
