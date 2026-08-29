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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {bankAccountToEdit ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
          <DialogDescription>
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
  const [notes, setNotes] = useState(bankAccountToEdit?.notes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankName.trim()) {
      setError("Please enter a bank name.")
      return
    }

    if (last4.trim() && !/^\d{1,6}$/.test(last4.trim())) {
      setError("Last digits should contain only numbers (e.g. 1234).")
      return
    }

    setError(null)
    setLoading(true)

    try {
      if (isEditing && bankAccountToEdit) {
        await updateBankAccount(userId, bankAccountToEdit.id, {
          bankName: bankName.trim(),
          nickname: nickname.trim(),
          last4: last4.trim(),
          notes: notes.trim(),
        })
        toast.add({
          title: "Bank account updated",
          type: "success",
        })
      } else {
        await createBankAccount(userId, {
          bankName: bankName.trim(),
          nickname: nickname.trim(),
          last4: last4.trim(),
          notes: notes.trim(),
        })
        toast.add({
          title: "Bank account added",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="bank-name"
          className="text-xs font-medium text-foreground"
        >
          Bank Name *
        </label>
        <Input
          id="bank-name"
          placeholder="e.g. HDFC Bank, SBI, ICICI"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          disabled={loading}
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor="bank-nickname"
            className="text-xs font-medium text-foreground"
          >
            Nickname (Optional)
          </label>
          <Input
            id="bank-nickname"
            placeholder="e.g. Primary Savings"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="bank-last4"
            className="text-xs font-medium text-foreground"
          >
            Last 4 Digits (Optional)
          </label>
          <Input
            id="bank-last4"
            placeholder="e.g. 1234"
            maxLength={6}
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="bank-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (Optional)
        </label>
        <Textarea
          id="bank-notes"
          placeholder="e.g. Used for ASBA / UPI mandates"
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
            "Add Bank Account"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
