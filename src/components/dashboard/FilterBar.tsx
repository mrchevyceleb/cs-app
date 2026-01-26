'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export interface FilterOptions {
  search: string
  status: string[]
  priority: string[]
  aiHandled: 'all' | 'ai' | 'human'
  sortBy: 'created_at' | 'updated_at' | 'priority' | 'ai_confidence'
  sortOrder: 'asc' | 'desc'
}

interface FilterBarProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  className?: string
}

const statusOptions = [
  { value: 'open', label: 'Open', color: 'bg-blue-500' },
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { value: 'escalated', label: 'Escalated', color: 'bg-red-500' },
]

const priorityOptions = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-amber-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
]

// Icons
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

const SortIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="m21 8-4-4-4 4" />
    <path d="M17 4v16" />
  </svg>
)

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

export function FilterBar({ filters, onFiltersChange, className }: FilterBarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const activeFilterCount =
    filters.status.length +
    filters.priority.length +
    (filters.aiHandled !== 'all' ? 1 : 0)

  const updateFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleArrayFilter = (
    key: 'status' | 'priority',
    value: string
  ) => {
    const current = filters[key]
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFilter(key, updated)
  }

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      status: [],
      priority: [],
      aiHandled: 'all',
    })
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap', className)}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search tickets..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9 bg-white dark:bg-[#18181B]"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', '')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FilterIcon className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary-600 hover:text-primary-700"
                  onClick={clearFilters}
                >
                  Clear all
                </Button>
              )}
            </div>

            <Separator />

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-400">Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={() =>
                        toggleArrayFilter('status', option.value)
                      }
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span className={cn('w-2 h-2 rounded-full', option.color)} />
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-400">Priority</Label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${option.value}`}
                      checked={filters.priority.includes(option.value)}
                      onCheckedChange={() =>
                        toggleArrayFilter('priority', option.value)
                      }
                    />
                    <label
                      htmlFor={`priority-${option.value}`}
                      className="text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span className={cn('w-2 h-2 rounded-full', option.color)} />
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* AI Handled Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-400">Handler</Label>
              <Select
                value={filters.aiHandled}
                onValueChange={(v) =>
                  updateFilter('aiHandled', v as FilterOptions['aiHandled'])
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tickets</SelectItem>
                  <SelectItem value="ai">AI handled only</SelectItem>
                  <SelectItem value="human">Human required only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <SortIcon className="w-4 h-4 text-gray-400" />
        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(v) => {
            const [sortBy, sortOrder] = v.split('-') as [
              FilterOptions['sortBy'],
              FilterOptions['sortOrder']
            ]
            onFiltersChange({ ...filters, sortBy, sortOrder })
          }}
        >
          <SelectTrigger className="w-[180px] bg-white dark:bg-[#18181B]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at-desc">Newest first</SelectItem>
            <SelectItem value="created_at-asc">Oldest first</SelectItem>
            <SelectItem value="updated_at-desc">Recently updated</SelectItem>
            <SelectItem value="priority-desc">Highest priority</SelectItem>
            <SelectItem value="priority-asc">Lowest priority</SelectItem>
            <SelectItem value="ai_confidence-asc">Low confidence first</SelectItem>
            <SelectItem value="ai_confidence-desc">High confidence first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.status.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1 capitalize cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => toggleArrayFilter('status', status)}
            >
              {status}
              <XIcon className="w-3 h-3" />
            </Badge>
          ))}
          {filters.priority.map((priority) => (
            <Badge
              key={priority}
              variant="secondary"
              className="gap-1 capitalize cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => toggleArrayFilter('priority', priority)}
            >
              {priority}
              <XIcon className="w-3 h-3" />
            </Badge>
          ))}
          {filters.aiHandled !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => updateFilter('aiHandled', 'all')}
            >
              {filters.aiHandled === 'ai' ? 'AI only' : 'Human only'}
              <XIcon className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

// Default filter state helper
export const defaultFilters: FilterOptions = {
  search: '',
  status: [],
  priority: [],
  aiHandled: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
}
