"use client"

import { useState } from "react"
import { Check, Sparkles, TrendingUp } from "lucide-react"
import { Timestamp } from "firebase/firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { recordSaleBulk, type BulkSaleItem } from "@/lib/firebase/applications"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface BulkSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

interface SaleRowState {
  selected: boolean
  salePrice: number
  sharesSold: number
}

export function BulkSaleDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: BulkSaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {open && (
          <BulkSaleForm
            key={ipo.id}
            userId={userId}
            ipo={ipo}
            applications={applications}
            accounts={accounts}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onOpenChange(false)
              onSuccess()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BulkSaleForm({
  userId,
  ipo,
  applications,
  accounts,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Only allotted and partially sold applications
  const eligibleApps = applications.filter(
    (a) => a.status === "allotted" || a.status === "sold"
  )

  const defaultPrice = ipo.currentPrice || ipo.listingPrice || ipo.issuePrice

  const [globalSalePrice, setGlobalSalePrice] = useState<string>(
    String(defaultPrice)
  )
  const [globalSaleDate, setGlobalSaleDate] = useState<Date | undefined>(
    new Date()
  )

  const [rowStates, setRowStates] = useState<Record<string, SaleRowState>>(
    () => {
      const init: Record<string, SaleRowState> = {}
      for (const app of eligibleApps) {
        const shares =
          app.allottedShares || (app.allottedLots || 1) * ipo.lotSize
        init[app.id] = {
          selected: true,
          salePrice: defaultPrice,
          sharesSold: shares,
        }
      }
      return init
    }
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFillCmp = () => {
    const cmp = ipo.currentPrice || ipo.listingPrice
    if (cmp) {
      setGlobalSalePrice(String(cmp))
      setRowStates((prev) => {
        const updated = { ...prev }
        for (const id in updated) {
          updated[id] = { ...updated[id], salePrice: cmp }
        }
        return updated
      })
    }
  }

  const handleApplyGlobalPrice = () => {
    const price = parseFloat(globalSalePrice)
    if (!price || price <= 0) return

    setRowStates((prev) => {
      const updated = { ...prev }
      for (const id in updated) {
        if (updated[id]?.selected) {
          updated[id] = { ...updated[id], salePrice: price }
        }
      }
      return updated
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of eligibleApps) {
        updated[app.id] = { ...updated[app.id], selected: checked }
      }
      return updated
    })
  }

  const toggleRow = (appId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        selected: !prev[appId]?.selected,
      },
    }))
  }

  const updateRowPrice = (appId: string, price: number) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        salePrice: price,
      },
    }))
  }

  const updateRowShares = (appId: string, shares: number) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        sharesSold: shares,
      },
    }))
  }

  // Summary calculations
  let totalGrossProfit = 0
  let totalProfitShared = 0
  let totalYourProfit = 0
  let selectedCount = 0

  for (const app of eligibleApps) {
    const state = rowStates[app.id]
    if (state?.selected) {
      selectedCount++
      const account = accountMap.get(app.accountId)
      const gross = calculateRealizedGrossProfit(
        state.sharesSold,
        state.salePrice,
        ipo.issuePrice
      )
      const shared = calculateProfitShared(
        gross,
        account?.type === "my" ? 0 : (account?.profitSharePercent ?? 40)
      )
      const your = calculateYourProfit(
        gross,
        account?.type === "my" ? 0 : (account?.profitSharePercent ?? 40)
      )

      totalGrossProfit += gross
      totalProfitShared += shared
      totalYourProfit += your
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const items: BulkSaleItem[] = []

      for (const app of eligibleApps) {
        const state = rowStates[app.id]
        if (state?.selected) {
          if (!state.salePrice || state.salePrice <= 0) {
            throw new Error(
              "Please ensure all selected rows have a valid sale price."
            )
          }
          if (!state.sharesSold || state.sharesSold <= 0) {
            throw new Error(
              "Please ensure all selected rows have valid shares sold."
            )
          }

          items.push({
            applicationId: app.id,
            salePrice: state.salePrice,
            sharesSold: state.sharesSold,
            saleDate: globalSaleDate
              ? Timestamp.fromDate(globalSaleDate)
              : undefined,
          })
        }
      }

      if (items.length === 0) {
        throw new Error("Please select at least one account to record a sale.")
      }

      await recordSaleBulk(userId, items)
      toast.add({
        title: `Sales recorded for ${items.length} applications`,
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError(
        err instanceof Error ? err.message : "Failed to record bulk sale."
      )
    } finally {
      setLoading(false)
    }
  }

  const allSelected =
    eligibleApps.length > 0 &&
    eligibleApps.every((a) => rowStates[a.id]?.selected)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Record Bulk Sale — {ipo.name}</DialogTitle>
          <Badge variant="outline" className="text-xs">
            Issue: {formatCurrency(ipo.issuePrice)}
          </Badge>
        </div>
        <DialogDescription>
          Record listing-day exit across multiple accounts simultaneously and
          commit in a single transaction.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Global Sale Controls */}
      <div className="grid grid-cols-1 gap-3 rounded-none border bg-muted/40 p-3 text-xs sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Exit Price for Selected (₹)
            </label>
            {(ipo.currentPrice || ipo.listingPrice) && (
              <button
                type="button"
                onClick={handleFillCmp}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <Sparkles className="size-3" />
                CMP: ₹{ipo.currentPrice || ipo.listingPrice}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={globalSalePrice}
              onChange={(e) => setGlobalSalePrice(e.target.value)}
              className="h-8 bg-background text-xs"
              placeholder="e.g. 450"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyGlobalPrice}
              className="h-8 shrink-0 text-xs"
            >
              Apply All
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Sale Date
          </label>
          <DatePicker
            date={globalSaleDate}
            onDateChange={setGlobalSaleDate}
            placeholder="Select sale date"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="max-h-[300px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border">
        <Table className="min-w-[550px]">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10 text-center">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    toggleSelectAll(Boolean(checked))
                  }
                />
              </TableHead>
              <TableHead className="min-w-[160px] text-xs">Account</TableHead>
              <TableHead className="w-[100px] text-xs">Shares Sold</TableHead>
              <TableHead className="w-[110px] text-xs">
                Sale Price (₹)
              </TableHead>
              <TableHead className="text-right text-xs">Profit (You)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eligibleApps.map((app) => {
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
                      onCheckedChange={() => toggleRow(app.id)}
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
                        updateRowShares(app.id, Number(e.target.value))
                      }
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
                        updateRowPrice(app.id, parseFloat(e.target.value) || 0)
                      }
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

      {/* Aggregate Returns Summary Card */}
      <div className="flex flex-col gap-2 rounded-none border border-success/30 bg-success/10 p-3.5">
        <div className="flex items-center justify-between border-b border-success/20 pb-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <TrendingUp className="text-success" />
            Selected: {selectedCount} Accounts
          </span>
          <span className="font-bold text-foreground">
            Total Gross: {formatCurrency(totalGrossProfit)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
            <span className="text-[10px] text-muted-foreground">
              Your Realized Net Profit
            </span>
            <span className="text-base font-bold text-success">
              {formatCurrency(totalYourProfit)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
            <span className="text-[10px] text-muted-foreground">
              Total Profit Shared (Others)
            </span>
            <span className="text-base font-bold text-warning-foreground">
              {formatCurrency(totalProfitShared)}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="sm"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || selectedCount === 0}
          size="sm"
        >
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? (
            "Recording Sales..."
          ) : (
            <>
              <Check data-icon="inline-start" />
              Commit Sales ({selectedCount})
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
