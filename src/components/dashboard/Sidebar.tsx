'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/shared/Logo'
import { NovaAvatar } from '@/components/shared/NovaAvatar'
import { useAuth } from '@/components/providers/AuthProvider'
import { signOut } from '@/lib/supabase/actions'
import { useCommandPalette } from '@/components/dashboard/CommandPalette'
import {
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationBell } from '@/components/dashboard/NotificationBell'
import { useNovaCopilot } from '@/contexts/NovaCopilotContext'

// Icons as simple SVG components for clean design
const Icons = {
  inbox: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
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
  knowledge: (props: React.SVGProps<SVGSVGElement>) => (
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
  moon: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
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
  logout: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
  command: (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  ),
}

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const { agent, user, isLoading } = useAuth()
  const { setOpen: openCommandPalette } = useCommandPalette()
  const { open: openNova } = useNovaCopilot()
  const ticketCountQuery = useQuery({
    queryKey: ['ticket-count'],
    queryFn: async () => {
      const response = await fetch('/api/tickets?limit=1')
      if (!response.ok) {
        throw new Error('Failed to fetch ticket count')
      }
      const data = await response.json()
      return data.total || 0
    },
    staleTime: 60 * 1000,
  })

  const ticketCount = ticketCountQuery.data ?? null

  const navItems = [
    { href: '/', icon: Icons.inbox, label: 'Dashboard', badge: null },
    { href: '/tickets', icon: Icons.tickets, label: 'Tickets', badge: ticketCount !== null ? String(ticketCount) : null },
    { href: '/knowledge', icon: Icons.knowledge, label: 'Knowledge Base', badge: null },
    { href: '/analytics', icon: Icons.analytics, label: 'Analytics', badge: null },
  ]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-amber-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col h-screen w-64 border-r bg-sidebar border-sidebar-border/70 shadow-[var(--shadow-lg)] transition-all duration-300',
          className
        )}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-sidebar-border/50">
          <Logo size="md" />
        </div>

        {/* Command Palette Trigger */}
        <div className="px-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-muted-foreground bg-card"
            onClick={() => openCommandPalette(true)}
          >
            <Icons.command className="w-4 h-4" />
            <span className="flex-1 text-left text-sm">Search...</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary shadow-[var(--shadow-xs)] border border-sidebar-border/60'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'w-5 h-5',
                    isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'
                  )} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-semibold rounded-full',
                      isActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : 'bg-sidebar-accent text-sidebar-foreground'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <Separator className="my-4" />

          {/* Nova AI Copilot Section */}
          <div
            className="p-3 rounded-xl border border-[var(--nova-border)] bg-[image:var(--nova-gradient-bg)] shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <NovaAvatar size="sm" />
              <div>
                <p className="text-sm font-semibold text-foreground">Nova</p>
                <p className="text-xs text-primary font-medium">AI Copilot</p>
              </div>
            </div>
            <p className="text-xs mb-3 text-muted-foreground">
              Ready to help with tickets, lookups, and responses.
            </p>
            <Button
              size="sm"
              className="w-full shadow-sm"
              onClick={openNova}
            >
              Ask Nova
            </Button>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-sidebar-border">
          {/* Settings, Notifications, and Theme Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              onClick={onNavigate}
              className={cn(
                'flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
            >
              <Icons.settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            <NotificationBell />
            <ThemeToggle />
          </div>

          <Separator className="my-2" />

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-sidebar-accent transition-colors">
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={agent?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {agent?.name ? getInitials(agent.name) : user?.email?.[0].toUpperCase() || 'AG'}
                    </AvatarFallback>
                  </Avatar>
                  {agent?.status && (
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
                        getStatusColor(agent.status)
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {isLoading ? 'Loading...' : agent?.name || user?.email?.split('@')[0] || 'Agent'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {agent?.email || user?.email || 'agent@r-link.com'}
                  </p>
                </div>
                <Icons.settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Icons.settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 dark:text-red-400 cursor-pointer"
                onClick={() => signOut()}
              >
                <Icons.logout className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}
