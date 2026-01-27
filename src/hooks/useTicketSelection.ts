'use client'

import { useState, useCallback, useMemo } from 'react'

export interface UseTicketSelectionReturn {
  /** Set of selected ticket IDs */
  selectedIds: Set<string>
  /** Check if a ticket is selected */
  isSelected: (id: string) => boolean
  /** Select a single ticket */
  selectTicket: (id: string) => void
  /** Deselect a single ticket */
  deselectTicket: (id: string) => void
  /** Toggle selection of a ticket */
  toggleTicket: (id: string) => void
  /** Select all tickets from an array of IDs */
  selectAll: (ids: string[]) => void
  /** Clear all selections */
  clearSelection: () => void
  /** Number of selected tickets */
  selectedCount: number
  /** Whether any tickets are selected (selection mode active) */
  hasSelection: boolean
}

export function useTicketSelection(): UseTicketSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const selectTicket = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const deselectTicket = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleTicket = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])
  const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds])

  return {
    selectedIds,
    isSelected,
    selectTicket,
    deselectTicket,
    toggleTicket,
    selectAll,
    clearSelection,
    selectedCount,
    hasSelection,
  }
}
