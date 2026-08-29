import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function BankListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-full max-w-sm" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-3 p-3.5">
              <div className="flex items-start justify-between">
                <div className="flex w-3/4 items-center gap-2.5">
                  <Skeleton className="size-8 rounded-md" />
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="size-6 rounded" />
              </div>
              <Skeleton className="h-20 w-full rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
