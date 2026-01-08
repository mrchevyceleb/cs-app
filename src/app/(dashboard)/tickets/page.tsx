'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          All Tickets
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          View and manage all support tickets
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <p className="text-sm text-gray-500 text-center py-4">
            Full ticket management interface will be built in Day 4
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
