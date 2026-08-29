"use client"

import { useState } from "react"
import { TrendingUp, Sparkles, Check } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { recordSaleSingle } from "@/lib/firebase/applications"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount } from "@/types"

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
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            Record Sale — {account?.name}
          </DialogTitle>
          <DialogDescription className="break-words">
            Record exit / sale price and calculate profit sharing for {ipo.name}
            .
          </DialogDescription>
        </DialogHeader>

        {open && application && (
          <RecordSaleForm
            key={application.id}
            userId={userId}
            ipo={ipo}
            application={application}
            account={account}
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
  const maxShares =
    application.allottedShares || (application.allottedLots || 1) * ipo.lotSize

  const [salePrice, setSalePrice] = useState<string>(
    application.salePrice
      ? String(application.salePrice)
      : ipo.currentPrice
        ? String(ipo.currentPrice)
        : ipo.listingPrice
          ? String(ipo.listingPrice)
          : ""
  )
  const [sharesSold, setSharesSold] = useState<string>(
    application.sharesSold ? String(application.sharesSold) : String(maxShares)
  )
  const [saleDate, setSaleDate] = useState<Date | undefined>(
    application.saleDate?.toDate?.() ?? new Date()
  )
  const [notes, setNotes] = useState(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numSalePrice = parseFloat(salePrice) || 0
  const numSharesSold = parseInt(sharesSold, 10) || 0

  // Live profit calculation
  const grossProfit = calculateRealizedGrossProfit(
    numSharesSold,
    numSalePrice,
    ipo.issuePrice
  )
  const profitSharePct = account?.profitSharePercent ?? 40
  const isMyAccount = account?.type === "my"
  const profitShared = calculateProfitShared(
    grossProfit,
    isMyAccount ? 0 : profitSharePct
  )
  const yourProfit = calculateYourProfit(
    grossProfit,
    isMyAccount ? 0 : profitSharePct
  )

  const handleFillCmp = () => {
    if (ipo.currentPrice) setSalePrice(String(ipo.currentPrice))
    else if (ipo.listingPrice) setSalePrice(String(ipo.listingPrice))
  }

  const handleAllShares = () => {
    setSharesSold(String(maxShares))
  }

  const handleHalfShares = () => {
    setSharesSold(String(Math.floor(maxShares / 2)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!numSalePrice || numSalePrice <= 0) {
      setError("Please enter a valid sale price greater than 0.")
      return
    }

    if (!numSharesSold || numSharesSold <= 0) {
      setError("Please enter valid shares sold (at least 1).")
      return
    }

    if (numSharesSold > maxShares) {
      setError(`Cannot sell more shares than allotted (${maxShares} shares).`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      await recordSaleSingle(userId, application.id, {
        salePrice: numSalePrice,
        sharesSold: numSharesSold,
        saleDate: saleDate ? Timestamp.fromDate(saleDate) : undefined,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Account Info Header */}
      <div className="flex items-center justify-between rounded-none border bg-muted/40 p-3 text-xs">
        <div>
          <span className="block text-muted-foreground">Account</span>
          <span className="font-bold text-foreground">
            {account?.name || "Account"}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-muted-foreground">Allotted</span>
          <span className="font-bold text-foreground">
            {maxShares} shares ({application.allottedLots} lots)
          </span>
        </div>
      </div>

      <FieldGroup>
        {/* Sale Price Input + CMP shortcut */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="sale-price">
              Sale / Exit Price (₹) <span className="text-destructive">*</span>
            </FieldLabel>
            {(ipo.currentPrice || ipo.listingPrice) && (
              <button
                type="button"
                onClick={handleFillCmp}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Sparkles className="size-3" />
                Fill CMP: ₹{ipo.currentPrice || ipo.listingPrice}
              </button>
            )}
          </div>
          <Input
            id="sale-price"
            type="number"
            step="0.01"
            min="0.01"
            placeholder={`Issue Price was ₹${ipo.issuePrice}`}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        {/* Shares Sold + 100% / 50% shortcuts */}
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="shares-sold">
              Shares Sold <span className="text-destructive">*</span>
            </FieldLabel>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={handleAllShares}
                className="h-5 px-1.5 text-[10px]"
              >
                100% (All)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={handleHalfShares}
                className="h-5 px-1.5 text-[10px]"
              >
                50% (Half)
              </Button>
            </div>
          </div>
          <Input
            id="shares-sold"
            type="number"
            min="1"
            max={maxShares}
            step="1"
            value={sharesSold}
            onChange={(e) => setSharesSold(e.target.value)}
            required
            disabled={loading}
          />
        </Field>
      </FieldGroup>

      {/* Live Profit Split Preview Card */}
      {numSalePrice > 0 && numSharesSold > 0 && (
        <div className="flex flex-col gap-2 rounded-none border border-success/30 bg-success/5 p-3">
          <div className="flex items-center justify-between border-b border-success/20 pb-2 text-xs">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <TrendingUp className="text-success" />
              Sale Value: {formatCurrency(numSalePrice * numSharesSold)}
            </span>
            <span
              className={`font-bold ${
                grossProfit > 0
                  ? "text-success"
                  : grossProfit < 0
                    ? "text-destructive"
                    : "text-foreground"
              }`}
            >
              Gross: {formatCurrency(grossProfit)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
              <span className="text-[10px] text-muted-foreground">
                Your Net Profit
              </span>
              <span
                className={`text-sm font-bold ${
                  yourProfit > 0
                    ? "text-success"
                    : yourProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(yourProfit)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 rounded-none border bg-card/60 p-2">
              <span className="text-[10px] text-muted-foreground">
                Profit Shared ({isMyAccount ? "0%" : `${profitSharePct}%`})
              </span>
              <span className="text-sm font-bold text-warning-foreground">
                {formatCurrency(profitShared)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sale Date (DatePicker) */}
      <Field>
        <FieldLabel>Sale Date</FieldLabel>
        <DatePicker
          date={saleDate}
          onDateChange={setSaleDate}
          placeholder="Select sale date"
          disabled={loading}
        />
      </Field>

      {/* Notes */}
      <Field>
        <FieldLabel htmlFor="sale-notes">Notes (Optional)</FieldLabel>
        <Textarea
          id="sale-notes"
          placeholder="e.g. Sold on listing day at 9:30 AM"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={loading}
          className="resize-none"
        />
      </Field>

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
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? (
            "Recording Sale..."
          ) : (
            <>
              <Check data-icon="inline-start" />
              Confirm Sale
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
