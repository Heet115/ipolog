"use client"

import { useState } from "react"
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
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  createBankAccount,
  updateBankAccount,
} from "@/lib/firebase/bank-accounts"
import type { BankAccount } from "@/types"

interface BankAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  bankAccountToEdit?: BankAccount | null
  onSuccess: () => void
}

export function BankAccountDialog({
  open,
  onOpenChange,
  userId,
  bankAccountToEdit,
  onSuccess,
}: BankAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            {bankAccountToEdit ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
          <DialogDescription className="text-xs break-words">
            {bankAccountToEdit
              ? "Update bank account details."
              : "Add the bank accounts you use to apply for IPOs."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <BankAccountForm
            key={bankAccountToEdit?.id ?? "new"}
            userId={userId}
            bankAccountToEdit={bankAccountToEdit}
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

function BankAccountForm({
  userId,
  bankAccountToEdit,
  onCancel,
  onSuccess,
}: {
  userId: string
  bankAccountToEdit?: BankAccount | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const isEditing = Boolean(bankAccountToEdit)

  const [bankName, setBankName] = useState(bankAccountToEdit?.bankName ?? "")
  const [nickname, setNickname] = useState(bankAccountToEdit?.nickname ?? "")
  const [last4, setLast4] = useState(bankAccountToEdit?.last4 ?? "")
  const [upiId, setUpiId] = useState(bankAccountToEdit?.upiId ?? "")
  const [notes, setNotes] = useState(bankAccountToEdit?.notes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankName.trim()) {
      setError("Please enter a bank name.")
      return
    }

    if (last4.trim() && !/^\d{4}$/.test(last4.trim())) {
      setError("Last 4 digits must be exactly 4 numeric digits (e.g. 1234).")
      return
    }

    if (upiId.trim() && !upiId.includes("@")) {
      setError(
        "Please enter a valid UPI ID (e.g. name@upi or mobile@okhdfcbank)."
      )
      return
    }

    setError(null)
    setLoading(true)

    try {
      if (isEditing && bankAccountToEdit) {
        await updateBankAccount(userId, bankAccountToEdit.id, {
          bankName: bankName.trim(),
          nickname: nickname.trim() || undefined,
          last4: last4.trim() || undefined,
          upiId: upiId.trim() || undefined,
          notes: notes.trim(),
        })
        toast.add({
          title: "Bank account updated successfully",
          type: "success",
        })
      } else {
        await createBankAccount(userId, {
          bankName: bankName.trim(),
          nickname: nickname.trim() || undefined,
          last4: last4.trim() || undefined,
          upiId: upiId.trim() || undefined,
          notes: notes.trim(),
        })
        toast.add({
          title: "Bank account created successfully",
          type: "success",
        })
      }
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save bank account. Please try again.")
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
        {/* Bank Name */}
        <Field>
          <FieldLabel htmlFor="bank-name">
            Bank Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="bank-name"
            placeholder="e.g. HDFC Bank, ICICI Bank, SBI, Kotak..."
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        {/* Nickname & Last 4 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="nickname">Nickname (Optional)</FieldLabel>
            <Input
              id="nickname"
              placeholder="e.g. Salary A/c, Main..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="last4">Last 4 Digits</FieldLabel>
            <Input
              id="last4"
              placeholder="e.g. 1234"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
              disabled={loading}
              className="font-mono"
            />
          </Field>
        </div>

        {/* Linked UPI ID */}
        <Field>
          <FieldLabel htmlFor="upi-id">
            Linked UPI ID (For Settlement Payments)
          </FieldLabel>
          <Input
            id="upi-id"
            placeholder="e.g. yourname@okhdfcbank, mobile@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            disabled={loading}
            className="font-mono"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Account owners will be directed to transfer their IPO sale payout to
            this UPI ID.
          </p>
        </Field>

        {/* Notes */}
        <Field>
          <FieldLabel htmlFor="bank-notes">Notes (Optional)</FieldLabel>
          <Textarea
            id="bank-notes"
            placeholder="e.g. Branch details, customer ID, or other notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={loading}
            className="resize-none"
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
              : "Add Bank Account"}
        </Button>
      </DialogFooter>
    </form>
  )
}
