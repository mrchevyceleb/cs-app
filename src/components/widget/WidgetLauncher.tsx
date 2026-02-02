'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetConfig } from '@/types/widget'
import type { CSSProperties } from 'react'

interface WidgetLauncherProps {
  config: WidgetConfig
  onClick: () => void
  style?: CSSProperties
}

const TEASER_DISMISSED_KEY = 'cs_widget_teaser_dismissed'

export function WidgetLauncher({ config, onClick, style }: WidgetLauncherProps) {
  const [teaserVisible, setTeaserVisible] = useState(false)
  const [teaserText, setTeaserText] = useState('')
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotationRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDismissed = useRef(false)
  const teaser = config.teaser

  // Check if teaser was dismissed this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      isDismissed.current = sessionStorage.getItem(TEASER_DISMISSED_KEY) === 'true'
    }
  }, [])

  // Typewriter effect
  const typeMessage = useCallback((message: string) => {
    setIsTyping(true)
    setTeaserText('')
    let charIndex = 0

    const typeChar = () => {
      if (charIndex < message.length) {
        setTeaserText(message.slice(0, charIndex + 1))
        charIndex++
        typewriterRef.current = setTimeout(typeChar, 30)
      } else {
        setIsTyping(false)
      }
    }

    typeChar()
  }, [])

  // Show teaser after delay, rotate messages
  useEffect(() => {
    if (!teaser.enabled || isDismissed.current) return

    const showTimeout = setTimeout(() => {
      setTeaserVisible(true)
      typeMessage(teaser.messages[0])
    }, teaser.delayMs)

    return () => {
      clearTimeout(showTimeout)
      if (typewriterRef.current) clearTimeout(typewriterRef.current)
    }
  }, [teaser.enabled, teaser.delayMs, teaser.messages, typeMessage])

  // Rotate messages
  useEffect(() => {
    if (!teaserVisible || !teaser.enabled || isDismissed.current) return

    rotationRef.current = setInterval(() => {
      setCurrentMessageIndex(prev => {
        const next = (prev + 1) % teaser.messages.length
        typeMessage(teaser.messages[next])
        return next
      })
    }, teaser.intervalMs)

    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current)
    }
  }, [teaserVisible, teaser.enabled, teaser.intervalMs, teaser.messages, typeMessage])

  const dismissTeaser = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTeaserVisible(false)
    isDismissed.current = true
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(TEASER_DISMISSED_KEY, 'true')
    }
    if (typewriterRef.current) clearTimeout(typewriterRef.current)
    if (rotationRef.current) clearInterval(rotationRef.current)
  }

  const isRight = config.position !== 'bottom-left'

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '12px',
        flexDirection: isRight ? 'row' : 'row-reverse',
      }}
    >
      {/* Teaser bubble */}
      {teaserVisible && (
        <div
          className={cn(
            'relative flex items-center gap-2.5',
            'bg-white dark:bg-gray-800',
            'rounded-2xl shadow-lg',
            'px-4 py-3',
            'border border-gray-100 dark:border-gray-700',
            'cursor-pointer',
            'animate-in slide-in-from-bottom-2 fade-in duration-300',
            'max-w-[240px]'
          )}
          onClick={onClick}
        >
          {/* Nova avatar */}
          {config.agentAvatarUrl ? (
            <img
              src={config.agentAvatarUrl}
              alt={config.agentName || 'Nova'}
              className="flex-shrink-0 w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${config.primaryColor}20` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: config.primaryColor }} />
            </div>
          )}

          {/* Message text */}
          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug min-h-[20px]">
            {teaserText}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 ml-0.5 bg-gray-400 animate-pulse align-text-bottom" />
            )}
          </p>

          {/* Dismiss X */}
          <button
            onClick={dismissTeaser}
            className={cn(
              'absolute -top-2 -right-2',
              'w-5 h-5 rounded-full',
              'bg-gray-200 dark:bg-gray-600',
              'flex items-center justify-center',
              'hover:bg-gray-300 dark:hover:bg-gray-500',
              'transition-colors'
            )}
            aria-label="Dismiss"
          >
            <X className="w-3 h-3 text-gray-500 dark:text-gray-300" />
          </button>

          {/* Triangle caret pointing at launcher */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              'w-0 h-0',
              'border-t-[6px] border-t-transparent',
              'border-b-[6px] border-b-transparent',
              isRight
                ? 'right-[-6px] border-l-[6px] border-l-white dark:border-l-gray-800'
                : 'left-[-6px] border-r-[6px] border-r-white dark:border-r-gray-800'
            )}
          />
        </div>
      )}

      {/* Launcher button with pulse */}
      <div className="relative">
        {/* Pulse ring */}
        <div
          className="absolute inset-0 rounded-full animate-widget-pulse"
          style={{
            backgroundColor: config.primaryColor,
            opacity: 0,
          }}
        />

        <button
          onClick={onClick}
          className={cn(
            'relative flex items-center justify-center',
            'w-14 h-14 rounded-full',
            'shadow-lg hover:shadow-xl',
            'transition-all duration-200',
            'hover:scale-110 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'text-white'
          )}
          style={{
            backgroundColor: config.primaryColor,
          }}
          aria-label="Open support chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Pulse animation keyframes */}
      <style jsx global>{`
        @keyframes widget-pulse {
          0% {
            transform: scale(1);
            opacity: 0.4;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-widget-pulse {
          animation: widget-pulse 3s ease-out infinite;
        }
      `}</style>
    </div>
  )
}
