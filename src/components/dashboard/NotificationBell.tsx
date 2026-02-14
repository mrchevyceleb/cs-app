'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  CheckCheck,
  ArrowRightLeft,
  UserPlus,
  AlertTriangle,
  AtSign,
  Star,
  MessageSquare,
  Loader2,
  X,
} from 'lucide-react'
import type { AgentNotificationWithDetails, NotificationType } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
  className?: string
  onNavigateToTicket?: (ticketId: string) => void
}

type NotificationData = {
  notifications: AgentNotificationWithDetails[]
  unreadCount: number
}

const NOTIFICATIONS_LIMIT = 20
const notificationsQueryKey = ['notifications', NOTIFICATIONS_LIMIT] as const

const notificationIcons: Record<NotificationType, React.ElementType> = {
  mention: AtSign,
  handoff: ArrowRightLeft,
  assignment: UserPlus,
  escalation: AlertTriangle,
  feedback: Star,
}

const notificationColors: Record<NotificationType, { icon: string; bg: string }> = {
  mention: {
    icon: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  handoff: {
    icon: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  assignment: {
    icon: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  escalation: {
    icon: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  feedback: {
    icon: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
}

export function NotificationBell({
  className,
  onNavigateToTicket,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const notificationsQuery = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/notifications?limit=${NOTIFICATIONS_LIMIT}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      return response.json() as Promise<NotificationData>
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    staleTime: 15 * 1000,
  })

  const updateNotifications = useCallback((updater: (current: NotificationData) => NotificationData) => {
    queryClient.setQueryData<NotificationData>(notificationsQueryKey, (old) => {
      if (!old) {
        return updater({ notifications: [], unreadCount: 0 })
      }
      return updater(old)
    })
  }, [queryClient])

  const markAsReadMutation = useMutation({
    mutationFn: async (notification: AgentNotificationWithDetails) => {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }
    },
    onMutate: (notification) => {
      const previous = queryClient.getQueryData<NotificationData>(notificationsQueryKey)

      updateNotifications((current) => {
        const alreadyRead = Boolean(notification.read_at)
        const notifications = current.notifications.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: item.read_at || new Date().toISOString() }
            : item
        )

        return {
          notifications,
          unreadCount: alreadyRead ? current.unreadCount : Math.max(0, current.unreadCount - 1),
        }
      })

      return { previous }
    },
    onError: (error, _notification, context) => {
      console.error('Failed to mark notification as read:', error)
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous)
      }
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }
    },
    onMutate: () => {
      const previous = queryClient.getQueryData<NotificationData>(notificationsQueryKey)

      updateNotifications((current) => ({
        notifications: current.notifications.map((item) => ({
          ...item,
          read_at: item.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }))

      return { previous }
    },
    onError: (error, _vars, context) => {
      console.error('Failed to mark all notifications as read:', error)
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous)
      }
    },
  })

  const dismissMutation = useMutation({
    mutationFn: async (notification: AgentNotificationWithDetails) => {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to dismiss notification')
      }
    },
    onMutate: (notification) => {
      const previous = queryClient.getQueryData<NotificationData>(notificationsQueryKey)

      updateNotifications((current) => {
        const notifications = current.notifications.filter((item) => item.id !== notification.id)
        const unreadCount = notification.read_at
          ? current.unreadCount
          : Math.max(0, current.unreadCount - 1)

        return { notifications, unreadCount }
      })

      return { previous }
    },
    onError: (error, _notification, context) => {
      console.error('Failed to dismiss notification:', error)
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous)
      }
    },
  })

  useEffect(() => {
    if (isOpen) {
      notificationsQuery.refetch()
    }
  }, [isOpen, notificationsQuery.refetch])

  const notifications = notificationsQuery.data?.notifications || []
  const unreadCount = notificationsQuery.data?.unreadCount || 0

  const handleMarkAsRead = (notification: AgentNotificationWithDetails) => {
    if (notification.read_at) return
    markAsReadMutation.mutate(notification)
  }

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate()
  }

  const handleDismiss = (notification: AgentNotificationWithDetails) => {
    dismissMutation.mutate(notification)
  }

  const handleNotificationClick = (notification: AgentNotificationWithDetails) => {
    handleMarkAsRead(notification)

    if (notification.ticket_id && onNavigateToTicket) {
      onNavigateToTicket(notification.ticket_id)
      setIsOpen(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const hasImportant = notifications.some(
    (n) =>
      !n.read_at &&
      (n.type === 'escalation' || n.type === 'handoff')
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative h-9 w-9', className)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold rounded-full',
                hasImportant
                  ? 'bg-red-500 text-white'
                  : 'bg-primary-500 text-white'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllReadMutation.isPending}
              className="text-xs h-7"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <Bell className="h-12 w-12 opacity-20 mb-3" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || MessageSquare
                const colors = notificationColors[notification.type] || {
                  icon: 'text-gray-600',
                  bg: 'bg-gray-100',
                }
                const isUnread = !notification.read_at

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'relative group',
                      isUnread && 'bg-primary-50/50 dark:bg-primary-900/10'
                    )}
                  >
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                            colors.bg
                          )}
                        >
                          <Icon className={cn('h-4 w-4', colors.icon)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={cn(
                                'text-sm',
                                isUnread
                                  ? 'font-medium text-gray-900 dark:text-white'
                                  : 'text-gray-700 dark:text-gray-300'
                              )}
                            >
                              {notification.title}
                            </p>
                            {isUnread && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                            )}
                          </div>

                          {notification.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            {notification.from_agent && (
                              <div className="flex items-center gap-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage
                                    src={notification.from_agent.avatar_url || ''}
                                  />
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(notification.from_agent.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                  {notification.from_agent.name}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Dismiss Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(notification)
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false)
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
