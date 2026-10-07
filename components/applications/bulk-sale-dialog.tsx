"use client"

import { Check, Sparkles, TrendingUp } from "lucide-react"
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
import { DatePicker } from "@/components/ui/date-picker"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/utils/ipo"
import { useBulkSale } from "@/hooks/use-bulk-sale"
import { BulkSaleTable } from "@/components/applications/bulk-sale-table"
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
  const {
    accountMap,
    defaultPrice,
    globalSalePrice,
    setGlobalSalePrice,
    globalSaleDate,
    setGlobalSaleDate,
    rowStates,
    sortColumn,
    sortDirection,
    loading,
    error,
    toggleSort,
    handleFillCmp,
    handleApplyGlobalPrice,
    toggleSelectAll,
    toggleRow,
    updateRowPrice,
    updateRowShares,
    summary,
    allSelected,
    sortedEligibleApps,
    handleSubmit,
  } = useBulkSale({
    userId,
    ipo,
    applications,
    accounts,
    onSuccess,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Bulk Exit / Sale — {ipo.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record exit prices across allotted accounts and calculate
                realized returns
              </DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-none font-mono text-xs">
            Issue: {formatCurrency(ipo.issuePrice)}
          </Badge>
        </div>
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
      <BulkSaleTable
        sortedEligibleApps={sortedEligibleApps}
        accountMap={accountMap}
        rowStates={rowStates}
        ipo={ipo}
        defaultPrice={defaultPrice}
        allSelected={allSelected}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onToggleSort={toggleSort}
        onToggleSelectAll={toggleSelectAll}
        onToggleRow={toggleRow}
        onUpdateRowShares={updateRowShares}
        onUpdateRowPrice={updateRowPrice}
      />

      {/* Aggregate Returns Summary Card */}
      <div className="flex flex-col gap-2 rounded-none border border-success/30 bg-success/10 p-3.5">
        <div className="flex items-center justify-between border-b border-success/20 pb-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <TrendingUp className="text-success" />
            Selected: {summary.selectedCount} Accounts
          </span>
          <span className="font-bold text-foreground">
            Total Gross: {formatCurrency(summary.totalGrossProfit)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
            <span className="text-[10px] text-muted-foreground">
              Your Realized Net Profit
            </span>
            <span className="text-base font-bold text-success">
              {formatCurrency(summary.totalYourProfit)}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
            <span className="text-[10px] text-muted-foreground">
              Total Profit Shared (Others)
            </span>
            <span className="text-base font-bold text-warning-foreground">
              {formatCurrency(summary.totalProfitShared)}
            </span>
          </div>
        </div>
      </div>

      <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || summary.selectedCount === 0}
          size="sm"
          className="rounded-none text-xs"
        >
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? (
            "Recording Sales..."
          ) : (
            <>
              <Check data-icon="inline-start" />
              Commit Sales ({summary.selectedCount})
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
