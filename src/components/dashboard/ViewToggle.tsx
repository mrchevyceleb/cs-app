'use client'

import { List, Columns3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  viewMode: 'list' | 'board'
  onViewModeChange: (mode: 'list' | 'board') => void
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border/50">
      <button
        aria-label="List view"
        onClick={() => onViewModeChange('list')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
          viewMode === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <List className="w-4 h-4" />
        <span>List</span>
      </button>
      <button
        aria-label="Board view"
        onClick={() => onViewModeChange('board')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
          viewMode === 'board'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Columns3 className="w-4 h-4" />
        <span>Board</span>
      </button>
    </div>
  )
}
