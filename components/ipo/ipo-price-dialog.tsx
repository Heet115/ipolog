"use client"

import { useState } from "react"
import { DollarSign } from "lucide-react"
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
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { updateIpoPrices } from "@/lib/firebase/ipos"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo } from "@/types"

interface IpoPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  onSuccess: () => void
}

export function IpoPriceDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  onSuccess,
}: IpoPriceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            Update Market Prices — {ipo.name}
          </DialogTitle>
          <DialogDescription className="text-xs break-words">
            Set the listing opening price or current market price (CMP) to track
            unrealized and listing gains.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <IpoPriceForm
            key={ipo.id}
            userId={userId}
            ipo={ipo}
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

function IpoPriceForm({
  userId,
  ipo,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  onCancel: () => void
  onSuccess: () => void
}) {
  const [listingPrice, setListingPrice] = useState<string>(
    ipo.listingPrice ? String(ipo.listingPrice) : ""
  )
  const [currentPrice, setCurrentPrice] = useState<string>(
    ipo.currentPrice ? String(ipo.currentPrice) : ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numListingPrice = parseFloat(listingPrice) || 0
  const numCurrentPrice = parseFloat(currentPrice) || 0

  const listingGainPct =
    numListingPrice > 0
      ? ((numListingPrice - ipo.issuePrice) / ipo.issuePrice) * 100
      : null

  const currentGainPct =
    numCurrentPrice > 0
      ? ((numCurrentPrice - ipo.issuePrice) / ipo.issuePrice) * 100
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await updateIpoPrices(userId, ipo.id, {
        listingPrice: numListingPrice > 0 ? numListingPrice : undefined,
        currentPrice: numCurrentPrice > 0 ? numCurrentPrice : undefined,
      })

      toast.add({
        title: "Market prices updated",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to update market prices. Please try again.")
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

      {/* Issue Price Reference */}
      <div className="flex items-center justify-between rounded-none border bg-muted/40 p-3 text-xs">
        <span className="font-medium text-muted-foreground">Issue Price:</span>
        <span className="font-bold text-foreground">
          {formatCurrency(ipo.issuePrice)}
        </span>
      </div>

      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="ipo-listing-price">
              Listing Price (₹)
            </FieldLabel>
            <Input
              id="ipo-listing-price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 850"
              value={listingPrice}
              onChange={(e) => setListingPrice(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {listingGainPct !== null && (
              <span
                className={`block text-[10px] font-semibold ${
                  listingGainPct >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {listingGainPct >= 0 ? "+" : ""}
                {listingGainPct.toFixed(1)}% Listing Gain
              </span>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="ipo-current-price">
              Current Price (CMP ₹)
            </FieldLabel>
            <Input
              id="ipo-current-price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 920"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              disabled={loading}
            />
            {currentGainPct !== null && (
              <span
                className={`block text-[10px] font-semibold ${
                  currentGainPct >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {currentGainPct >= 0 ? "+" : ""}
                {currentGainPct.toFixed(1)}% vs Issue
              </span>
            )}
          </Field>
        </div>
      </FieldGroup>

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
            "Saving..."
          ) : (
            <>
              <DollarSign data-icon="inline-start" />
              Update Prices
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
