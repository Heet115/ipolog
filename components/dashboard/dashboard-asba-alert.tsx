"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/ipo"
import type { BankAsbaWarning } from "@/lib/calculations/financials"

interface DashboardAsbaAlertProps {
  exceededWarnings: BankAsbaWarning[]
}

export function DashboardAsbaAlert({
  exceededWarnings,
}: DashboardAsbaAlertProps) {
  if (exceededWarnings.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-none border border-destructive/30 bg-destructive/10 p-4 text-xs text-foreground shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 font-semibold text-destructive">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/20 text-destructive">
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-destructive">
              ASBA Capital Limit Warning
            </p>
            <p className="text-xs text-muted-foreground">
              Blocked UPI mandates exceed available balance in{" "}
              {exceededWarnings.length} bank account
              {exceededWarnings.length > 1 ? "s" : ""}. Please replenish funds
              to prevent application rejections.
            </p>
          </div>
        </div>
        <Button
          size="xs"
          variant="outline"
          nativeButton={false}
          render={<Link href="/bank-accounts" />}
          className="text-xs"
        >
          Manage Bank Accounts
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2 lg:grid-cols-3">
        {exceededWarnings.map((w) => (
          <div
            key={w.bankId}
            className="flex flex-col gap-1 rounded-none border border-destructive/20 bg-background/80 p-3 shadow-2xs"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {w.nickname || w.bankName} {w.last4 ? `(••${w.last4})` : ""}
              </span>
              <Badge variant="destructive" className="font-mono text-[9px]">
                +{formatCurrency(w.exceededAmount)} Over
              </Badge>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
              <span>
                Blocked:{" "}
                <strong className="text-destructive">
                  {formatCurrency(w.blockedAmount)}
                </strong>
              </span>
              <span>Limit: {formatCurrency(w.asbaLimit)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
