"use client"

import { CheckCircle2, XCircle, Clock, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { AllotmentStatusFilter } from "@/hooks/use-check-allotment"

interface CheckAllotmentProgressBarProps {
  verifiedCount: number
  totalCount: number
  progressPercent: number
  pendingCount: number
  allottedCount: number
  notAllottedCount: number
  isBulkUpdating: boolean
  statusFilter: AllotmentStatusFilter
  onStatusFilterChange: (status: AllotmentStatusFilter) => void
  onMarkAllPendingNotAllotted: () => void
}

export function CheckAllotmentProgressBar({
  verifiedCount,
  totalCount,
  progressPercent,
  pendingCount,
  allottedCount,
  notAllottedCount,
  isBulkUpdating,
  statusFilter,
  onStatusFilterChange,
  onMarkAllPendingNotAllotted,
}: CheckAllotmentProgressBarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-none border border-border/70 bg-card p-2.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Allotment Status
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            ({verifiedCount}/{totalCount} checked • {progressPercent}%)
          </span>
        </div>

        {pendingCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={isBulkUpdating}
            onClick={onMarkAllPendingNotAllotted}
            className="h-6 self-start text-[11px] text-muted-foreground hover:text-foreground sm:self-auto"
          >
            <CheckCheck
              className="size-3 text-muted-foreground"
              data-icon="inline-start"
            />
            Mark {pendingCount} pending as Not Allotted
          </Button>
        )}
      </div>

      <Progress value={progressPercent} className="h-1 w-full bg-muted" />

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <Button
          type="button"
          variant={statusFilter === "all" ? "default" : "outline"}
          size="xs"
          onClick={() => onStatusFilterChange("all")}
          className="h-6 text-[11px]"
        >
          All ({totalCount})
        </Button>
        <Button
          type="button"
          variant={statusFilter === "pending" ? "default" : "outline"}
          size="xs"
          onClick={() => onStatusFilterChange("pending")}
          className="h-6 rounded-none text-[11px]"
        >
          <Clock
            className="size-3 text-warning-foreground"
            data-icon="inline-start"
          />
          Pending ({pendingCount})
        </Button>
        <Button
          type="button"
          variant={statusFilter === "allotted" ? "default" : "outline"}
          size="xs"
          onClick={() => onStatusFilterChange("allotted")}
          className="h-6 rounded-none text-[11px]"
        >
          <CheckCircle2
            className="size-3 text-success"
            data-icon="inline-start"
          />
          Allotted ({allottedCount})
        </Button>
        <Button
          type="button"
          variant={statusFilter === "not_allotted" ? "default" : "outline"}
          size="xs"
          onClick={() => onStatusFilterChange("not_allotted")}
          className="h-6 text-[11px]"
        >
          <XCircle
            className="size-3 text-muted-foreground"
            data-icon="inline-start"
          />
          Not Allotted ({notAllottedCount})
        </Button>
      </div>
    </div>
  )
}
