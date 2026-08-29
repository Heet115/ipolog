import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function IpoDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>

      {/* Main IPO Header Card Skeleton */}
      <Card className="rounded-none border border-border/70">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex w-1/2 flex-col gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-none border border-border/50 bg-muted/40 p-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>

          <Skeleton className="h-16 w-full rounded-none" />
        </CardContent>
      </Card>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-none border border-border/60">
            <CardContent className="flex flex-col gap-1.5 p-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applications Table Card Skeleton */}
      <Card className="rounded-none border border-border/70">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 p-4 pb-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-7 w-32" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-48 w-full rounded-none" />
        </CardContent>
      </Card>
    </div>
  )
}
