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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
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
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle className="max-w-md truncate">
            {accountToEdit
              ? "Edit Application Account"
              : "Add Application Account"}
          </DialogTitle>
          <DialogDescription className="text-xs break-words">
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
  const [profitSharePercent, setProfitSharePercent] = useState<string>(
    accountToEdit?.profitSharePercent !== undefined
      ? String(accountToEdit.profitSharePercent)
      : "40"
  )
  const [pan, setPan] = useState(accountToEdit?.pan ?? "")
  const [dematAccount, setDematAccount] = useState(
    accountToEdit?.dematAccount ?? ""
  )
  const [phoneNumber, setPhoneNumber] = useState(
    accountToEdit?.phoneNumber ?? ""
  )
  const [notes, setNotes] = useState(accountToEdit?.notes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = (newType: AccountType) => {
    setType(newType)
    if (newType === "my") {
      setProfitSharePercent("0")
    } else if (profitSharePercent === "0" || !profitSharePercent) {
      setProfitSharePercent("40")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter an account name.")
      return
    }

    const cleanPan = pan.trim().toUpperCase()
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      setError(
        "Please enter a valid 10-character PAN number (e.g. ABCDE1234F)."
      )
      return
    }

    let parsedPercent: number | undefined
    if (type === "other") {
      const parsed = parseFloat(profitSharePercent)
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setError("Profit share percentage must be between 0 and 100.")
        return
      }
      parsedPercent = parsed
    }

    setError(null)
    setLoading(true)

    try {
      if (isEditing && accountToEdit) {
        await updateApplicationAccount(userId, accountToEdit.id, {
          name: name.trim(),
          type,
          profitSharePercent: type === "my" ? undefined : parsedPercent,
          pan: cleanPan || null,
          dematAccount: dematAccount.trim() || null,
          phoneNumber: phoneNumber.trim() || null,
          notes: notes.trim(),
        })
        toast.add({
          title: "Account updated successfully",
          type: "success",
        })
      } else {
        await createApplicationAccount(userId, {
          name: name.trim(),
          type,
          profitSharePercent: type === "my" ? undefined : parsedPercent,
          pan: cleanPan || undefined,
          dematAccount: dematAccount.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          notes: notes.trim(),
        })
        toast.add({
          title: "Account created successfully",
          type: "success",
        })
      }
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save account. Please try again.")
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
        {/* Account Name */}
        <Field>
          <FieldLabel htmlFor="account-name">
            Account Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="account-name"
            placeholder="e.g. My Account 1, Rahul Demat, Family 2..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        </Field>

        {/* Account Type (ToggleGroup) */}
        <Field>
          <FieldLabel>
            Account Ownership <span className="text-destructive">*</span>
          </FieldLabel>
          <ToggleGroup
            value={[type]}
            onValueChange={(val) => {
              if (val && val[0]) handleTypeChange(val[0] as AccountType)
            }}
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem
              value="my"
              className="py-1.5 text-xs font-semibold"
            >
              My Account (100% to You)
            </ToggleGroupItem>
            <ToggleGroupItem
              value="other"
              className="py-1.5 text-xs font-semibold"
            >
              Other / Family (Profit Shared)
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        {/* Profit Sharing Percentage (shown for "Other" accounts) */}
        {type === "other" && (
          <div className="flex flex-col gap-1.5 rounded-none border bg-muted/30 p-3">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="profit-share-pct">
                  Account Owner&apos;s Profit Share (%)
                </FieldLabel>
                <span className="text-xs font-bold text-warning-foreground">
                  {profitSharePercent || "0"}%
                </span>
              </div>
              <Input
                id="profit-share-pct"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Default: 40"
                value={profitSharePercent}
                onChange={(e) => setProfitSharePercent(e.target.value)}
                disabled={loading}
                className="bg-background"
              />
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                When this account is allotted and shares are sold at a profit,{" "}
                <strong>{profitSharePercent || "0"}%</strong> goes to the
                account owner and{" "}
                <strong>{100 - (parseFloat(profitSharePercent) || 0)}%</strong>{" "}
                is retained by you. (₹0 deduction on loss/break-even).
              </p>
            </Field>
          </div>
        )}

        {/* PAN & Demat Account Numbers (Optional for 1-Click Allotment Checker) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="account-pan">PAN Number (Optional)</FieldLabel>
            <Input
              id="account-pan"
              placeholder="e.g. ABCDE1234F"
              value={pan}
              onChange={(e) => setPan(e.target.value.toUpperCase())}
              disabled={loading}
              maxLength={10}
              className="font-mono text-xs uppercase"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="account-demat">
              Demat / DP ID (Optional)
            </FieldLabel>
            <Input
              id="account-demat"
              placeholder="e.g. 1208160012345678"
              value={dematAccount}
              onChange={(e) => setDematAccount(e.target.value)}
              disabled={loading}
              className="font-mono text-xs"
            />
          </Field>
        </div>

        {/* Mobile / WhatsApp Number */}
        <Field>
          <FieldLabel htmlFor="account-phone">
            Mobile / WhatsApp Number (Optional)
          </FieldLabel>
          <Input
            id="account-phone"
            type="tel"
            placeholder="e.g. 9876543210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
            disabled={loading}
            maxLength={10}
            className="font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Used to auto-populate WhatsApp settlement messages for this account
            owner.
          </p>
        </Field>

        {/* Notes */}
        <Field>
          <FieldLabel htmlFor="account-notes">Notes (Optional)</FieldLabel>
          <Textarea
            id="account-notes"
            placeholder="e.g. Zerodha account, family member..."
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
              : "Create Account"}
        </Button>
      </DialogFooter>
    </form>
  )
}
