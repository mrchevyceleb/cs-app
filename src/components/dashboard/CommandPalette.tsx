'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ticket, Customer } from '@/types/database'

// Icons
const Icons = {
  search: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  home: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  tickets: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  ),
  book: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  analytics: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  settings: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  sun: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ),
  help: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  ),
  file: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  ),
}

// Status badge colors
const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  escalated: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

type TicketWithCustomer = Ticket & { customer: Customer | null }

// Command Palette Context
interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  )
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [search, setSearch] = React.useState('')
  const [tickets, setTickets] = React.useState<TicketWithCustomer[]>([])
  const [loading, setLoading] = React.useState(false)

  // Fetch recent tickets when palette opens or search changes
  React.useEffect(() => {
    if (!open) return

    const fetchTickets = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        let query = supabase
          .from('tickets')
          .select(`
            *,
            customer:customers(*)
          `)
          .order('updated_at', { ascending: false })
          .limit(5)

        // If there's a search term, filter by subject
        if (search.trim()) {
          query = query.ilike('subject', `%${search}%`)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching tickets:', error)
          return
        }

        setTickets(data as TicketWithCustomer[] || [])
      } catch (err) {
        console.error('Error fetching tickets:', err)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchTickets, 150)
    return () => clearTimeout(debounce)
  }, [open, search])

  // Global keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Reset search when closed
  React.useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  // Navigation items
  const navigationItems = [
    { label: 'Dashboard', href: '/', icon: Icons.home, keywords: ['home', 'main'] },
    { label: 'Tickets', href: '/tickets', icon: Icons.tickets, keywords: ['support', 'issues'] },
    { label: 'Knowledge Base', href: '/knowledge', icon: Icons.book, keywords: ['docs', 'articles', 'help'] },
    { label: 'Analytics', href: '/analytics', icon: Icons.analytics, keywords: ['metrics', 'reports', 'stats'] },
    { label: 'Settings', href: '/settings', icon: Icons.settings, keywords: ['preferences', 'config'] },
  ]

  // Quick actions
  const quickActions = [
    {
      label: 'Create New Ticket',
      icon: Icons.plus,
      action: () => router.push('/tickets/new'),
      keywords: ['new', 'add', 'create'],
    },
    {
      label: 'Search Knowledge Base',
      icon: Icons.search,
      action: () => router.push('/knowledge?search=true'),
      keywords: ['find', 'lookup'],
    },
    {
      label: 'Toggle Theme',
      icon: theme === 'dark' ? Icons.sun : Icons.moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      keywords: ['dark', 'light', 'mode', 'appearance'],
    },
    {
      label: 'Open Help',
      icon: Icons.help,
      action: () => router.push('/help'),
      keywords: ['support', 'documentation', 'faq'],
    },
  ]

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command Palette"
      className={cn(
        'fixed inset-0 z-50',
        'flex items-start justify-center pt-[20vh]'
      )}
    >
      {/* Visually hidden title for accessibility */}
      <DialogPrimitive.Title className="sr-only">Command Palette</DialogPrimitive.Title>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Menu */}
      <div className={cn(
        'relative z-50 w-full max-w-[640px] mx-4',
        'bg-card rounded-xl shadow-2xl',
        'border border-border',
        'overflow-hidden',
        'animate-in fade-in-0 zoom-in-95 duration-200'
      )}>
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Icons.search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className={cn(
              'flex-1 h-14 px-4 bg-transparent',
              'text-foreground placeholder:text-muted-foreground',
              'outline-none border-none',
              'text-base'
            )}
          />
          <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Command List */}
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {loading ? 'Searching...' : 'No results found.'}
          </Command.Empty>

          {/* Navigation Group */}
          <Command.Group heading="Navigation" className="px-2 py-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">
              Navigation
            </span>
            <div className="mt-2 space-y-1">
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                    'text-foreground',
                    'data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700',
                    'dark:data-[selected=true]:bg-primary-900/40 dark:data-[selected=true]:text-primary-300',
                    'transition-colors duration-100'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Command.Item>
              ))}
            </div>
          </Command.Group>

          {/* Recent Tickets Group */}
          {tickets.length > 0 && (
            <Command.Group heading="Recent Tickets" className="px-2 py-1.5 mt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">
                Recent Tickets
              </span>
              <div className="mt-2 space-y-1">
                {tickets.map((ticket) => (
                  <Command.Item
                    key={ticket.id}
                    value={`ticket ${ticket.subject} ${ticket.customer?.name || ''}`}
                    onSelect={() => runCommand(() => router.push(`/tickets/${ticket.id}`))}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                      'text-foreground',
                      'data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700',
                      'dark:data-[selected=true]:bg-primary-900/40 dark:data-[selected=true]:text-primary-300',
                      'transition-colors duration-100'
                    )}
                  >
                    <Icons.file className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {ticket.customer?.name || ticket.customer?.email || 'Unknown customer'}
                      </p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                      statusColors[ticket.status] || 'bg-gray-100 text-gray-700'
                    )}>
                      {ticket.status}
                    </span>
                  </Command.Item>
                ))}
              </div>
            </Command.Group>
          )}

          {/* Quick Actions Group */}
          <Command.Group heading="Quick Actions" className="px-2 py-1.5 mt-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">
              Quick Actions
            </span>
            <div className="mt-2 space-y-1">
              {quickActions.map((item) => (
                <Command.Item
                  key={item.label}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => runCommand(item.action)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                    'text-foreground',
                    'data-[selected=true]:bg-primary-50 data-[selected=true]:text-primary-700',
                    'dark:data-[selected=true]:bg-primary-900/40 dark:data-[selected=true]:text-primary-300',
                    'transition-colors duration-100'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Command.Item>
              ))}
            </div>
          </Command.Group>
        </Command.List>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border font-mono">
              Esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </Command.Dialog>
  )
}
