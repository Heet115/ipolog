"use client"

import { Calculator } from "lucide-react"
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
import { DialogFooter } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/utils/ipo"
import { KNOWN_REGISTRARS } from "@/lib/utils/registrars"
import { useIpoForm } from "@/hooks/use-ipo-form"
import type { Ipo, IpoType } from "@/types"

interface IpoFormProps {
  userId: string
  ipoToEdit: Ipo
  onCancel: () => void
  onSuccess: (id?: string) => void
}

export function IpoForm({
  userId,
  ipoToEdit,
  onCancel,
  onSuccess,
}: IpoFormProps) {
  const {
    name,
    setName,
    companyName,
    setCompanyName,
    type,
    setType,
    issuePrice,
    setIssuePrice,
    priceBandMin,
    setPriceBandMin,
    priceBandMax,
    setPriceBandMax,
    lotSize,
    setLotSize,
    openDate,
    setOpenDate,
    closeDate,
    setCloseDate,
    allotmentDate,
    setAllotmentDate,
    listingDate,
    setListingDate,
    registrar,
    registrarUrl,
    setRegistrarUrl,
    notes,
    setNotes,
    loading,
    error,
    numLotSize,
    minApplicationAmount,
    handleRegistrarChange,
    handleQuickRegistrarSelect,
    handleSubmit,
  } = useIpoForm({ userId, ipoToEdit, onSuccess })

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

        {/* Registrar (For 1-Click Allotment Status Checker) */}
        <FieldSet className="border-t pt-3">
          <FieldLegend variant="label">
            Registrar & Allotment Link (Optional)
          </FieldLegend>
          <div className="flex flex-col gap-2.5">
            <Field>
              <FieldLabel htmlFor="ipo-registrar">Registrar Name</FieldLabel>
              <Input
                id="ipo-registrar"
                placeholder="e.g. Link Intime, KFintech, Bigshare..."
                value={registrar}
                onChange={(e) => handleRegistrarChange(e.target.value)}
                disabled={loading}
              />
            </Field>

            {/* Quick Registrar Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] text-muted-foreground">
                Quick select:
              </span>
              {KNOWN_REGISTRARS.slice(0, 5).map((reg) => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() =>
                    handleQuickRegistrarSelect(reg.name, reg.checkUrl)
                  }
                  className={`rounded-none border px-1.5 py-0.5 text-[10px] transition-colors ${
                    registrar === reg.name
                      ? "border-foreground bg-foreground font-bold text-background"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {reg.name}
                </button>
              ))}
            </div>

            <Field>
              <FieldLabel htmlFor="ipo-registrar-url">
                Custom Allotment URL (Optional)
              </FieldLabel>
              <Input
                id="ipo-registrar-url"
                placeholder="https://in.mpms.mufg.com/Initial_Offer/public-issues.html"
                value={registrarUrl}
                onChange={(e) => setRegistrarUrl(e.target.value)}
                disabled={loading}
                className="font-mono text-xs"
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
          {loading ? "Updating..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}
