"use client"

import {
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  Calendar,
  Landmark,
  MessageSquare,
  CheckCheck,
  RotateCcw,
} from "lucide-react"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount, formatDate } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export interface ApplicationTableColumnsOptions {
  accountMap: Map<string, ApplicationAccount>
  bankMap: Map<string, BankAccount>
  ipo: Ipo
  onRecordSale: (application: Application) => void
  onEdit: (application: Application) => void
  onWhatsAppSettlement?: (application: Application) => void
  onToggleSettlement: (application: Application) => void
  onDeleteRequest: (application: Application) => void
}

export function getApplicationTableColumns({
  accountMap,
  bankMap,
  ipo,
  onRecordSale,
  onEdit,
  onWhatsAppSettlement,
  onToggleSettlement,
  onDeleteRequest,
}: ApplicationTableColumnsOptions): DataTableColumn<Application>[] {
  return [
    {
      id: "account",
      header: "Account",
      sortable: true,
      sortFn: (a, b) => {
        const accA = accountMap.get(a.accountId)
        const accB = accountMap.get(b.accountId)
        const ai = accA?.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bi = accB?.sortIndex ?? Number.MAX_SAFE_INTEGER
        if (ai !== bi) return ai - bi
        const nameA = accA?.name || ""
        const nameB = accB?.name || ""
        return nameA.localeCompare(nameB)
      },
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        return (
          <div className="flex max-w-[220px] min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="block truncate text-xs font-bold text-foreground"
                title={account?.name || "Unknown"}
              >
                {account?.name || "Unknown"}
              </span>
              {account?.sortIndex !== undefined && (
                <span className="font-mono text-[9px] text-muted-foreground">
                  #{account.sortIndex + 1}
                </span>
              )}
              <Badge
                variant={account?.type === "my" ? "secondary" : "default"}
                className="shrink-0 px-1 py-0 text-[9px] font-normal"
              >
                {account?.type === "my"
                  ? "My"
                  : `${account?.profitSharePercent}%`}
              </Badge>
            </div>
            {app.applicationDate && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <Calendar className="size-2.5" />
                {formatDate(app.applicationDate)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "bankAccount",
      header: "Bank Account",
      sortable: true,
      sortFn: (a, b) => {
        const bankA = bankMap.get(a.bankAccountId)?.bankName || ""
        const bankB = bankMap.get(b.bankAccountId)?.bankName || ""
        return bankA.localeCompare(bankB)
      },
      cell: (app) => {
        const bank = bankMap.get(app.bankAccountId)
        return (
          <div className="flex max-w-[180px] items-center gap-1 truncate text-xs text-muted-foreground">
            <Landmark className="size-3 shrink-0" />
            <span className="truncate">
              {bank ? formatBankAccount(bank) : "—"}
            </span>
          </div>
        )
      },
    },
    {
      id: "category",
      header: "Quota",
      align: "center",
      sortable: true,
      sortFn: (a, b) => {
        const catA = a.category || inferCategoryFromAmount(a.amountApplied)
        const catB = b.category || inferCategoryFromAmount(b.amountApplied)
        return catA.localeCompare(catB)
      },
      cell: (app) => {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        const meta = CATEGORY_CONFIG[cat]
        return (
          <Badge
            variant={meta.badgeVariant}
            className="px-1.5 py-0 font-mono text-[10px]"
            title={`${meta.label} (${meta.amountLimitText})`}
          >
            {meta.shortLabel}
          </Badge>
        )
      },
    },
    {
      id: "lots",
      header: "Lots",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.lotsApplied - b.lotsApplied,
      cell: (app) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {app.lotsApplied}
        </span>
      ),
    },
    {
      id: "shares",
      header: "Shares",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.sharesApplied - b.sharesApplied,
      cell: (app) => (
        <span className="font-mono text-xs text-muted-foreground">
          {app.sharesApplied}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.amountApplied - b.amountApplied,
      cell: (app) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatCurrency(app.amountApplied)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
      cell: (app) => <ApplicationStatusBadge status={app.status} size="sm" />,
    },
    {
      id: "allotmentReturn",
      header: "Allotment / Return",
      align: "right",
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        if (app.status === "allotted") {
          const shares =
            app.allottedShares || (app.allottedLots || 1) * ipo.lotSize
          const currPrice = ipo.currentPrice || ipo.listingPrice
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                {shares} sh ({app.allottedLots || 1} lot)
              </span>
              {currPrice && (
                <span className="font-mono text-[10px] font-semibold text-success">
                  CMP: {formatCurrency(currPrice)}
                </span>
              )}
            </div>
          )
        }

        if (app.status === "sold") {
          const profit = calculateApplicationProfit(app, ipo, account)
          const isOtherAccount = account?.type === "other"
          const isSettled = app.settlementStatus === "settled"

          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-xs font-bold text-success">
                {formatCurrency(profit.realizedYourProfit)}
              </span>
              {profit.realizedProfitShared > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Shared: {formatCurrency(profit.realizedProfitShared)}
                </span>
              )}
              {isOtherAccount && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSettlement(app)
                  }}
                  className="mt-0.5 inline-flex cursor-pointer items-center gap-1"
                  title={
                    isSettled
                      ? "Click to revert to pending"
                      : "Click to mark as settled"
                  }
                >
                  <Badge
                    variant={isSettled ? "success" : "warning"}
                    className="px-1.5 py-0 text-[9px] font-medium tracking-tight transition-opacity hover:opacity-80"
                  >
                    {isSettled ? "Settled" : "Unsettled"}
                  </Badge>
                </button>
              )}
            </div>
          )
        }

        if (app.status === "not_allotted") {
          return (
            <span className="font-mono text-[11px] text-muted-foreground">
              Refund: {formatCurrency(app.amountApplied)}
            </span>
          )
        }

        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      id: "actions",
      header: "",
      align: "right",
      sortable: false,
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        const canSettle =
          (app.status === "allotted" || app.status === "sold") &&
          Boolean(onWhatsAppSettlement)

        return (
          <div className="flex items-center justify-end gap-1">
            {canSettle && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onWhatsAppSettlement?.(app)}
                className="size-7 text-muted-foreground hover:bg-success/10 hover:text-success"
                title="WhatsApp Settlement Report"
              >
                <MessageSquare className="size-3.5" />
                <span className="sr-only">WhatsApp Settlement</span>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreVertical className="size-3.5" />
                <span className="sr-only">Actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuGroup>
                  {(app.status === "allotted" || app.status === "sold") && (
                    <DropdownMenuItem onClick={() => onRecordSale(app)}>
                      <TrendingUp data-icon="inline-start" />
                      {app.status === "sold"
                        ? "Edit Sale Details"
                        : "Record Sale"}
                    </DropdownMenuItem>
                  )}
                  {canSettle && (
                    <DropdownMenuItem
                      onClick={() => onWhatsAppSettlement?.(app)}
                    >
                      <MessageSquare
                        data-icon="inline-start"
                        className="text-success"
                      />
                      WhatsApp Settlement
                    </DropdownMenuItem>
                  )}
                  {app.status === "sold" && account?.type === "other" && (
                    <DropdownMenuItem onClick={() => onToggleSettlement(app)}>
                      {app.settlementStatus === "settled" ? (
                        <>
                          <RotateCcw data-icon="inline-start" />
                          Revert to Pending
                        </>
                      ) : (
                        <>
                          <CheckCheck
                            data-icon="inline-start"
                            className="text-success"
                          />
                          Mark as Settled
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(app)}>
                    <Edit2 data-icon="inline-start" />
                    Edit Application
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDeleteRequest(app)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
