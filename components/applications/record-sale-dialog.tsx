"use client"

import { useState } from "react"
import { Loader2, TrendingUp, AlertCircle } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { recordSaleSingle } from "@/lib/firebase/applications"
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

interface RecordSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  application: Application | null
  account?: ApplicationAccount
  onSuccess: () => void
}

export function RecordSaleDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  application,
  account,
  onSuccess,
}: RecordSaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Sale — {account?.name}</DialogTitle>
          <DialogDescription>
            Record sale price and shares sold to compute gross profit and profit splits.
          </DialogDescription>
        </DialogHeader>

        {open && application && (
          <RecordSaleForm
            userId={userId}
            ipo={ipo}
            application={application}
            account={account}
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

function RecordSaleForm({
  userId,
  ipo,
  application,
  account,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  application: Application
  account?: ApplicationAccount
  onCancel: () => void
  onSuccess: () => void
}) {
  const initialShares =
    application.sharesSold && application.sharesSold > 0
      ? application.sharesSold
      : application.allottedShares || application.sharesApplied || ipo.lotSize

  const initialPrice =
    application.salePrice && application.salePrice > 0
      ? String(application.salePrice)
      : ipo.currentPrice
        ? String(ipo.currentPrice)
        : ipo.listingPrice
          ? String(ipo.listingPrice)
          : ""

  const initialDate =
    dateToInputValue(application.saleDate) ||
    dateToInputValue(ipo.listingDate) ||
    dateToInputValue(new Date())

  const [salePrice, setSalePrice] = useState<string>(initialPrice)
  const [sharesSold, setSharesSold] = useState<number>(initialShares)
  const [saleDate, setSaleDate] = useState<string>(initialDate)
  const [notes, setNotes] = useState<string>(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numSalePrice = parseFloat(salePrice) || 0
  const profitSharePercent =
    account?.type === "my" ? 0 : (account?.profitSharePercent ?? 0)

  // Calculations
  const totalCost = sharesSold * ipo.issuePrice
  const totalSaleValue = sharesSold * numSalePrice
  const grossProfit = calculateRealizedGrossProfit(
    sharesSold,
    numSalePrice,
    ipo.issuePrice
  )
  const profitShared = calculateProfitShared(grossProfit, profitSharePercent)
  const yourProfit = calculateYourProfit(grossProfit, profitSharePercent)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!numSalePrice || numSalePrice <= 0) {
      setError("Please enter a valid sale price greater than 0.")
      return
    }

    if (!sharesSold || sharesSold <= 0) {
      setError("Please enter valid shares sold (at least 1).")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await recordSaleSingle(userId, application.id, {
        sharesSold,
        salePrice: numSalePrice,
        saleDate: inputValueToTimestamp(saleDate),
        notes: notes.trim(),
      })

      toast.add({
        title: "Sale recorded successfully",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to record sale. Please try again.")
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

      {/* Account Info Header */}
      <div className="rounded-md bg-muted/40 p-2.5 text-xs flex justify-between items-center">
        <div>
          <span className="font-semibold text-foreground">{account?.name}</span>
          <span className="text-[11px] text-muted-foreground block">
            Issue Price: {formatCurrency(ipo.issuePrice)} • Allotted:{" "}
            {application.allottedShares || application.sharesApplied} sh
          </span>
        </div>
        <Badge
          variant={account?.type === "my" ? "secondary" : "default"}
          className="text-[10px] py-0"
        >
          {account?.type === "my"
            ? "My Account (100% User)"
            : `${account?.profitSharePercent}% Other Share`}
        </Badge>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="sale-price"
            className="text-xs font-medium text-foreground"
          >
            Sale Price (₹) *
          </label>
          <Input
            id="sale-price"
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
            htmlFor="shares-sold"
            className="text-xs font-medium text-foreground"
          >
            Shares Sold *
          </label>
          <Input
            id="shares-sold"
            type="number"
            min="1"
            step="1"
            value={sharesSold}
            onChange={(e) => setSharesSold(Math.max(1, Number(e.target.value)))}
            disabled={loading}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="sale-date"
          className="text-xs font-medium text-foreground"
        >
          Sale Date
        </label>
        <Input
          id="sale-date"
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Live Profit Preview Box */}
      {numSalePrice > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs">
          <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
            Profit Breakdown Preview
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Total Proceeds
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(totalSaleValue)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block">
                Total Cost Basis
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(totalCost)}
              </span>
            </div>

            <div className="col-span-2 border-t pt-1.5 flex justify-between items-center">
              <span className="text-muted-foreground">Gross Profit:</span>
              <span
                className={`font-semibold ${
                  grossProfit > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : grossProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(grossProfit)}
              </span>
            </div>

            {account?.type === "other" && (
              <div className="col-span-2 flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">
                  Shared with Other ({profitSharePercent}%):
                </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {formatCurrency(profitShared)}
                </span>
              </div>
            )}

            <div className="col-span-2 border-t pt-1.5 flex justify-between items-center font-bold">
              <span className="text-foreground">Your Net Profit:</span>
              <span
                className={`text-sm ${
                  yourProfit > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : yourProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(yourProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <label
          htmlFor="sale-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (Optional)
        </label>
        <Textarea
          id="sale-notes"
          placeholder="e.g. Sold on listing morning via Zerodha"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Saving Sale...
            </>
          ) : (
            <>
              <TrendingUp className="mr-1.5 size-3.5" />
              Record Sale
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
