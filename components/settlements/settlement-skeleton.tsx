import { Skeleton } from "@/components/ui/skeleton"

export function SettlementSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-48 rounded-none" />
            <Skeleton className="h-5 w-24 rounded-none" />
          </div>
          <Skeleton className="h-4 w-72 rounded-none" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-none" />
        </div>
      </div>

      {/* Metrics Strip Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border border-border/70 bg-card p-3.5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded-none" />
              <Skeleton className="size-6 rounded-none" />
            </div>
            <Skeleton className="h-7 w-32 rounded-none" />
            <Skeleton className="h-3 w-20 rounded-none" />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-border/70 pb-2">
          <Skeleton className="h-7 w-28 rounded-none" />
          <Skeleton className="h-7 w-32 rounded-none" />
          <Skeleton className="h-7 w-28 rounded-none" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-72 rounded-none" />
          <Skeleton className="h-8 w-28 rounded-none" />
        </div>
      </div>

      {/* Partner Cards Skeleton */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 border border-border/70 bg-card p-4.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 rounded-none" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-36 rounded-none" />
                  <Skeleton className="h-3 w-24 rounded-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32 rounded-none" />
                <Skeleton className="h-8 w-24 rounded-none" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
