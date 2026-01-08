'use client'

import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ConfidenceScoreProps {
  value: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ConfidenceScore({ value, showLabel = false, size = 'md' }: ConfidenceScoreProps) {
  const getColor = () => {
    if (value >= 80) return 'bg-emerald-500'
    if (value >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getLabel = () => {
    if (value >= 80) return 'High confidence'
    if (value >= 60) return 'Moderate confidence'
    return 'Low confidence'
  }

  const getGradient = () => {
    if (value >= 80) return 'from-emerald-500 to-emerald-400'
    if (value >= 60) return 'from-amber-500 to-amber-400'
    return 'from-red-500 to-red-400'
  }

  const sizeClasses = {
    sm: { bar: 'w-12 h-1.5', text: 'text-[10px]' },
    md: { bar: 'w-16 h-2', text: 'text-xs' },
    lg: { bar: 'w-24 h-2.5', text: 'text-sm' },
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <div className={cn(
              'bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
              sizeClasses[size].bar
            )}>
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 bg-gradient-to-r',
                  getGradient()
                )}
                style={{ width: `${value}%` }}
              />
            </div>
            <span className={cn(
              'text-gray-500 dark:text-gray-400 tabular-nums font-medium',
              sizeClasses[size].text
            )}>
              {value}%
            </span>
            {showLabel && (
              <span className={cn(
                'text-gray-400 dark:text-gray-500',
                sizeClasses[size].text
              )}>
                {getLabel()}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getLabel()}</p>
          <p className="text-xs text-muted-foreground">
            AI is {value}% confident in handling this ticket
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
