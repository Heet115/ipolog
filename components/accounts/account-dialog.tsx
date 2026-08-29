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
  createApplicationAccount,
  updateApplicationAccount,
} from "@/lib/firebase/accounts"
import type { ApplicationAccount, AccountType } from "@/types"

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  accountToEdit?: ApplicationAccount | null
  onSuccess: () => void
}

export function AccountDialog({
  open,
  onOpenChange,
  userId,
  accountToEdit,
  onSuccess,
}: AccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {accountToEdit ? "Edit Application Account" : "Add Application Account"}
          </DialogTitle>
          <DialogDescription>
            {accountToEdit
              ? "Update application account details and profit share."
              : "Create an account label to associate with IPO applications."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <AccountForm
            key={accountToEdit?.id ?? "new"}
            userId={userId}
            accountToEdit={accountToEdit}
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

function AccountForm({
  userId,
  accountToEdit,
  onCancel,
  onSuccess,
}: {
  userId: string
  accountToEdit?: ApplicationAccount | null
  onCancel: () => void
  onSuccess: () => void
}) {
  const isEditing = Boolean(accountToEdit)

  const [name, setName] = useState(accountToEdit?.name ?? "")
  const [type, setType] = useState<AccountType>(accountToEdit?.type ?? "my")
  const [profitSharePercent, setProfitSharePercent] = useState<number>(
    accountToEdit?.type === "other"
      ? accountToEdit.profitSharePercent
      : accountToEdit?.type === "my"
        ? 0
        : 40
  )
  const [notes, setNotes] = useState(accountToEdit?.notes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = (newType: AccountType) => {
    setType(newType)
    if (newType === "my") {
      setProfitSharePercent(0)
    } else if (profitSharePercent === 0) {
      setProfitSharePercent(40)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter an account name.")
      return
    }

    if (type === "other") {
      if (
        profitSharePercent === undefined ||
        profitSharePercent < 0 ||
        profitSharePercent > 100
      ) {
        setError("Profit share percentage must be between 0 and 100.")
        return
      }
    }

    setError(null)
    setLoading(true)

    try {
      if (isEditing && accountToEdit) {
        await updateApplicationAccount(userId, accountToEdit.id, {
          name: name.trim(),
          type,
          profitSharePercent: type === "my" ? 0 : Number(profitSharePercent),
          notes: notes.trim(),
        })
        toast.add({
          title: "Account updated",
          type: "success",
        })
      } else {
        await createApplicationAccount(userId, {
          name: name.trim(),
          type,
          profitSharePercent: type === "my" ? 0 : Number(profitSharePercent),
          notes: notes.trim(),
        })
        toast.add({
          title: "Account created",
          type: "success",
        })
      }
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save application account. Please try again.")
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
          htmlFor="account-name"
          className="text-xs font-medium text-foreground"
        >
          Account Name *
        </label>
        <Input
          id="account-name"
          placeholder="e.g. My Account 1, Other Account 1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          required
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">
          Account Type *
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`flex flex-col items-start rounded-md border p-2.5 text-left transition-all ${
              type === "my"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:bg-muted/50"
            }`}
            onClick={() => handleTypeChange("my")}
            disabled={loading}
          >
            <span className="text-xs font-semibold text-foreground">
              My Account
            </span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              Your account (0% share)
            </span>
          </button>

          <button
            type="button"
            className={`flex flex-col items-start rounded-md border p-2.5 text-left transition-all ${
              type === "other"
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border bg-card hover:bg-muted/50"
            }`}
            onClick={() => handleTypeChange("other")}
            disabled={loading}
          >
            <span className="text-xs font-semibold text-foreground">
              Other Account
            </span>
            <span className="mt-0.5 text-[11px] text-muted-foreground">
              Shared profit (default 40%)
            </span>
          </button>
        </div>
      </div>

      {type === "other" && (
        <div className="space-y-1 rounded-md border bg-muted/30 p-2.5">
          <label
            htmlFor="profit-share"
            className="text-xs font-medium text-foreground"
          >
            Profit Share % *
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="profit-share"
              type="number"
              min="0"
              max="100"
              step="1"
              value={profitSharePercent}
              onChange={(e) => setProfitSharePercent(Number(e.target.value))}
              disabled={loading}
              required
            />
            <span className="text-xs font-medium text-muted-foreground">%</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Percentage of profit shared with this account. Default is 40%.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <label
          htmlFor="account-notes"
          className="text-xs font-medium text-foreground"
        >
          Notes (Optional)
        </label>
        <Textarea
          id="account-notes"
          placeholder="e.g. Special profit sharing agreement or reminder notes"
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
            "Create Account"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
