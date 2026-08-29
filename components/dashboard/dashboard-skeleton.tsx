import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* 3-Part Hero Card Skeleton */}
      <Card className="overflow-hidden rounded-none border border-border/80">
        <div className="grid grid-cols-1 divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col justify-between gap-3 p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="size-4" />
              </div>
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </Card>

      {/* 4 Secondary Tiles Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-none border border-border/60">
            <CardContent className="flex flex-col gap-2 p-3.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-2.5 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2-Column Section Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-3 rounded-none border border-border/60 p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-32 w-full" />
          </Card>
          <Card className="flex flex-col gap-3 rounded-none border border-border/60 p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 rounded-none border border-border/60 p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-44 w-full" />
          </Card>
          <Card className="flex flex-col gap-3 rounded-none border border-border/60 p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      </div>
    </div>
  )
}
