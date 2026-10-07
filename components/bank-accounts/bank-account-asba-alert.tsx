"use client"

import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils/ipo"
import type { BankAsbaWarning } from "@/lib/calculations/financials"

interface BankAccountAsbaAlertProps {
  warnings: BankAsbaWarning[]
}

export function BankAccountAsbaAlert({ warnings }: BankAccountAsbaAlertProps) {
  if (warnings.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-none border border-destructive/60 bg-destructive/10 p-3.5 text-xs">
      <div className="flex items-center gap-2 font-bold text-destructive">
        <AlertTriangle className="size-4 shrink-0" />
        <span>
          ASBA Capital Limit Exceeded: Blocked funds exceed available balance
          across concurrent active IPOs for {warnings.length} bank account
          {warnings.length > 1 ? "s" : ""}.
        </span>
      </div>
      <div className="flex flex-col gap-1.5 pl-6">
        {warnings.map((w) => (
          <div key={w.bankId} className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">
              {w.nickname ? `${w.bankName} (${w.nickname})` : w.bankName}:
            </span>
            <span className="font-mono text-muted-foreground">
              Blocked {formatCurrency(w.blockedAmount)} / Limit{" "}
              {formatCurrency(w.asbaLimit)}
            </span>
            <Badge
              variant="destructive"
              className="px-1.5 py-0 font-mono text-[9px] font-semibold"
            >
              Over by {formatCurrency(w.exceededAmount)} ({w.utilizationPercent}%)
            </Badge>
            {w.activeIpoNames.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                across {w.activeIpoNames.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
