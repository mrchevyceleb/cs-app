'use client'

import { useState, useEffect, useCallback } from 'react'

export type ViewMode = 'list' | 'board'

const STORAGE_KEY = 'cs-app-view-preference'
const DEFAULT_VIEW: ViewMode = 'list'

export function useViewPreference(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'list' || stored === 'board') {
      setViewModeState(stored)
    }
  }, [])

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [])

  return [viewMode, setViewMode]
}
