"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { createIpo, updateIpo } from "@/lib/firebase/ipos"
import {
  dateToInputValue,
  inputValueToTimestamp,
  formatCurrency,
} from "@/lib/utils/ipo"
import type { Ipo, IpoType } from "@/types"

interface IpoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipoToEdit?: Ipo | null
  onSuccess: (ipoId?: string) => void
}

export function IpoDialog({
  open,
  onOpenChange,
  userId,
  ipoToEdit,
  onSuccess,
}: IpoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ipoToEdit ? "Edit IPO Details" : "Add New IPO"}
          </DialogTitle>
          <DialogDescription>
            {ipoToEdit
              ? "Update IPO pricing, lot size, or key dates."
              : "Record a new IPO to track applications and profit sharing."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <IpoForm
            key={ipoToEdit?.id ?? "new"}
            userId={userId}
            ipoToEdit={ipoToEdit}
            onCancel={() => onOpenChange(false)}
            onSuccess={(id) => {
              onSuccess(id)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function IpoForm({
  userId,
  ipoToEdit,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipoToEdit?: Ipo | null
  onCancel: () => void
  onSuccess: (id?: string) => void
}) {
  const isEditing = Boolean(ipoToEdit)

  const [name, setName] = useState(ipoToEdit?.name ?? "")
  const [companyName, setCompanyName] = useState(ipoToEdit?.companyName ?? "")
  const [type, setType] = useState<IpoType>(ipoToEdit?.type ?? "mainboard")
  const [issuePrice, setIssuePrice] = useState<string>(
    ipoToEdit?.issuePrice ? String(ipoToEdit.issuePrice) : ""
  )
  const [priceBandMin, setPriceBandMin] = useState<string>(
    ipoToEdit?.priceBandMin ? String(ipoToEdit.priceBandMin) : ""
  )
  const [priceBandMax, setPriceBandMax] = useState<string>(
    ipoToEdit?.priceBandMax ? String(ipoToEdit.priceBandMax) : ""
  )
  const [lotSize, setLotSize] = useState<string>(
    ipoToEdit?.lotSize ? String(ipoToEdit.lotSize) : "1"
  )

  const [openDate, setOpenDate] = useState(
    dateToInputValue(ipoToEdit?.openDate)
  )
  const [closeDate, setCloseDate] = useState(
    dateToInputValue(ipoToEdit?.closeDate)
  )
  const [allotmentDate, setAllotmentDate] = useState(
    dateToInputValue(ipoToEdit?.allotmentDate)
  )
  const [listingDate, setListingDate] = useState(
    dateToInputValue(ipoToEdit?.listingDate)
  )
  const [notes, setNotes] = useState(ipoToEdit?.notes ?? "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numIssuePrice = parseFloat(issuePrice) || 0
  const numLotSize = parseInt(lotSize, 10) || 0
  const minApplicationAmount = numIssuePrice * numLotSize

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter an IPO name.")
      return
    }

    if (!numIssuePrice || numIssuePrice <= 0) {
      setError("Please enter a valid issue price greater than 0.")
      return
    }

    if (!numLotSize || numLotSize <= 0) {
      setError("Please enter a valid lot size (at least 1).")
      return
    }

    setError(null)
    setLoading(true)

    try {
      if (isEditing && ipoToEdit) {
        await updateIpo(userId, ipoToEdit.id, {
          name: name.trim(),
          companyName: companyName.trim(),
          type,
          issuePrice: numIssuePrice,
          priceBandMin: priceBandMin ? parseFloat(priceBandMin) : undefined,
          priceBandMax: priceBandMax ? parseFloat(priceBandMax) : undefined,
          lotSize: numLotSize,
          openDate: inputValueToTimestamp(openDate) ?? null,
          closeDate: inputValueToTimestamp(closeDate) ?? null,
          allotmentDate: inputValueToTimestamp(allotmentDate) ?? null,
          listingDate: inputValueToTimestamp(listingDate) ?? null,
          notes: notes.trim(),
        })
        toast.add({
          title: "IPO updated successfully",
          type: "success",
        })
        onSuccess(ipoToEdit.id)
      } else {
        const newId = await createIpo(userId, {
          name: name.trim(),
          companyName: companyName.trim(),
          type,
          issuePrice: numIssuePrice,
          priceBandMin: priceBandMin ? parseFloat(priceBandMin) : undefined,
          priceBandMax: priceBandMax ? parseFloat(priceBandMax) : undefined,
          lotSize: numLotSize,
          openDate: inputValueToTimestamp(openDate),
          closeDate: inputValueToTimestamp(closeDate),
          allotmentDate: inputValueToTimestamp(allotmentDate),
          listingDate: inputValueToTimestamp(listingDate),
          notes: notes.trim(),
        })
        toast.add({
          title: "IPO created successfully",
          type: "success",
        })
        onSuccess(newId)
      }
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save IPO details. Please try again.")
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

      {/* Name & Company */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="ipo-name"
            className="text-xs font-medium text-foreground"
          >
            IPO Name *
          </label>
          <Input
            id="ipo-name"
            placeholder="e.g. Tata Tech, Swiggy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="company-name"
            className="text-xs font-medium text-foreground"
          >
            Company Name (Optional)
          </label>
          <Input
            id="company-name"
            placeholder="e.g. Swiggy Limited"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Type Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">
          IPO Type *
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`flex flex-col items-start rounded-md border p-2 text-left transition-all ${
              type === "mainboard"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:bg-muted/50"
            }`}
            onClick={() => setType("mainboard")}
            disabled={loading}
          >
            <span className="text-xs font-semibold text-foreground">
              Mainboard
            </span>
            <span className="text-[11px] text-muted-foreground">
              Regular retail IPOs (~₹15k/lot)
            </span>
          </button>

          <button
            type="button"
            className={`flex flex-col items-start rounded-md border p-2 text-left transition-all ${
              type === "sme"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:bg-muted/50"
            }`}
            onClick={() => setType("sme")}
            disabled={loading}
          >
            <span className="text-xs font-semibold text-foreground">
              SME IPO
            </span>
            <span className="text-[11px] text-muted-foreground">
              Small & medium enterprise (~₹1L+/lot)
            </span>
          </button>
        </div>
      </div>

      {/* Issue Price, Lot Size, and Min Calculation */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor="issue-price"
            className="text-xs font-medium text-foreground"
          >
            Issue Price (₹) *
          </label>
          <Input
            id="issue-price"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="750"
            value={issuePrice}
            onChange={(e) => setIssuePrice(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="lot-size"
            className="text-xs font-medium text-foreground"
          >
            Lot Size (Shares) *
          </label>
          <Input
            id="lot-size"
            type="number"
            min="1"
            step="1"
            placeholder="20"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="col-span-2 space-y-1 rounded-md border bg-muted/40 p-2 sm:col-span-1">
          <span className="text-[11px] text-muted-foreground block">
            1 Lot Amount
          </span>
          <span className="text-xs font-semibold text-foreground">
            {formatCurrency(minApplicationAmount)}
          </span>
        </div>
      </div>

      {/* Optional Price Band */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="price-band-min"
            className="text-xs font-medium text-foreground"
          >
            Price Band Min (₹, Optional)
          </label>
          <Input
            id="price-band-min"
            type="number"
            min="0"
            step="0.01"
            placeholder="700"
            value={priceBandMin}
            onChange={(e) => setPriceBandMin(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="price-band-max"
            className="text-xs font-medium text-foreground"
          >
            Price Band Max (₹, Optional)
          </label>
          <Input
            id="price-band-max"
            type="number"
            min="0"
            step="0.01"
            placeholder="750"
            value={priceBandMax}
            onChange={(e) => setPriceBandMax(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Important Dates */}
      <div className="space-y-2 rounded-md border p-3">
        <span className="text-xs font-semibold text-foreground block">
          Key Dates (Optional)
        </span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label
              htmlFor="open-date"
              className="text-[11px] text-muted-foreground"
            >
              Open Date
            </label>
            <Input
              id="open-date"
              type="date"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="close-date"
              className="text-[11px] text-muted-foreground"
            >
              Close Date
            </label>
            <Input
              id="close-date"
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="allotment-date"
              className="text-[11px] text-muted-foreground"
            >
              Allotment Date
            </label>
            <Input
              id="allotment-date"
              type="date"
              value={allotmentDate}
              onChange={(e) => setAllotmentDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="listing-date"
              className="text-[11px] text-muted-foreground"
            >
              Listing Date
            </label>
            <Input
              id="listing-date"
              type="date"
              value={listingDate}
              onChange={(e) => setListingDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label
          htmlFor="ipo-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (Optional)
        </label>
        <Textarea
          id="ipo-notes"
          placeholder="e.g. Expected subscription, GMP notes, mandate reminders"
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
              Saving...
            </>
          ) : isEditing ? (
            "Save Changes"
          ) : (
            "Add IPO"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
