"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/ipo"

export interface LedgerMetrics {
  totalApplications: number
  totalLots: number
  totalAmount: number
  allottedCount: number
  decidedCount: number
  winRate: number
  realizedGrossProfit: number
  realizedYourProfit: number
  pendingCount: number
}

interface LedgerMetricsStripProps {
  metrics: LedgerMetrics
}

export function LedgerMetricsStrip({ metrics }: LedgerMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
        <CardContent className="flex flex-col gap-1 p-0">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Total Applications
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">
              {metrics.totalApplications}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              ({metrics.totalLots} lots)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
        <CardContent className="flex flex-col gap-1 p-0">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Total Capital Blocked
          </span>
          <span className="font-mono text-xl font-bold text-foreground">
            {formatCurrency(metrics.totalAmount)}
          </span>
        </CardContent>
      </Card>

      <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
        <CardContent className="flex flex-col gap-1 p-0">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Win Rate (Allotment)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">
              {metrics.decidedCount > 0
                ? `${metrics.winRate.toFixed(1)}%`
                : "—"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              ({metrics.allottedCount}/{metrics.decidedCount})
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
        <CardContent className="flex flex-col gap-1 p-0">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Realized Net Profit
          </span>
          <span
            className={`font-mono text-xl font-bold ${
              metrics.realizedYourProfit >= 0
                ? "text-success"
                : "text-destructive"
            }`}
          >
            {metrics.realizedYourProfit >= 0 ? "+" : ""}
            {formatCurrency(metrics.realizedYourProfit)}
          </span>
        </CardContent>
      </Card>

      <Card className="col-span-2 rounded-none border border-border/70 bg-card p-3 shadow-none sm:col-span-1">
        <CardContent className="flex flex-col gap-1 p-0">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Pending Allotment
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">
              {metrics.pendingCount}
            </span>
            {metrics.pendingCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-none border-warning/40 px-1 py-0 font-mono text-[9px] text-warning"
              >
                IN PROGRESS
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
