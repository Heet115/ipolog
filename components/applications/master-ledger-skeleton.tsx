import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function MasterLedgerSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* 5 Metrics Cards Strip Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-none border border-border/70 bg-card p-3 shadow-none"
          >
            <Skeleton className="h-3 w-24 rounded-none" />
            <Skeleton className="h-7 w-32 rounded-none" />
          </div>
        ))}
      </div>

      {/* Filter and Controls Toolbar Skeleton */}
      <Card className="rounded-none border border-border/70 bg-card shadow-none">
        <CardContent className="flex flex-col gap-3.5 p-3.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <Skeleton className="h-8 w-full max-w-md rounded-none" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-32 rounded-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16 rounded-none" />
                <Skeleton className="h-8 w-full rounded-none" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <div className="border border-border/70 bg-card">
        {/* Table Filter Pills Skeleton */}
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-none" />
          ))}
        </div>

        {/* Table Header Skeleton */}
        <div className="grid grid-cols-8 gap-4 border-b border-border/60 bg-muted/40 px-4 py-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-full rounded-none" />
          ))}
        </div>

        {/* 6 Table Rows Skeleton */}
        <div className="flex flex-col divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-8 items-center gap-4 px-4 py-3.5"
            >
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-5 w-20 rounded-none" />
              <Skeleton className="h-4 w-full rounded-none" />
              <Skeleton className="h-6 w-8 justify-self-end rounded-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
