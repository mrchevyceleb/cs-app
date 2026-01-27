'use client'

import { useEffect, useState } from 'react'
import type { WidgetConfig } from '@/types/widget'
import { generateWidgetCSSVariables } from '@/lib/widget/config'

interface WidgetThemeProviderProps {
  config: WidgetConfig
  children: React.ReactNode
}

export function WidgetThemeProvider({ config, children }: WidgetThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Determine theme
  useEffect(() => {
    if (config.theme === 'auto') {
      // Check system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setTheme(mediaQuery.matches ? 'dark' : 'light')

      // Listen for changes
      const handler = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handler)

      return () => {
        mediaQuery.removeEventListener('change', handler)
      }
    } else {
      setTheme(config.theme)
    }
  }, [config.theme])

  // Apply CSS variables
  useEffect(() => {
    const cssVars = generateWidgetCSSVariables(config)
    const root = document.documentElement

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    return () => {
      Object.keys(cssVars).forEach((key) => {
        root.style.removeProperty(key)
      })
    }
  }, [config])

  // Apply dark mode class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
