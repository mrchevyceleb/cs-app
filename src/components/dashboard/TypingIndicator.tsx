'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
  label?: string
}

export function TypingIndicator({
  className,
  label = 'Nova is thinking',
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md',
        'bg-gradient-to-br from-purple-50 to-primary-50',
        'dark:from-purple-900/30 dark:to-primary-900/30',
        className
      )}
    >
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  )
}

export function TypingIndicatorCompact({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span
        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  )
}
