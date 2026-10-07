"use client"

import { TrendingUp } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/ipo"
import type {
  IpoMoneySummary,
  IpoProfitSummary,
} from "@/lib/calculations/financials"

interface IpoDetailStatsProps {
  moneySummary: IpoMoneySummary | null
  profitSummary: IpoProfitSummary | null
}

export function IpoDetailStats({
  moneySummary,
  profitSummary,
}: IpoDetailStatsProps) {
  if (!moneySummary) return null

  const totalDecided =
    moneySummary.allottedCount +
    moneySummary.soldCount +
    moneySummary.notAllottedCount
  const winRate =
    totalDecided > 0
      ? ((moneySummary.allottedCount + moneySummary.soldCount) / totalDecided) *
        100
      : 0

  return (
    <div className="flex flex-col gap-6">
      {/* 4-Metric Money State Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Applied */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Applied
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.totalApplied)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.applicationsCount} Applications (
              {moneySummary.totalLotsApplied} Lots)
            </span>
          </CardContent>
        </Card>

        {/* Currently Blocked */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Currently Blocked
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.blockedAmount)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.pendingCount} Pending Mandates
            </span>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Total Invested
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {formatCurrency(moneySummary.investedAmount)}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {moneySummary.soldCount > 0
                ? `${moneySummary.allottedCount} Holding • ${moneySummary.soldCount} Sold (${moneySummary.totalAllottedShares} Sh Total)`
                : `${moneySummary.allottedCount} Allotted (${moneySummary.totalAllottedShares} Shares)`}
            </span>
          </CardContent>
        </Card>

        {/* Allotment Rate */}
        <Card className="rounded-none border border-border/60">
          <CardContent className="flex flex-col gap-1 p-3.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Allotment Rate
            </span>
            <p className="font-mono text-lg font-bold text-foreground">
              {totalDecided > 0 ? `${winRate.toFixed(0)}%` : "Pending"}
            </p>
            <span className="truncate text-[10px] text-muted-foreground">
              {totalDecided > 0
                ? `${moneySummary.allottedCount + moneySummary.soldCount} of ${totalDecided} Allotted`
                : `${moneySummary.pendingCount} Awaiting Allotment`}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Profit & Return Summary (shown when P&L exists) */}
      {profitSummary && profitSummary.hasAnyProfit && (
        <Card className="rounded-none border border-border/70 bg-card">
          <CardHeader className="border-b border-border/60 p-4 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <TrendingUp className="size-4 text-success" />
              Profit & Return Realization
            </CardTitle>
            <CardDescription className="text-xs">
              Realized profits and profit-sharing distributions for this IPO
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Your Net Profit
                </span>
                <span
                  className={`font-mono text-lg font-bold ${
                    profitSummary.totalRealizedYourProfit > 0
                      ? "text-success"
                      : profitSummary.totalRealizedYourProfit < 0
                        ? "text-destructive"
                        : "text-foreground"
                  }`}
                >
                  {formatCurrency(profitSummary.totalRealizedYourProfit)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  After profit sharing deductions
                </span>
              </div>

              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Profit Shared (Others)
                </span>
                <span className="font-mono text-lg font-bold text-warning-foreground">
                  {formatCurrency(profitSummary.totalRealizedProfitShared)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  To account owners
                </span>
              </div>

              <div className="flex flex-col gap-0.5 rounded-none border border-border/50 bg-muted/30 p-3">
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Total Gross Profit
                </span>
                <span className="font-mono text-lg font-bold text-foreground">
                  {formatCurrency(profitSummary.totalRealizedGrossProfit)}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Total realized return
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
