"use client"

import {
  CheckCircle2,
  XCircle,
  Clock,
  PartyPopper,
  RotateCcw,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils/ipo"

interface BulkAllotmentOverviewProps {
  allottedCount: number
  soldCount: number
  notAllottedCount: number
  pendingCount: number
  totalInvested: number
  totalRefund: number
  totalDecided: number
  successRate: number
  onAllAllotted: () => void
  onAllNotAllotted: () => void
  onOpenResetConfirm: () => void
  search: string
  onSearchChange: (val: string) => void
}

export function BulkAllotmentOverview({
  allottedCount,
  soldCount,
  notAllottedCount,
  pendingCount,
  totalInvested,
  totalRefund,
  totalDecided,
  successRate,
  onAllAllotted,
  onAllNotAllotted,
  onOpenResetConfirm,
  search,
  onSearchChange,
}: BulkAllotmentOverviewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-none border bg-muted/30 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-success">
            <CheckCircle2 className="size-3.5" /> {allottedCount + soldCount}{" "}
            Allotted
          </span>
          <span className="flex items-center gap-1 font-semibold text-destructive">
            <XCircle className="size-3.5" /> {notAllottedCount} Not Allotted
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="size-3.5" /> {pendingCount} Pending
          </span>
        </div>

        <div className="flex items-center gap-3 text-right font-mono">
          <span className="text-xs text-muted-foreground">
            Invested:{" "}
            <strong className="text-foreground">
              {formatCurrency(totalInvested)}
            </strong>
          </span>
          <span className="text-xs text-muted-foreground">
            Refunds:{" "}
            <strong className="text-warning-foreground">
              {formatCurrency(totalRefund)}
            </strong>
          </span>
        </div>
      </div>

      {/* Allotment Rate Progress Bar */}
      {totalDecided > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Allotment Rate</span>
            <span className="font-mono font-semibold text-foreground">
              {successRate.toFixed(0)}% Success
            </span>
          </div>
          <Progress value={successRate} className="h-1.5 w-full bg-muted" />
        </div>
      )}

      {/* Quick Action Presets + Search */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">
            Quick Actions:
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onAllAllotted}
            className="h-7 text-xs"
          >
            <PartyPopper data-icon="inline-start" />
            All Allotted
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onAllNotAllotted}
            className="h-7 text-xs"
          >
            <XCircle data-icon="inline-start" />
            All Not Allotted
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onOpenResetConfirm}
            className="h-7 text-xs"
          >
            <RotateCcw data-icon="inline-start" />
            Reset All
          </Button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-48">
          <Search className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter accounts..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-7 bg-background pl-7 text-xs"
          />
        </div>
      </div>
    </div>
  )
}
