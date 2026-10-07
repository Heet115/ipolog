"use client"

import { Clock, CheckCircle2, TrendingUp, Users } from "lucide-react"
import { formatCurrency } from "@/lib/utils/ipo"
import type { ReceivablesSummary } from "@/lib/calculations/financials"

interface SettlementMetricsStripProps {
  summary: ReceivablesSummary
  totalPartnerProfit: number
  partnerAccountsCount: number
  pendingPartnersCount: number
  settledPartnersCount: number
}

export function SettlementMetricsStrip({
  summary,
  totalPartnerProfit,
  partnerAccountsCount,
  pendingPartnersCount,
  settledPartnersCount,
}: SettlementMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Pending Receivables */}
      <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pending Receivables
          </span>
          <div className="flex size-6 items-center justify-center rounded-none bg-warning/15 text-warning-foreground">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xl font-bold text-warning-foreground">
            {formatCurrency(summary.totalPendingReceivables)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {summary.pendingCount} allotment{summary.pendingCount === 1 ? "" : "s"} across{" "}
            {summary.pendingAccountsCount} partner{summary.pendingAccountsCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Settled Capital */}
      <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Settled Capital
          </span>
          <div className="flex size-6 items-center justify-center rounded-none bg-success/15 text-success">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xl font-bold text-success">
            {formatCurrency(summary.totalSettledReceivables)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {summary.settledCount} allotment{summary.settledCount === 1 ? "" : "s"} realized & settled
          </span>
        </div>
      </div>

      {/* Partner Profit Retained */}
      <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Partner Profit Kept
          </span>
          <div className="flex size-6 items-center justify-center rounded-none bg-primary/15 text-primary">
            <TrendingUp className="size-3.5" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xl font-bold text-foreground">
            {formatCurrency(totalPartnerProfit)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            Distributed to partner accounts
          </span>
        </div>
      </div>

      {/* Active Partner Accounts */}
      <div className="flex flex-col justify-between gap-2 border border-border/70 bg-card p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Partner Accounts
          </span>
          <div className="flex size-6 items-center justify-center rounded-none bg-muted text-muted-foreground">
            <Users className="size-3.5" />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xl font-bold text-foreground">
            {partnerAccountsCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {pendingPartnersCount} pending • {settledPartnersCount} settled
          </span>
        </div>
      </div>
    </div>
  )
}
