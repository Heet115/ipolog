import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-60 rounded-none" />
          <Skeleton className="h-4 w-96 rounded-none" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-28 rounded-none" />
          <Skeleton className="h-9 w-28 rounded-none" />
        </div>
      </div>

      {/* 4-Column Hero Card Skeleton */}
      <Card className="overflow-hidden rounded-none border border-border/70 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3">
          <Skeleton className="h-4 w-44 rounded-none" />
          <Skeleton className="h-4 w-32 rounded-none" />
        </div>
        <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between gap-3 p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-32 rounded-none" />
                <Skeleton className="size-8 rounded-none" />
              </div>
              <Skeleton className="h-10 w-44 rounded-none" />
              <Skeleton className="h-3 w-48 rounded-none" />
            </div>
          ))}
        </div>
      </Card>

      {/* 4 Secondary Tiles Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card
            key={i}
            className="rounded-none border border-border/70 shadow-xs"
          >
            <CardContent className="flex flex-col justify-between gap-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28 rounded-none" />
                <Skeleton className="size-7 rounded-none" />
              </div>
              <Skeleton className="h-7 w-28 rounded-none" />
              <Skeleton className="h-3 w-36 rounded-none" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2-Column Section Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-3 rounded-none border border-border/70 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44 rounded-none" />
              <Skeleton className="h-7 w-48 rounded-none" />
            </div>
            <Skeleton className="h-52 w-full rounded-none" />
          </Card>
          <Card className="flex flex-col gap-3 rounded-none border border-border/70 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44 rounded-none" />
              <Skeleton className="h-7 w-48 rounded-none" />
            </div>
            <Skeleton className="h-52 w-full rounded-none" />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3 rounded-none border border-border/70 p-5 shadow-xs">
            <Skeleton className="h-5 w-36 rounded-none" />
            <Skeleton className="h-48 w-full rounded-none" />
          </Card>
          <Card className="flex flex-col gap-3 rounded-none border border-border/70 p-5 shadow-xs">
            <Skeleton className="h-5 w-36 rounded-none" />
            <Skeleton className="h-40 w-full rounded-none" />
          </Card>
        </div>
      </div>
    </div>
  )
}
