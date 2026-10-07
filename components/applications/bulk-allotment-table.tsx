"use client"

import {
  Check,
  XCircle,
  Landmark,
  Plus,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"
import type {
  RowState,
  AllotmentSortColumn,
} from "@/hooks/use-bulk-allotment"

interface BulkAllotmentTableProps {
  sortedApps: Application[]
  accountMap: Map<string, ApplicationAccount>
  bankMap: Map<string, BankAccount>
  rowStates: Record<string, RowState>
  ipo: Ipo
  sortColumn: AllotmentSortColumn
  sortDirection: "asc" | "desc"
  onToggleSort: (
    col: "account" | "bank" | "applied" | "status" | "invested"
  ) => void
  onSetStatus: (appId: string, status: ApplicationStatus) => void
  onSetAllottedLots: (appId: string, lots: number) => void
}

export function BulkAllotmentTable({
  sortedApps,
  accountMap,
  bankMap,
  rowStates,
  ipo,
  sortColumn,
  sortDirection,
  onToggleSort,
  onSetStatus,
  onSetAllottedLots,
}: BulkAllotmentTableProps) {
  return (
    <div className="max-h-[340px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border border-border/80">
      <Table className="min-w-[650px]">
        <TableHeader>
          <TableRow className="border-b border-border/70 bg-muted/30">
            <TableHead className="h-9 min-w-[170px] select-none text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("account")}
                className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Account
                {sortColumn === "account" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="size-3 text-foreground" />
                  ) : (
                    <ArrowDown className="size-3 text-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                )}
              </button>
            </TableHead>

            <TableHead className="h-9 min-w-[150px] select-none text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("bank")}
                className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Bank
                {sortColumn === "bank" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="size-3 text-foreground" />
                  ) : (
                    <ArrowDown className="size-3 text-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                )}
              </button>
            </TableHead>

            <TableHead className="h-9 min-w-[110px] select-none text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("applied")}
                className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Applied
                {sortColumn === "applied" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="size-3 text-foreground" />
                  ) : (
                    <ArrowDown className="size-3 text-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                )}
              </button>
            </TableHead>

            <TableHead className="h-9 min-w-[220px] select-none text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("status")}
                className="mx-auto inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Allotment Decision
                {sortColumn === "status" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="size-3 text-foreground" />
                  ) : (
                    <ArrowDown className="size-3 text-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                )}
              </button>
            </TableHead>

            <TableHead className="h-9 min-w-[130px] select-none text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("invested")}
                className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Invested / Lots
                {sortColumn === "invested" ? (
                  sortDirection === "asc" ? (
                    <ArrowUp className="size-3 text-foreground" />
                  ) : (
                    <ArrowDown className="size-3 text-foreground" />
                  )
                ) : (
                  <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                )}
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedApps.map((app) => {
            const account = accountMap.get(app.accountId)
            const bank = bankMap.get(app.bankAccountId)
            const state = rowStates[app.id] || {
              status: app.status,
              allottedLots: app.allottedLots ?? app.lotsApplied,
            }

            const isSold = app.status === "sold"
            const isAllotted = state.status === "allotted"
            const isNotAllotted = state.status === "not_allotted"
            const isPending = state.status === "pending"

            const currentInvested =
              isAllotted || isSold
                ? state.allottedLots * ipo.lotSize * ipo.issuePrice
                : 0

            return (
              <TableRow
                key={app.id}
                className={`transition-colors ${
                  isAllotted
                    ? "bg-success/5 hover:bg-success/10"
                    : isNotAllotted
                      ? "bg-muted/15 opacity-75 hover:bg-muted/25"
                      : "hover:bg-muted/30"
                }`}
              >
                {/* Account Name */}
                <TableCell className="text-xs font-medium">
                  <div className="flex max-w-[200px] min-w-0 items-center gap-1.5">
                    <span
                      className="block truncate font-semibold text-foreground"
                      title={account?.name || "Account"}
                    >
                      {account?.name || "Account"}
                    </span>
                    <Badge
                      variant={
                        account?.type === "my" ? "secondary" : "default"
                      }
                      className="shrink-0 px-1 py-0 text-[9px] font-normal"
                    >
                      {account?.type === "my"
                        ? "My"
                        : `${account?.profitSharePercent}%`}
                    </Badge>
                  </div>
                </TableCell>

                {/* Bank Account */}
                <TableCell className="text-xs text-muted-foreground">
                  {bank ? (
                    <div
                      className="flex max-w-[150px] items-center gap-1 truncate"
                      title={formatBankAccount(bank)}
                    >
                      <Landmark className="size-3 shrink-0" />
                      <span className="truncate">
                        {formatBankAccount(bank)}
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>

                {/* Applied Amount */}
                <TableCell className="text-right font-mono text-xs">
                  <span className="block font-semibold text-foreground">
                    {formatCurrency(app.amountApplied)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {app.lotsApplied} lots ({app.sharesApplied} sh)
                  </span>
                </TableCell>

                {/* 3-Way Status Toggle */}
                <TableCell className="text-center">
                  {isSold ? (
                    <Badge variant="info" className="text-xs">
                      Sold ({app.sharesSold} sh)
                    </Badge>
                  ) : (
                    <div className="inline-flex items-center rounded-none border bg-muted/40 p-0.5">
                      <button
                        type="button"
                        onClick={() => onSetStatus(app.id, "allotted")}
                        className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                          isAllotted
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Check className="mr-1 inline size-3" />
                        Allotted
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetStatus(app.id, "not_allotted")}
                        className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                          isNotAllotted
                            ? "bg-destructive text-destructive-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <XCircle className="mr-1 inline size-3" />
                        Not Allotted
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetStatus(app.id, "pending")}
                        className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                          isPending
                            ? "border bg-background text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Pending
                      </button>
                    </div>
                  )}
                </TableCell>

                {/* Allotted Lots Stepper / Invested Calculation */}
                <TableCell className="text-right font-mono text-xs">
                  {isAllotted ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center rounded-none border bg-background">
                        <button
                          type="button"
                          aria-label="Decrease allotted lots"
                          disabled={state.allottedLots <= 1}
                          onClick={() =>
                            onSetAllottedLots(app.id, state.allottedLots - 1)
                          }
                          className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <Minus className="size-2.5" />
                        </button>
                        <Input
                          type="number"
                          aria-label="Allotted lots"
                          min={1}
                          max={app.lotsApplied}
                          value={
                            state.allottedLots === 0 ? "" : state.allottedLots
                          }
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === "") {
                              onSetAllottedLots(app.id, 0)
                            } else {
                              const parsed = parseInt(val, 10)
                              onSetAllottedLots(
                                app.id,
                                isNaN(parsed) ? 0 : parsed
                              )
                            }
                          }}
                          onBlur={() => {
                            if (state.allottedLots <= 0) {
                              onSetAllottedLots(app.id, 1)
                            }
                          }}
                          className="h-6 w-10 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label="Increase allotted lots"
                          disabled={state.allottedLots >= app.lotsApplied}
                          onClick={() =>
                            onSetAllottedLots(app.id, state.allottedLots + 1)
                          }
                          className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <Plus className="size-2.5" />
                        </button>
                      </div>
                      <span className="text-xs font-bold text-success">
                        {formatCurrency(currentInvested)}
                      </span>
                    </div>
                  ) : isSold ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs font-semibold text-foreground">
                        {state.allottedLots} lot
                        {state.allottedLots > 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {formatCurrency(currentInvested)}
                      </span>
                    </div>
                  ) : isNotAllotted ? (
                    <span className="text-[11px] text-muted-foreground">
                      Refund: {formatCurrency(app.amountApplied)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
