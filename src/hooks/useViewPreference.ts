'use client'

import { useCallback, useSyncExternalStore } from 'react'

export type ViewMode = 'list' | 'board'

const STORAGE_KEY = 'cs-app-view-preference'
const DEFAULT_VIEW: ViewMode = 'board'

function readView(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'list' || stored === 'board') return stored
  } catch {}
  return DEFAULT_VIEW
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onStoreChange)
  return () => window.removeEventListener('storage', onStoreChange)
}

// Use useSyncExternalStore so the server snapshot (DEFAULT_VIEW) matches the
// first client render — avoids React error #418 (hydration mismatch) when a
// previous session stored a different value in localStorage.
export function useViewPreference(): [ViewMode, (mode: ViewMode) => void] {
  const viewMode = useSyncExternalStore(subscribe, readView, () => DEFAULT_VIEW)

  const setViewMode = useCallback((mode: ViewMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
      // localStorage events don't fire in the same tab, so dispatch one ourselves
      // to keep useSyncExternalStore in sync.
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: mode }))
    } catch {}
  }, [])

  return [viewMode, setViewMode]
}
