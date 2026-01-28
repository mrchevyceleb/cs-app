import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header Skeleton */}
      <div>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Profile Card Skeleton */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <Skeleton className="h-5 w-16 mb-1" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>

      {/* Appearance Card Skeleton */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-card border-border/70">
          <CardHeader>
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}

      {/* Nova AI Card Skeleton */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-36 mb-1" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
