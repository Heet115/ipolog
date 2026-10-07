"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  calculateRealizedGrossProfit,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount } from "@/types"
import type {
  SaleRowState,
  BulkSaleSortColumn,
} from "@/hooks/use-bulk-sale"

interface BulkSaleTableProps {
  sortedEligibleApps: Application[]
  accountMap: Map<string, ApplicationAccount>
  rowStates: Record<string, SaleRowState>
  ipo: Ipo
  defaultPrice: number
  allSelected: boolean
  sortColumn: BulkSaleSortColumn
  sortDirection: "asc" | "desc"
  onToggleSort: (col: "account" | "shares" | "price" | "profit") => void
  onToggleSelectAll: (checked: boolean) => void
  onToggleRow: (appId: string) => void
  onUpdateRowShares: (appId: string, shares: number) => void
  onUpdateRowPrice: (appId: string, price: number) => void
}

export function BulkSaleTable({
  sortedEligibleApps,
  accountMap,
  rowStates,
  ipo,
  defaultPrice,
  allSelected,
  sortColumn,
  sortDirection,
  onToggleSort,
  onToggleSelectAll,
  onToggleRow,
  onUpdateRowShares,
  onUpdateRowPrice,
}: BulkSaleTableProps) {
  return (
    <div className="max-h-[300px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border border-border/80">
      <Table className="min-w-[550px]">
        <TableHeader>
          <TableRow className="border-b border-border/70 bg-muted/30">
            <TableHead className="w-10 text-center">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) =>
                  onToggleSelectAll(Boolean(checked))
                }
              />
            </TableHead>
            <TableHead className="h-9 min-w-[160px] select-none text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
            <TableHead className="h-9 w-[100px] select-none text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("shares")}
                className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Shares Sold
                {sortColumn === "shares" ? (
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
            <TableHead className="h-9 w-[110px] select-none text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("price")}
                className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Sale Price (₹)
                {sortColumn === "price" ? (
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
            <TableHead className="h-9 select-none text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              <button
                type="button"
                onClick={() => onToggleSort("profit")}
                className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
              >
                Profit (You)
                {sortColumn === "profit" ? (
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
          {sortedEligibleApps.map((app) => {
            const account = accountMap.get(app.accountId)
            const state = rowStates[app.id] || {
              selected: false,
              salePrice: defaultPrice,
              sharesSold: 0,
            }
            const maxShares =
              app.allottedShares || (app.allottedLots || 1) * ipo.lotSize

            const gross = calculateRealizedGrossProfit(
              state.sharesSold,
              state.salePrice,
              ipo.issuePrice
            )
            const your = calculateYourProfit(
              gross,
              account?.type === "my" ? 0 : (account?.profitSharePercent ?? 40)
            )

            return (
              <TableRow
                key={app.id}
                className={state.selected ? "bg-muted/30" : "opacity-60"}
              >
                <TableCell className="text-center">
                  <Checkbox
                    checked={state.selected}
                    onCheckedChange={() => onToggleRow(app.id)}
                    aria-label={`Select ${account?.name || "account"}`}
                  />
                </TableCell>

                <TableCell className="text-xs font-medium">
                  <div className="flex max-w-[220px] min-w-0 items-center gap-1.5">
                    <span
                      className="block truncate font-semibold text-foreground"
                      title={account?.name}
                    >
                      {account?.name}
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

                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    max={maxShares}
                    step={1}
                    disabled={!state.selected}
                    value={state.sharesSold}
                    onChange={(e) =>
                      onUpdateRowShares(app.id, Number(e.target.value))
                    }
                    aria-label={`Shares sold for ${account?.name || "account"}`}
                    className="h-7 px-1.5 font-mono text-xs"
                  />
                </TableCell>

                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    disabled={!state.selected}
                    value={state.salePrice}
                    onChange={(e) =>
                      onUpdateRowPrice(app.id, parseFloat(e.target.value) || 0)
                    }
                    aria-label={`Sale price for ${account?.name || "account"}`}
                    className="h-7 px-1.5 text-xs font-bold"
                  />
                </TableCell>

                <TableCell
                  className={`text-right text-xs font-bold ${
                    your > 0
                      ? "text-success"
                      : your < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {formatCurrency(your)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
