"use client"

import { useState } from "react"
import { Loader2, Check, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { recordSaleBulk, type BulkSaleItem } from "@/lib/firebase/applications"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import {
  formatCurrency,
  dateToInputValue,
  inputValueToTimestamp,
} from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
} from "@/types"

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
  const allottedApps = applications.filter(
    (app) => app.status === "allotted" || app.status === "sold"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Bulk Sale — {ipo.name}</DialogTitle>
          <DialogDescription>
            Record listing-day or bulk exit sales across multiple allotted accounts at once.
          </DialogDescription>
        </DialogHeader>

        {open && allottedApps.length > 0 && (
          <BulkSaleForm
            userId={userId}
            ipo={ipo}
            allottedApps={allottedApps}
            accounts={accounts}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onSuccess()
              onOpenChange(false)
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
  allottedApps,
  accounts,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  allottedApps: Application[]
  accounts: ApplicationAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  const initialPrice = ipo.currentPrice
    ? String(ipo.currentPrice)
    : ipo.listingPrice
      ? String(ipo.listingPrice)
      : ""

  const initialDate =
    dateToInputValue(ipo.listingDate) || dateToInputValue(new Date())

  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(() =>
    allottedApps.map((a) => a.id)
  )
  const [salePrice, setSalePrice] = useState<string>(initialPrice)
  const [saleDate, setSaleDate] = useState<string>(initialDate)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numSalePrice = parseFloat(salePrice) || 0

  const toggleSelect = (id: string) => {
    if (selectedAppIds.includes(id)) {
      setSelectedAppIds(selectedAppIds.filter((appId) => appId !== id))
    } else {
      setSelectedAppIds([...selectedAppIds, id])
    }
  }

  const selectAll = () => {
    setSelectedAppIds(allottedApps.map((a) => a.id))
  }

  const deselectAll = () => {
    setSelectedAppIds([])
  }

  // Calculate live aggregate profit preview
  let totalShares = 0
  let totalGrossProfit = 0
  let totalProfitShared = 0
  let totalYourProfit = 0

  allottedApps.forEach((app) => {
    if (!selectedAppIds.includes(app.id)) return

    const account = accountMap.get(app.accountId)
    const shares = app.allottedShares || app.sharesApplied || ipo.lotSize
    totalShares += shares

    if (numSalePrice > 0) {
      const gross = calculateRealizedGrossProfit(
        shares,
        numSalePrice,
        ipo.issuePrice
      )
      const profitSharePercent =
        account?.type === "my" ? 0 : (account?.profitSharePercent ?? 0)
      const shared = calculateProfitShared(gross, profitSharePercent)
      const your = calculateYourProfit(gross, profitSharePercent)

      totalGrossProfit += gross
      totalProfitShared += shared
      totalYourProfit += your
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedAppIds.length === 0) {
      setError("Please select at least one application to sell.")
      return
    }

    if (!numSalePrice || numSalePrice <= 0) {
      setError("Please enter a valid sale price greater than 0.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const items: BulkSaleItem[] = selectedAppIds.map((id) => {
        const app = allottedApps.find((a) => a.id === id)!
        const shares =
          app.allottedShares || app.sharesApplied || ipo.lotSize

        return {
          applicationId: id,
          sharesSold: shares,
          salePrice: numSalePrice,
          saleDate: inputValueToTimestamp(saleDate),
        }
      })

      await recordSaleBulk(userId, items)
      toast.add({
        title: `Sales recorded for ${items.length} applications`,
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to record bulk sales. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Sale Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-md bg-muted/40 p-3 text-xs">
        <div className="space-y-1">
          <label
            htmlFor="bulk-sale-price"
            className="text-xs font-medium text-foreground"
          >
            Sale Price (₹ per share) *
          </label>
          <Input
            id="bulk-sale-price"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 950"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="bulk-sale-date"
            className="text-xs font-medium text-foreground"
          >
            Sale Date
          </label>
          <Input
            id="bulk-sale-date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Checklist Header */}
      <div className="flex items-center justify-between border-b pb-2 text-xs">
        <span className="font-medium text-foreground">
          Select Allotted Applications ({selectedAppIds.length} of{" "}
          {allottedApps.length})
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={selectAll}
          >
            Select All
          </Button>
          {selectedAppIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={deselectAll}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div className="rounded-md border max-h-[260px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="text-xs">Account</TableHead>
              <TableHead className="text-xs text-right">Shares</TableHead>
              <TableHead className="text-xs text-right">Gross Profit</TableHead>
              <TableHead className="text-xs text-right">Your Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allottedApps.map((app) => {
              const account = accountMap.get(app.accountId)
              const isSelected = selectedAppIds.includes(app.id)
              const shares =
                app.allottedShares || app.sharesApplied || ipo.lotSize

              const gross =
                numSalePrice > 0
                  ? calculateRealizedGrossProfit(
                      shares,
                      numSalePrice,
                      ipo.issuePrice
                    )
                  : 0
              const profitSharePercent =
                account?.type === "my"
                  ? 0
                  : (account?.profitSharePercent ?? 0)
              const your =
                numSalePrice > 0
                  ? calculateYourProfit(gross, profitSharePercent)
                  : 0

              return (
                <TableRow
                  key={app.id}
                  className={`cursor-pointer ${
                    isSelected ? "bg-muted/30" : ""
                  }`}
                  onClick={() => toggleSelect(app.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(app.id)}
                    />
                  </TableCell>

                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{account?.name}</span>
                      <Badge
                        variant={
                          account?.type === "my" ? "secondary" : "default"
                        }
                        className="text-[9px] py-0 px-1 font-normal"
                      >
                        {account?.type === "my"
                          ? "My"
                          : `${account?.profitSharePercent}%`}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="text-right text-xs text-muted-foreground">
                    {shares} sh
                  </TableCell>

                  <TableCell
                    className={`text-right text-xs font-semibold ${
                      gross > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : gross < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {numSalePrice > 0 ? formatCurrency(gross) : "—"}
                  </TableCell>

                  <TableCell
                    className={`text-right text-xs font-bold ${
                      your > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : your < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }`}
                  >
                    {numSalePrice > 0 ? formatCurrency(your) : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      {numSalePrice > 0 && selectedAppIds.length > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Total Gross Profit ({totalShares} sh)
            </span>
            <span
              className={`font-semibold ${
                totalGrossProfit > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(totalGrossProfit)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Shared with Others
            </span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(totalProfitShared)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground block">
              Your Net Profit
            </span>
            <span
              className={`font-bold text-sm ${
                totalYourProfit > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {formatCurrency(totalYourProfit)}
            </span>
          </div>
        </div>
      )}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || selectedAppIds.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Recording Sales...
            </>
          ) : (
            <>
              <Check className="mr-1.5 size-3.5" />
              Confirm & Sell ({selectedAppIds.length} Accounts)
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
