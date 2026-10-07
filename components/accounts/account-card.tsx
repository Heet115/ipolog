"use client"

import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCheck,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils/ipo"
import type { AccountMoneySummary } from "@/lib/calculations/financials"
import type { ApplicationAccount } from "@/types"

export interface AccountCardProps {
  account: ApplicationAccount
  summary: AccountMoneySummary
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onSettleAll?: () => void
  onQuickMove?: (target: "top" | "bottom") => void
}

export function AccountCard({
  account,
  summary,
  onEdit,
  onToggleArchive,
  onDelete,
  onSettleAll,
  onQuickMove,
}: AccountCardProps) {
  const isMy = account.type === "my"

  return (
    <Card
      className={`flex flex-col justify-between rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs ${
        account.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        {/* Header: Name + Badges + Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-heading text-sm font-bold text-foreground">
                {account.name}
              </h3>
              {account.sortIndex !== undefined && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[9px] text-muted-foreground"
                  title={`Priority #${account.sortIndex + 1}`}
                >
                  #{account.sortIndex + 1}
                </Badge>
              )}
              {account.archived && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[9px]"
                >
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={isMy ? "secondary" : "default"}
                className="px-1 py-0 text-[9px] font-normal"
              >
                {isMy ? "My Account" : `Other (${account.profitSharePercent}%)`}
              </Badge>
              {summary.totalApplications > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {summary.totalApplications} apps (
                  {summary.allottedCount + summary.soldCount} allotted)
                </span>
              )}
            </div>
            {account.phoneNumber && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Ph: {account.phoneNumber}
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
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Account
                </DropdownMenuItem>
                {!isMy && summary.pendingReceivables > 0 && onSettleAll && (
                  <DropdownMenuItem onClick={onSettleAll}>
                    <CheckCheck
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Settle All ({summary.unsettledSoldApplicationsCount})
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onToggleArchive}>
                  {account.archived ? (
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
                {!account.archived && onQuickMove && (
                  <>
                    <DropdownMenuItem onClick={() => onQuickMove("top")}>
                      <ChevronsUp data-icon="inline-start" />
                      Move to Top
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onQuickMove("bottom")}>
                      <ChevronsDown data-icon="inline-start" />
                      Move to Bottom
                    </DropdownMenuItem>
                  </>
                )}
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
              Total Applied
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.totalApplied)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Invested (Allotted)
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.totalInvested)}
            </span>
          </div>
        </div>

        {/* Realized Returns Panel */}
        <div className="flex flex-col gap-1 rounded-none border border-border/60 bg-muted/20 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Your Realized Net Profit:
            </span>
            <span
              className={`font-mono font-bold ${
                summary.totalRealizedYourProfit > 0
                  ? "text-success"
                  : summary.totalRealizedYourProfit < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {formatCurrency(summary.totalRealizedYourProfit)}
            </span>
          </div>

          {!isMy && (
            <div className="flex items-center justify-between border-t border-border/40 pt-1 font-mono text-[10px] text-muted-foreground">
              <span>Owner&apos;s Cut ({account.profitSharePercent}%):</span>
              <span
                className={
                  summary.totalRealizedProfitShared > 0
                    ? "font-semibold text-warning-foreground"
                    : "text-muted-foreground"
                }
              >
                {formatCurrency(summary.totalRealizedProfitShared)}
              </span>
            </div>
          )}
        </div>

        {/* Pending Settlement Alert & Quick Settle */}
        {!isMy && summary.pendingReceivables > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-none border border-warning/40 bg-warning/10 p-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Pending Settlement
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(summary.pendingReceivables)}
              </span>
            </div>
            {onSettleAll && (
              <Button
                variant="outline"
                size="xs"
                onClick={onSettleAll}
                className="h-6 gap-1 border-warning/50 text-[10px] font-semibold hover:bg-warning/20"
              >
                <CheckCheck className="size-3 text-success" />
                Settle All ({summary.unsettledSoldApplicationsCount})
              </Button>
            )}
          </div>
        )}

        {/* Notes (if any) */}
        {account.notes && (
          <p className="truncate text-[11px] text-muted-foreground italic">
            {account.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
