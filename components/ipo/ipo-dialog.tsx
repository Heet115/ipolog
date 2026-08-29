"use client"

import { useState } from "react"
import { Calculator } from "lucide-react"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DatePicker } from "@/components/ui/date-picker"
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { createIpo, updateIpo } from "@/lib/firebase/ipos"
import { formatCurrency } from "@/lib/utils/ipo"
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
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            {ipoToEdit ? "Edit IPO Details" : "Add New IPO"}
          </DialogTitle>
          <DialogDescription className="break-words">
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
  const [issuePrice, setIssuePrice] = useState(
    ipoToEdit?.issuePrice !== undefined ? String(ipoToEdit.issuePrice) : ""
  )
  const [priceBandMin, setPriceBandMin] = useState(
    ipoToEdit?.priceBandMin !== undefined ? String(ipoToEdit.priceBandMin) : ""
  )
  const [priceBandMax, setPriceBandMax] = useState(
    ipoToEdit?.priceBandMax !== undefined ? String(ipoToEdit.priceBandMax) : ""
  )
  const [lotSize, setLotSize] = useState(
    ipoToEdit?.lotSize !== undefined ? String(ipoToEdit.lotSize) : ""
  )

  const [openDate, setOpenDate] = useState<Date | undefined>(
    ipoToEdit?.openDate?.toDate?.() ?? undefined
  )
  const [closeDate, setCloseDate] = useState<Date | undefined>(
    ipoToEdit?.closeDate?.toDate?.() ?? undefined
  )
  const [allotmentDate, setAllotmentDate] = useState<Date | undefined>(
    ipoToEdit?.allotmentDate?.toDate?.() ?? undefined
  )
  const [listingDate, setListingDate] = useState<Date | undefined>(
    ipoToEdit?.listingDate?.toDate?.() ?? undefined
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
      setError("Please enter the IPO name.")
      return
    }

    if (!numIssuePrice || numIssuePrice <= 0) {
      setError("Please enter a valid issue price greater than 0.")
      return
    }

    if (!numLotSize || numLotSize <= 0) {
      setError("Please enter a valid lot size (at least 1 share).")
      return
    }

    if (priceBandMin && priceBandMax) {
      const min = parseFloat(priceBandMin)
      const max = parseFloat(priceBandMax)
      if (min > max) {
        setError("Price band floor cannot exceed cap.")
        return
      }
    }

    if (openDate && closeDate && openDate > closeDate) {
      setError("Open date cannot be after close date.")
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
          openDate: openDate ? Timestamp.fromDate(openDate) : null,
          closeDate: closeDate ? Timestamp.fromDate(closeDate) : null,
          allotmentDate: allotmentDate
            ? Timestamp.fromDate(allotmentDate)
            : null,
          listingDate: listingDate ? Timestamp.fromDate(listingDate) : null,
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
          openDate: openDate ? Timestamp.fromDate(openDate) : undefined,
          closeDate: closeDate ? Timestamp.fromDate(closeDate) : undefined,
          allotmentDate: allotmentDate
            ? Timestamp.fromDate(allotmentDate)
            : undefined,
          listingDate: listingDate
            ? Timestamp.fromDate(listingDate)
            : undefined,
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
      setError("Failed to save IPO. Please try again.")
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

      <FieldGroup>
        {/* Name & Company */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="ipo-name">
              IPO Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="ipo-name"
              placeholder="e.g. Swiggy Limited"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="company-name">
              Company / Symbol Name
            </FieldLabel>
            <Input
              id="company-name"
              placeholder="e.g. SWIGGY"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>

        {/* IPO Type Selection (ToggleGroup) */}
        <Field>
          <FieldLabel>
            IPO Category <span className="text-destructive">*</span>
          </FieldLabel>
          <ToggleGroup
            value={[type]}
            onValueChange={(val) => {
              if (val && val[0]) setType(val[0] as IpoType)
            }}
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem
              value="mainboard"
              className="py-1.5 text-xs font-semibold"
            >
              Mainboard IPO
            </ToggleGroupItem>
            <ToggleGroupItem
              value="sme"
              className="py-1.5 text-xs font-semibold"
            >
              SME IPO
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        {/* Pricing & Lot Size */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="issue-price">
              Issue Price (₹) <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="issue-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 390"
              value={issuePrice}
              onChange={(e) => setIssuePrice(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="lot-size">
              Lot Size (Shares per lot){" "}
              <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="lot-size"
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 38"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              required
              disabled={loading}
            />
          </Field>
        </div>

        {/* Price Band (Optional) */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="price-band-min">
              Price Band Floor (₹)
            </FieldLabel>
            <Input
              id="price-band-min"
              type="number"
              step="0.01"
              placeholder="e.g. 371"
              value={priceBandMin}
              onChange={(e) => setPriceBandMin(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="price-band-max">Price Band Cap (₹)</FieldLabel>
            <Input
              id="price-band-max"
              type="number"
              step="0.01"
              placeholder="e.g. 390"
              value={priceBandMax}
              onChange={(e) => setPriceBandMax(e.target.value)}
              disabled={loading}
            />
          </Field>
        </div>

        {/* Live 1-Lot Investment Preview */}
        {minApplicationAmount > 0 && (
          <div className="flex items-center justify-between rounded-none border bg-muted/40 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Calculator className="size-3.5" />
              <span>1 Lot Investment Required:</span>
            </div>
            <span className="font-bold text-foreground">
              {formatCurrency(minApplicationAmount)}{" "}
              <span className="text-[10px] font-normal text-muted-foreground">
                ({numLotSize} shares)
              </span>
            </span>
          </div>
        )}

        {/* Key Dates (DatePickers) */}
        <FieldSet className="border-t pt-3">
          <FieldLegend variant="label">Key Dates (Optional)</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Bidding Open Date</FieldLabel>
              <DatePicker
                date={openDate}
                onDateChange={setOpenDate}
                placeholder="Select open date"
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Bidding Close Date</FieldLabel>
              <DatePicker
                date={closeDate}
                onDateChange={setCloseDate}
                placeholder="Select close date"
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Allotment Date</FieldLabel>
              <DatePicker
                date={allotmentDate}
                onDateChange={setAllotmentDate}
                placeholder="Select allotment date"
                disabled={loading}
              />
            </Field>

            <Field>
              <FieldLabel>Listing Date</FieldLabel>
              <DatePicker
                date={listingDate}
                onDateChange={setListingDate}
                placeholder="Select listing date"
                disabled={loading}
              />
            </Field>
          </div>
        </FieldSet>

        {/* Notes */}
        <Field>
          <FieldLabel htmlFor="ipo-notes">Notes</FieldLabel>
          <Textarea
            id="ipo-notes"
            placeholder="e.g. GMP ~ ₹25, applied in Retail & HNI..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={loading}
          />
        </Field>
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
          {loading
            ? isEditing
              ? "Updating..."
              : "Creating..."
            : isEditing
              ? "Save Changes"
              : "Create IPO"}
        </Button>
      </DialogFooter>
    </form>
  )
}
