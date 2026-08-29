"use client"

import { useState } from "react"
import { Loader2, DollarSign } from "lucide-react"
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Market Prices — {ipo.name}</DialogTitle>
          <DialogDescription>
            Set the listing opening price or current market price (CMP) to track
            unrealized and listing gains.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <IpoPriceForm
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Issue Price Reference */}
      <div className="rounded-md bg-muted/40 p-2.5 text-xs flex justify-between items-center">
        <span className="text-muted-foreground">Issue Price:</span>
        <span className="font-bold text-foreground">
          {formatCurrency(ipo.issuePrice)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="ipo-listing-price"
            className="text-xs font-medium text-foreground"
          >
            Listing Price (₹)
          </label>
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
              className={`text-[10px] block font-medium ${
                listingGainPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {listingGainPct >= 0 ? "+" : ""}
              {listingGainPct.toFixed(1)}% Listing Gain
            </span>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="ipo-current-price"
            className="text-xs font-medium text-foreground"
          >
            Current Price (CMP ₹)
          </label>
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
              className={`text-[10px] block font-medium ${
                currentGainPct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {currentGainPct >= 0 ? "+" : ""}
              {currentGainPct.toFixed(1)}% vs Issue
            </span>
          )}
        </div>
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
              Saving...
            </>
          ) : (
            <>
              <DollarSign className="mr-1.5 size-3.5" />
              Update Prices
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
