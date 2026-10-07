"use client"

import Link from "next/link"
import {
  MessageSquare,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Phone,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import type {
  AccountReceivableItem,
  PartnerAccountReceivables,
} from "@/lib/calculations/financials"

interface SettlementPartnerCardProps {
  entry: PartnerAccountReceivables
  isExpanded: boolean
  isActionLoading: boolean
  updatingId: string | null
  onToggleExpand: (accountId: string) => void
  onOpenWhatsAppDialog: (accountId: string) => void
  onSettleAll: (accountId: string, appItems: AccountReceivableItem[]) => void
  onRevertAll: (accountId: string, appItems: AccountReceivableItem[]) => void
  onToggleSingleSettlement: (item: AccountReceivableItem) => void
}

export function SettlementPartnerCard({
  entry,
  isExpanded,
  isActionLoading,
  updatingId,
  onToggleExpand,
  onOpenWhatsAppDialog,
  onSettleAll,
  onRevertAll,
  onToggleSingleSettlement,
}: SettlementPartnerCardProps) {
  const {
    account,
    pendingAmount,
    settledAmount,
    unsettledCount,
    applications: appItems,
  } = entry
  const isFullySettled = unsettledCount === 0

  const initials =
    account.name
      .split(" ")
      .map((n: string) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PA"

  return (
    <Card
      className={cn(
        "relative flex flex-col rounded-none border shadow-xs transition-all",
        isFullySettled
          ? "border-border/60 bg-card/60"
          : "border-warning/40 bg-card hover:border-warning/70"
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4.5">
        {/* Top Bar: Partner Details & Headline Amounts */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="size-9 rounded-none border border-border">
              <AvatarFallback className="rounded-none bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  {account.name}
                </span>
                <Badge
                  variant="secondary"
                  className="rounded-none px-1.5 py-0 font-mono text-[9px] uppercase"
                >
                  Partner
                </Badge>
                {account.profitSharePercent ? (
                  <Badge
                    variant="outline"
                    className="rounded-none px-1.5 py-0 font-mono text-[9px]"
                  >
                    {account.profitSharePercent}% Share
                  </Badge>
                ) : null}
                {isFullySettled ? (
                  <Badge
                    variant="success"
                    className="rounded-none px-1.5 py-0 text-[10px]"
                  >
                    Fully Settled ✓
                  </Badge>
                ) : (
                  <Badge
                    variant="warning"
                    className="rounded-none px-1.5 py-0 text-[10px]"
                  >
                    {unsettledCount} IPO{unsettledCount === 1 ? "" : "s"}{" "}
                    Pending
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {account.phoneNumber && (
                  <div className="flex items-center gap-1">
                    <Phone className="size-3" />
                    <span>{account.phoneNumber}</span>
                  </div>
                )}
                {account.pan && (
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span>PAN:</span>
                    <span className="text-foreground">{account.pan}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>Total Allotments:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {appItems.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Headline Amounts & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
            <div className="flex flex-col items-start sm:items-end">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {isFullySettled ? "Total Settled" : "Amount to Transfer"}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "font-mono text-lg font-bold sm:text-xl",
                    isFullySettled ? "text-success" : "text-warning-foreground"
                  )}
                >
                  {formatCurrency(
                    isFullySettled ? settledAmount : pendingAmount
                  )}
                </span>
                {!isFullySettled && settledAmount > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    ({formatCurrency(settledAmount)} settled)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* WhatsApp Statement Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenWhatsAppDialog(account.id)}
                className="h-8 gap-1.5 rounded-none text-xs font-medium"
                title="Generate WhatsApp statement"
              >
                <MessageSquare className="size-3.5 text-success" />
                <span>WhatsApp</span>
              </Button>

              {/* Settle All / Revert Button */}
              {!isFullySettled ? (
                <Button
                  size="sm"
                  onClick={() => onSettleAll(account.id, appItems)}
                  disabled={isActionLoading}
                  className="h-8 gap-1.5 rounded-none text-xs"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {isActionLoading
                      ? "Settling..."
                      : `Settle All (${unsettledCount})`}
                  </span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevertAll(account.id, appItems)}
                  disabled={isActionLoading}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3" />
                  <span>Revert All</span>
                </Button>
              )}

              {/* Expand / Collapse Button */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onToggleExpand(account.id)}
                className="size-8 text-muted-foreground hover:text-foreground"
                title={isExpanded ? "Collapse allotments" : "View allotments"}
              >
                {isExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Itemized Allotments Table */}
        {isExpanded && (
          <div className="mt-2 flex flex-col gap-2 border-t border-border/70 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Allotment Breakdown ({appItems.length} IPOs)</span>
            </div>

            <div className="overflow-x-auto border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-2.5">IPO</th>
                    <th className="p-2.5 text-right">Shares</th>
                    <th className="p-2.5 text-right">Applied</th>
                    <th className="p-2.5 text-right">Proceeds</th>
                    <th className="p-2.5 text-right">Gross P&L</th>
                    <th className="p-2.5 text-right">Partner Share</th>
                    <th className="p-2.5 text-right">Transfer</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                  {appItems.map((item) => {
                    const isItemSettled = item.settlementStatus === "settled"
                    const isSingleUpdating = updatingId === item.applicationId
                    const isGrossPos = item.grossProfit >= 0

                    return (
                      <tr
                        key={item.applicationId}
                        className={cn(
                          "transition-colors hover:bg-muted/30",
                          isItemSettled && "bg-muted/10"
                        )}
                      >
                        <td className="p-2.5 font-sans font-bold text-foreground">
                          <Link
                            href={`/ipos/${item.ipoId}`}
                            className="flex items-center gap-1 text-xs hover:underline"
                          >
                            <span>{item.ipoName}</span>
                            <ExternalLink className="size-2.5 text-muted-foreground" />
                          </Link>
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {item.allottedShares} ({item.allottedLots}L)
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {formatCurrency(item.investedAmount)}
                        </td>
                        <td className="p-2.5 text-right text-foreground">
                          {formatCurrency(item.saleProceeds)}
                        </td>
                        <td
                          className={cn(
                            "p-2.5 text-right font-bold",
                            isGrossPos ? "text-success" : "text-destructive"
                          )}
                        >
                          {isGrossPos ? "+" : ""}
                          {formatCurrency(item.grossProfit)}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {item.ownerProfitShare > 0
                            ? formatCurrency(item.ownerProfitShare)
                            : "—"}
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">
                          {formatCurrency(item.amountToSendUser)}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            variant={isItemSettled ? "success" : "warning"}
                            className="px-1.5 py-0 text-[9px] uppercase"
                          >
                            {isItemSettled ? "Settled" : "Pending"}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onToggleSingleSettlement(item)}
                            disabled={isSingleUpdating}
                            className={cn(
                              "h-6 px-2 text-[10px]",
                              isItemSettled
                                ? "text-muted-foreground hover:text-foreground"
                                : "font-semibold text-primary hover:text-primary/80"
                            )}
                          >
                            {isSingleUpdating
                              ? "..."
                              : isItemSettled
                                ? "Revert"
                                : "Mark Settled"}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
