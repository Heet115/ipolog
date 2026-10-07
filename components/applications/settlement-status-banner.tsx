"use client"

import {
  CheckCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react"
import type { Timestamp } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"

interface SettlementStatusBannerProps {
  settlementStatus: "pending" | "settled"
  amountToSendUser: number
  settledAt?: Timestamp | Date | null
  accountName?: string
  updatingSettlement: boolean
  onToggleSettlement: () => void
}

export function SettlementStatusBanner({
  settlementStatus,
  amountToSendUser,
  settledAt,
  accountName,
  updatingSettlement,
  onToggleSettlement,
}: SettlementStatusBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-none border p-3 text-xs sm:flex-row sm:items-center sm:justify-between",
        settlementStatus === "settled"
          ? "border-success/40 bg-success/10"
          : "border-warning/40 bg-warning/10"
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-none border",
            settlementStatus === "settled"
              ? "border-success/50 bg-success/20 text-success"
              : "border-warning/50 bg-warning/20 text-warning-foreground"
          )}
        >
          {settlementStatus === "settled" ? (
            <CheckCheck className="size-4" />
          ) : (
            <Clock className="size-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">Payment Status:</span>
            <Badge
              variant={settlementStatus === "settled" ? "success" : "warning"}
              className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
            >
              {settlementStatus === "settled"
                ? "Settled / Payment Received"
                : "Pending Payment"}
            </Badge>
          </div>
          <span className="truncate text-[11px] text-muted-foreground">
            {settlementStatus === "settled"
              ? `Net payout of ${formatCurrency(amountToSendUser)} marked as received${
                  settledAt ? ` on ${formatDate(settledAt)}` : ""
                }.`
              : `Awaiting ${formatCurrency(amountToSendUser)} transfer from ${
                  accountName || "account owner"
                }.`}
          </span>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        variant={settlementStatus === "settled" ? "outline" : "default"}
        disabled={updatingSettlement}
        onClick={onToggleSettlement}
        className="h-8 shrink-0 rounded-none text-xs font-semibold"
      >
        {settlementStatus === "settled" ? (
          <>
            <RotateCcw className="size-3" data-icon="inline-start" />
            Revert to Pending
          </>
        ) : (
          <>
            <CheckCircle2 className="size-3" data-icon="inline-start" />
            Mark as Settled
          </>
        )}
      </Button>
    </div>
  )
}
