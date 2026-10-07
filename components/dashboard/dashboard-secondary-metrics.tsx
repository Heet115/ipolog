"use client"

import Link from "next/link"
import { Wallet, Users, Receipt, Landmark, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/ipo"
import type {
  DashboardMetrics,
  ReceivablesSummary,
} from "@/lib/calculations/financials"

interface DashboardSecondaryMetricsProps {
  receivables: ReceivablesSummary
  metrics: DashboardMetrics
  partnerAccountsCount: number
  asbaUtilization: number
  totalAsbaLimit: number
}

export function DashboardSecondaryMetrics({
  receivables,
  metrics,
  partnerAccountsCount,
  asbaUtilization,
  totalAsbaLimit,
}: DashboardSecondaryMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Pending Receivables */}
      <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Pending Receivables
            </span>
            <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <Wallet className="size-3.5" />
            </div>
          </div>
          <div>
            <p
              className={`font-mono text-xl font-bold ${
                receivables.totalPendingReceivables > 0
                  ? "text-warning-foreground"
                  : "text-foreground"
              }`}
            >
              {formatCurrency(receivables.totalPendingReceivables)}
            </p>
            <div className="mt-1 flex items-center justify-between text-xs">
              {receivables.totalPendingReceivables > 0 ? (
                <Link
                  href="/settlements"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <span>
                    {receivables.pendingAccountsCount} accounts to settle
                  </span>
                  <ArrowUpRight className="size-3" />
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  All sales settled ✓
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit Shared */}
      <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Profit Distributed
            </span>
            <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <Users className="size-3.5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalProfitShared)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              To {partnerAccountsCount} partner accounts
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Capital Deployed (Lifetime) */}
      <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Capital Deployed
            </span>
            <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <Receipt className="size-3.5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-xl font-bold text-foreground">
              {formatCurrency(metrics.lifetimeInvested)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {metrics.allottedApplications + metrics.soldApplications}{" "}
              lifetime allotments
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total ASBA Capacity */}
      <Card className="rounded-none border border-border/70 shadow-xs transition-all hover:border-border hover:shadow-sm">
        <CardContent className="flex flex-col justify-between gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Bank ASBA Utilization
            </span>
            <div className="flex size-7 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <Landmark className="size-3.5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xl font-bold text-foreground">
                {asbaUtilization}%
              </p>
              <span className="font-mono text-xs text-muted-foreground">
                {formatCurrency(metrics.totalBlocked)} /{" "}
                {formatCurrency(totalAsbaLimit)}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-none bg-muted">
              <div
                className={`h-full rounded-none transition-all ${
                  asbaUtilization > 100
                    ? "bg-destructive"
                    : asbaUtilization >= 80
                      ? "bg-warning"
                      : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, asbaUtilization)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
