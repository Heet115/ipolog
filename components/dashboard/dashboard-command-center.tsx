"use client"

import {
  Activity,
  TrendingUp,
  Lock,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/ipo"
import type { DashboardMetrics } from "@/lib/calculations/financials"

interface DashboardCommandCenterProps {
  metrics: DashboardMetrics
  activeAccountsCount: number
  successRate: number
  totalDecided: number
  totalInMotion: number
  investedPct: number
  blockedPct: number
}

export function DashboardCommandCenter({
  metrics,
  activeAccountsCount,
  successRate,
  totalDecided,
  totalInMotion,
  investedPct,
  blockedPct,
}: DashboardCommandCenterProps) {
  return (
    <Card className="overflow-hidden rounded-none border border-border/70 bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Portfolio Command Center
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            Consolidated across {activeAccountsCount} active accounts
          </span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {metrics.totalApplications} bids filed
          </Badge>
        </div>
      </div>

      {/* 4 Metric Columns */}
      <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {/* Metric 1: Net Realized Profit (You) */}
        <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-success/5 via-transparent to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Your Realized Profit
            </span>
            <div className="flex size-8 items-center justify-center rounded-none bg-success/10 text-success">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <p
              className={`font-mono text-3xl font-bold tracking-tight sm:text-4xl ${
                metrics.totalYourRealizedProfit > 0
                  ? "text-success"
                  : metrics.totalYourRealizedProfit < 0
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              {formatCurrency(metrics.totalYourRealizedProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.totalProfitShared > 0 ? (
                <span>
                  + {formatCurrency(metrics.totalProfitShared)} shared with
                  partners
                </span>
              ) : (
                <span>From {metrics.soldApplications} sold applications</span>
              )}
            </p>
          </div>
        </div>

        {/* Metric 2: Currently Blocked Mandates */}
        <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-warning/5 via-transparent to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Currently Blocked
            </span>
            <div className="flex size-8 items-center justify-center rounded-none bg-warning/10 text-warning-foreground">
              <Lock className="size-4" />
            </div>
          </div>
          <div>
            <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {formatCurrency(metrics.totalBlocked)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {metrics.pendingApplications} pending UPI mandates
            </p>
          </div>
        </div>

        {/* Metric 3: Active Holdings (Currently Invested) */}
        <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Active Holdings
            </span>
            <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {formatCurrency(metrics.activeInvested)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.activeHoldingsCount > 0 ? (
                <span>
                  Across {metrics.activeHoldingsCount} active holdings
                </span>
              ) : (
                <span>₹0 active holdings</span>
              )}
            </p>
          </div>
        </div>

        {/* Metric 4: Allotment Win Rate */}
        <div className="flex flex-col justify-between gap-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Allotment Win Rate
            </span>
            <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
              <CircleDollarSign className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {successRate.toFixed(1)}%
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                ({metrics.allottedApplications + metrics.soldApplications}/
                {totalDecided})
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-none bg-muted">
              <div
                className="h-full rounded-none bg-primary transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, successRate))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Capital Allocation Flow Bar */}
      {totalInMotion > 0 && (
        <div className="border-t border-border/60 bg-muted/10 p-4 sm:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                Current Capital in Motion
              </span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(totalInMotion)}
              </span>
            </div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-none bg-muted">
              {investedPct > 0 && (
                <div
                  style={{ width: `${investedPct}%` }}
                  className="bg-primary transition-all"
                  title={`Active Holdings: ${formatCurrency(metrics.activeInvested)}`}
                />
              )}
              {blockedPct > 0 && (
                <div
                  style={{ width: `${blockedPct}%` }}
                  className="bg-warning transition-all"
                  title={`Blocked ASBA: ${formatCurrency(metrics.totalBlocked)}`}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-none bg-primary" />
                <span>
                  Active Holdings:{" "}
                  <strong className="font-mono text-foreground">
                    {formatCurrency(metrics.activeInvested)}
                  </strong>{" "}
                  ({investedPct.toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-none bg-warning" />
                <span>
                  Blocked ASBA:{" "}
                  <strong className="font-mono text-foreground">
                    {formatCurrency(metrics.totalBlocked)}
                  </strong>{" "}
                  ({blockedPct.toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
