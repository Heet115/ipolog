"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  updateApplication,
  deleteApplication,
} from "@/lib/firebase/applications"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  ALL_CATEGORIES,
  getCategoryMinLots,
  validateCategoryLots,
} from "@/lib/calculations/categories"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
  ApplicationCategory,
} from "@/types"

interface EditApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  application: Application | null
  account?: ApplicationAccount
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function EditApplicationDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  application,
  account,
  bankAccounts,
  onSuccess,
}: EditApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            Edit Application — {account?.name}
          </DialogTitle>
          <DialogDescription className="break-words">
            Modify lots, funding bank account, or notes for this application.
          </DialogDescription>
        </DialogHeader>

        {open && application && (
          <EditApplicationForm
            key={application.id}
            userId={userId}
            ipo={ipo}
            application={application}
            account={account}
            bankAccounts={bankAccounts}
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

function EditApplicationForm({
  userId,
  ipo,
  application,
  account,
  bankAccounts,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  application: Application
  account?: ApplicationAccount
  bankAccounts: BankAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const [bankAccountId, setBankAccountId] = useState(application.bankAccountId)
  const [category, setCategory] = useState<ApplicationCategory>(
    application.category || "retail"
  )
  const [lotsApplied, setLotsApplied] = useState(
    String(application.lotsApplied)
  )
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [allottedLots, setAllottedLots] = useState(
    application.allottedLots !== undefined
      ? String(application.allottedLots)
      : ""
  )
  const [applicationDate, setApplicationDate] = useState<Date | undefined>(
    application.applicationDate?.toDate?.() ?? undefined
  )
  const [notes, setNotes] = useState(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numLots = parseInt(lotsApplied, 10) || 1
  const sharesApplied = calculateSharesApplied(numLots, ipo.lotSize)
  const amountApplied = calculateAmountApplied(
    numLots,
    ipo.lotSize,
    ipo.issuePrice
  )
  const categoryValidation = validateCategoryLots(
    category,
    numLots,
    ipo.lotSize,
    ipo.issuePrice
  )

  const activeBanks = bankAccounts.filter(
    (b) => !b.archived || b.id === application.bankAccountId
  )

  const handleCategoryChange = (newCat: ApplicationCategory) => {
    setCategory(newCat)
    const minLots = getCategoryMinLots(newCat, ipo.lotSize, ipo.issuePrice)
    if (numLots < minLots) {
      setLotsApplied(String(minLots))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteApplication(userId, application.id)
      toast.add({
        title: "Application removed",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      toast.add({
        title: "Failed to remove application",
        type: "error",
      })
    } finally {
      setDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankAccountId) {
      setError("Please select a bank account.")
      return
    }

    if (!numLots || numLots <= 0) {
      setError("Please enter a valid lot size (at least 1).")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const numAllottedLots =
        status === "allotted" || status === "sold"
          ? parseInt(allottedLots, 10) || numLots
          : status === "not_allotted"
            ? 0
            : undefined

      const finalAllottedShares =
        numAllottedLots !== undefined
          ? numAllottedLots * ipo.lotSize
          : undefined
      await updateApplication(userId, application.id, {
        bankAccountId,
        category,
        lotsApplied: numLots,
        sharesApplied,
        amountApplied,
        status,
        allottedLots: numAllottedLots,
        allottedShares: finalAllottedShares,
        applicationDate: applicationDate
          ? Timestamp.fromDate(applicationDate)
          : undefined,
        notes: notes.trim(),
      })

      toast.add({
        title: "Application updated successfully",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to update application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FieldGroup>
          {/* Quota Category & Bank Account */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Quota Category</FieldLabel>
              <Select
                value={category}
                onValueChange={(val) =>
                  val && handleCategoryChange(val as ApplicationCategory)
                }
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue>
                    {CATEGORY_CONFIG[category].label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span>{CATEGORY_CONFIG[cat].label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({CATEGORY_CONFIG[cat].amountLimitText})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Bank Account Selection (Select) */}
            <Field>
              <FieldLabel>
                Bank Account <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={bankAccountId}
                onValueChange={(val) => val && setBankAccountId(val)}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue placeholder="Select bank">
                    {(val) => {
                      const b = activeBanks.find((acc) => acc.id === val)
                      return b ? formatBankAccount(b) : "Select bank"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeBanks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {formatBankAccount(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Lots Applied & Real-time calculation */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="edit-lots">
                Lots Applied <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="edit-lots"
                type="number"
                min="1"
                step="1"
                value={lotsApplied}
                onChange={(e) => setLotsApplied(e.target.value)}
                required
                disabled={loading}
              />
              {!categoryValidation.isValid && (
                <span className="text-[10px] text-destructive font-medium mt-1 block">
                  ⚠️ {categoryValidation.warning}
                </span>
              )}
            </Field>

            <div className="flex flex-col justify-start">
              <div className="rounded-none border bg-muted/40 p-2 text-xs">
                <span className="block text-[10px] text-muted-foreground">
                  Applied Amount ({CATEGORY_CONFIG[category].shortLabel}):
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(amountApplied)}{" "}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    ({sharesApplied} shares)
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Status & Allotted Lots */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(val) =>
                  val && setStatus(val as ApplicationStatus)
                }
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue>
                    {(val) => {
                      const labels: Record<string, string> = {
                        pending: "Pending",
                        allotted: "Allotted",
                        not_allotted: "Not Allotted",
                        sold: "Sold",
                      }
                      return val ? labels[val] || val : "Select status"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="allotted">Allotted</SelectItem>
                  <SelectItem value="not_allotted">Not Allotted</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {status === "allotted" && (
              <Field>
                <FieldLabel htmlFor="edit-allotted-lots">
                  Allotted Lots
                </FieldLabel>
                <Input
                  id="edit-allotted-lots"
                  type="number"
                  min="1"
                  max={numLots}
                  step="1"
                  value={allottedLots}
                  onChange={(e) => setAllottedLots(e.target.value)}
                  placeholder={`Max ${numLots}`}
                  disabled={loading}
                  className="font-mono"
                />
              </Field>
            )}
          </div>

          {/* Application Date (DatePicker) */}
          <Field>
            <FieldLabel>Application Date</FieldLabel>
            <DatePicker
              date={applicationDate}
              onDateChange={setApplicationDate}
              placeholder="Select application date"
              disabled={loading}
            />
          </Field>

          {/* Notes */}
          <Field>
            <FieldLabel htmlFor="edit-notes">Notes (Optional)</FieldLabel>
            <Textarea
              id="edit-notes"
              placeholder="e.g. Applied via UPI Mandate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={loading}
              className="resize-none"
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="flex flex-col items-stretch justify-between gap-2 border-t pt-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={loading || deleting}
          >
            <Trash2 data-icon="inline-start" />
            Delete Application
          </Button>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading || deleting}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || deleting} size="sm">
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </form>

      {/* Delete Application Confirmation Dialog */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this application for{" "}
              <strong>{account?.name || "this account"}</strong>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
