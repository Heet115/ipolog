"use client"

import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Landmark,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils/ipo"
import type { BankMoneySummary } from "@/lib/calculations/financials"
import type { BankAccount } from "@/types"

export interface BankAccountCardProps {
  bank: BankAccount
  summary: BankMoneySummary
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

export function BankAccountCard({
  bank,
  summary,
  onEdit,
  onToggleArchive,
  onDelete,
}: BankAccountCardProps) {
  const hasLimit = Boolean(bank.asbaLimit && bank.asbaLimit > 0)
  const isExceeded = hasLimit && summary.blockedAmount > bank.asbaLimit!
  const isNear =
    hasLimit && !isExceeded && summary.blockedAmount / bank.asbaLimit! >= 0.8
  const utilPercent = hasLimit
    ? Math.round((summary.blockedAmount / bank.asbaLimit!) * 100)
    : 0

  return (
    <Card
      className={cn(
        "flex flex-col justify-between rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs",
        bank.archived
          ? "bg-muted/20 opacity-60"
          : isExceeded
            ? "border-destructive/60 bg-card shadow-xs"
            : "bg-card"
      )}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        {/* Header: Bank Name + Nickname + Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Landmark className="size-3.5 shrink-0 text-muted-foreground" />
              <h3 className="truncate font-heading text-sm font-bold text-foreground">
                {bank.bankName}
              </h3>
              {bank.archived && (
                <Badge
                  variant="outline"
                  className="shrink-0 px-1 py-0 font-mono text-[9px]"
                >
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {bank.nickname && (
                <span className="max-w-[120px] truncate font-medium text-foreground">
                  {bank.nickname}
                </span>
              )}
              {bank.last4 && (
                <span className="font-mono text-[11px]">••{bank.last4}</span>
              )}
              {summary.totalApplicationsCount > 0 && (
                <span className="font-mono text-[10px]">
                  • {summary.totalApplicationsCount} apps
                </span>
              )}
            </div>
            {bank.upiId && (
              <span
                className="max-w-[220px] truncate font-mono text-[11px] text-primary"
                title={`Linked UPI: ${bank.upiId}`}
              >
                UPI: {bank.upiId}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-mt-1.5 -mr-1.5 size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Bank
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
                  {bank.archived ? (
                    <>
                      <ArchiveRestore data-icon="inline-start" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 data-icon="inline-start" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Money Metrics Strip */}
        <div className="grid grid-cols-2 gap-2 border-y border-border/50 py-2.5 text-xs">
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Blocked (Active)
            </span>
            <span
              className={cn(
                "font-mono font-bold",
                isExceeded ? "text-destructive" : "text-foreground"
              )}
            >
              {formatCurrency(summary.blockedAmount)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Invested (Allotted)
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.investedAmount)}
            </span>
          </div>
        </div>

        {/* Total Capital Committed */}
        <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs">
          <span className="text-[11px] font-medium text-muted-foreground">
            Total Active Funds:
          </span>
          <span className="font-mono font-bold text-foreground">
            {formatCurrency(summary.blockedAmount + summary.investedAmount)}
          </span>
        </div>

        {/* ASBA Capital Limit & Utilization Strip */}
        {hasLimit && (
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-none border p-2 text-xs",
              isExceeded
                ? "border-destructive/50 bg-destructive/10"
                : isNear
                  ? "border-warning/40 bg-warning/10"
                  : "border-border/60 bg-muted/20"
            )}
          >
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 font-semibold">
                {isExceeded && (
                  <AlertTriangle className="size-3 shrink-0 text-destructive" />
                )}
                <span
                  className={
                    isExceeded
                      ? "font-bold text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  ASBA Capital Limit:
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(bank.asbaLimit!)}
              </span>
            </div>

            <Progress
              value={Math.min(utilPercent, 100)}
              className={cn(
                "h-1.5 w-full bg-muted/60",
                isExceeded
                  ? "[&_[data-slot=progress-indicator]]:bg-destructive"
                  : isNear
                    ? "[&_[data-slot=progress-indicator]]:bg-warning"
                    : "[&_[data-slot=progress-indicator]]:bg-primary"
              )}
            />

            <div className="flex items-center justify-between font-mono text-[10px]">
              <span
                className={cn(
                  "font-semibold",
                  isExceeded
                    ? "font-bold text-destructive"
                    : isNear
                      ? "font-semibold text-warning-foreground"
                      : "text-muted-foreground"
                )}
              >
                {isExceeded
                  ? `Exceeded by ${formatCurrency(summary.blockedAmount - bank.asbaLimit!)} (${utilPercent}%)`
                  : `${utilPercent}% utilized`}
              </span>
              <span className="text-muted-foreground">
                {isExceeded
                  ? "₹0 available"
                  : `${formatCurrency(bank.asbaLimit! - summary.blockedAmount)} available`}
              </span>
            </div>
          </div>
        )}

        {/* Notes (if any) */}
        {bank.notes && (
          <p className="truncate text-[11px] text-muted-foreground italic">
            {bank.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
