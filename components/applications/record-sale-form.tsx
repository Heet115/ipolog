"use client"

import { TrendingUp, Sparkles, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/utils/ipo"
import { useRecordSaleForm } from "@/hooks/use-record-sale-form"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface RecordSaleFormProps {
  userId: string
  ipo: Ipo
  application: Application
  account?: ApplicationAccount
  onOpenSettlement?: (app: Application) => void
  onCancel: () => void
  onSuccess: () => void
}

export function RecordSaleForm({
  userId,
  ipo,
  application,
  account,
  onOpenSettlement,
  onCancel,
  onSuccess,
}: RecordSaleFormProps) {
  const {
    maxShares,
    salePrice,
    setSalePrice,
    sharesSold,
    setSharesSold,
    saleDate,
    setSaleDate,
    notes,
    setNotes,
    loading,
    error,
    numSalePrice,
    numSharesSold,
    grossProfit,
    profitSharePct,
    isMyAccount,
    profitShared,
    yourProfit,
    handleFillCmp,
    handleAllShares,
    handleHalfShares,
    handleSubmit,
  } = useRecordSaleForm({
    userId,
    ipo,
    application,
    account,
    onOpenSettlement,
    onSuccess,
  })

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
            {maxShares} shares (
            {application.allottedLots ??
              Math.max(1, Math.floor(maxShares / (ipo.lotSize || 1)))}{" "}
            lots)
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
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
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
