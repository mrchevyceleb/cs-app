'use client'

import { List, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ViewToggleProps {
  viewMode: 'list' | 'board'
  onViewModeChange: (mode: 'list' | 'board') => void
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="List view"
        className={cn(
          viewMode === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onViewModeChange('list')}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Board view"
        className={cn(
          viewMode === 'board'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={() => onViewModeChange('board')}
      >
        <Columns3 className="w-4 h-4" />
      </Button>
    </div>
  )
}
