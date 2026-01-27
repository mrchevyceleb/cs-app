'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useShortcutsList } from '@/hooks/useKeyboardShortcuts'
import { Keyboard, Navigation, Ticket, Settings } from 'lucide-react'

interface KeyboardShortcutsHelpProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
      {children}
    </kbd>
  )
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  // Parse the shortcut string to render multiple keys
  const parts = shortcut.split('+').flatMap(part => {
    if (part.includes(' then ')) {
      return part.split(' then ').map((p, i, arr) => ({
        key: p.trim(),
        connector: i < arr.length - 1 ? 'then' : null
      }))
    }
    return [{ key: part.trim(), connector: null }]
  })

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
      <div className="flex items-center gap-1">
        {parts.map((part, index) => (
          <span key={index} className="flex items-center gap-1">
            <ShortcutKey>{part.key}</ShortcutKey>
            {part.connector && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mx-1">then</span>
            )}
            {index < parts.length - 1 && !part.connector && (
              <span className="text-xs text-gray-500 dark:text-gray-400">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function ShortcutCategory({
  title,
  icon: Icon,
  shortcuts,
  note,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  shortcuts: { key: string; description: string }[]
  note?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Icon className="h-4 w-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {note && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{note}</p>
      )}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {shortcuts.map((shortcut) => (
          <ShortcutRow
            key={shortcut.key}
            shortcut={shortcut.key}
            description={shortcut.description}
          />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const { navigationShortcuts, ticketShortcuts, generalShortcuts } = useShortcutsList()

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary-500" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <ShortcutCategory
            title="Global Navigation"
            icon={Navigation}
            shortcuts={navigationShortcuts}
          />

          <ShortcutCategory
            title="Ticket Actions"
            icon={Ticket}
            shortcuts={ticketShortcuts}
            note="Available when viewing a ticket"
          />

          <ShortcutCategory
            title="General"
            icon={Settings}
            shortcuts={generalShortcuts}
          />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <ShortcutKey>?</ShortcutKey> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
