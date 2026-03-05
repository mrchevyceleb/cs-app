'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Keep data warm during tab/page navigation
            gcTime: 15 * 60 * 1000, // keep cache warm during navigation
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: (failureCount, error) => {
              // Don't retry on AbortError (user cancelled)
              if (error instanceof Error && error.name === 'AbortError') {
                return false
              }
              // Retry up to 2 times for other errors
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
