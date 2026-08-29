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
import { updateApplication } from "@/lib/firebase/applications"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
          <DialogDescription>
            Modify lots, bank account, or notes for {account?.name}.
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
              onSuccess()
              onOpenChange(false)
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
  const [lotsApplied, setLotsApplied] = useState(application.lotsApplied)
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [notes, setNotes] = useState(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeBankAccounts = bankAccounts.filter((b) => !b.archived || b.id === application.bankAccountId)

  const sharesApplied = calculateSharesApplied(lotsApplied, ipo.lotSize)
  const amountApplied = calculateAmountApplied(
    lotsApplied,
    ipo.lotSize,
    ipo.issuePrice
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!lotsApplied || lotsApplied <= 0) {
      setError("Lots applied must be at least 1.")
      return
    }

    if (!bankAccountId) {
      setError("Please select a bank account.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await updateApplication(userId, application.id, {
        bankAccountId,
        lotsApplied,
        sharesApplied,
        amountApplied,
        status,
        notes: notes.trim(),
      })

      toast.add({
        title: "Application updated",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Account Info */}
      <div className="rounded-md bg-muted/40 p-2.5 text-xs">
        <span className="text-muted-foreground block text-[11px]">Account</span>
        <span className="font-semibold text-foreground">
          {account?.name || "Application Account"}
        </span>
        <span className="text-muted-foreground ml-2">
          ({account?.type === "my" ? "My Account" : `${account?.profitSharePercent}% Share`})
        </span>
      </div>

      {/* Bank Account */}
      <div className="space-y-1">
        <label
          htmlFor="edit-bank"
          className="text-xs font-medium text-foreground"
        >
          Bank Account *
        </label>
        <select
          id="edit-bank"
          className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          disabled={loading}
          required
        >
          {activeBankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {formatBankAccount(b)}
            </option>
          ))}
        </select>
      </div>

      {/* Lots & Calculations */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="edit-lots"
            className="text-xs font-medium text-foreground"
          >
            Lots Applied *
          </label>
          <Input
            id="edit-lots"
            type="number"
            min="1"
            step="1"
            value={lotsApplied}
            onChange={(e) => setLotsApplied(Math.max(1, Number(e.target.value)))}
            disabled={loading}
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="edit-status"
            className="text-xs font-medium text-foreground"
          >
            Status
          </label>
          <select
            id="edit-status"
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring capitalize"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            disabled={loading}
          >
            <option value="pending">Pending</option>
            <option value="allotted">Allotted</option>
            <option value="not_allotted">Not Allotted</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Calculation Summary */}
      <div className="rounded-md border bg-muted/20 p-2.5 text-xs flex justify-between items-center">
        <div>
          <span className="text-[11px] text-muted-foreground block">
            Shares: {sharesApplied}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-muted-foreground block">
            Total Amount
          </span>
          <span className="font-semibold text-foreground">
            {formatCurrency(amountApplied)}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label
          htmlFor="edit-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (Optional)
        </label>
        <Textarea
          id="edit-notes"
          placeholder="e.g. Mandate accepted via GPay"
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
          ) : (
            "Save Changes"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
