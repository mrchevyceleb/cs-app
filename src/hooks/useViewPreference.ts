'use client'

import { useState, useCallback } from 'react'

export type ViewMode = 'list' | 'board'

const STORAGE_KEY = 'cs-app-view-preference'
const DEFAULT_VIEW: ViewMode = 'board'

export function useViewPreference(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_VIEW
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'list' || stored === 'board') return stored
    } catch {}
    return DEFAULT_VIEW
  })

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  return [viewMode, setViewMode]
}
