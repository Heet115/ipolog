"use client"

import { useState, useMemo, useId } from "react"
import {
  MessageSquare,
  Copy,
  Check,
  Landmark,
  CheckCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { updateApplicationSettlement } from "@/lib/firebase/applications"
import {
  calculateSettlement,
  formatWhatsAppSettlementMessage,
  getWhatsAppShareUrl,
} from "@/lib/utils/whatsapp-settlement"
import { formatCurrency, formatDate } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface SettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  application: Application | null
  ipo: Ipo
  account?: ApplicationAccount
  bankAccounts?: BankAccount[]
  onSuccess?: () => void
}

export function SettlementDialog({
  open,
  onOpenChange,
  application,
  ipo,
  account,
  bankAccounts = [],
  onSuccess,
}: SettlementDialogProps) {
  if (!application) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                WhatsApp Settlement — {account?.name || "Account Owner"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generate settlement breakdown and UPI share message for {ipo.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {application && (
          <SettlementForm
            application={application}
            ipo={ipo}
            account={account}
            bankAccounts={bankAccounts}
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SettlementForm({
  application,
  ipo,
  account,
  bankAccounts,
  onSuccess,
  onClose,
}: {
  application: Application
  ipo: Ipo
  account?: ApplicationAccount
  bankAccounts: BankAccount[]
  onSuccess?: () => void
  onClose: () => void
}) {
  const { user } = useAuth()
  const defaultSender =
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Me"

  const senderNameInputId = useId()
  const phoneInputId = useId()
  const upiInputId = useId()
  const salePriceInputId = useId()
  const noteInputId = useId()

  // Default bank account from application
  const initialBank =
    bankAccounts.find((b) => b.id === application.bankAccountId) ||
    bankAccounts.find((b) => Boolean(b.upiId)) ||
    bankAccounts[0]

  const [selectedBankId, setSelectedBankId] = useState<string>(
    initialBank?.id || ""
  )
  const [customUpiId, setCustomUpiId] = useState<string>(
    initialBank?.upiId || ""
  )
  const [senderName, setSenderName] = useState<string>(defaultSender)
  const [salePrice, setSalePrice] = useState<string>(
    application.salePrice !== undefined && application.salePrice !== null
      ? String(application.salePrice)
      : String(ipo.currentPrice || ipo.listingPrice || ipo.issuePrice)
  )
  const [phone, setPhone] = useState<string>(account?.phoneNumber ?? "")
  const [note, setNote] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [settlementStatus, setSettlementStatus] = useState<
    "pending" | "settled"
  >(application.settlementStatus || "pending")
  const [updatingSettlement, setUpdatingSettlement] = useState(false)

  // Switch bank account handler
  const handleBankChange = (bankId: string) => {
    setSelectedBankId(bankId)
    const selected = bankAccounts.find((b) => b.id === bankId)
    if (selected?.upiId) {
      setCustomUpiId(selected.upiId)
    }
  }

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId)

  // Calculate settlement
  const calculation = useMemo(() => {
    return calculateSettlement({
      application,
      ipo,
      account,
      bankAccount: selectedBank,
      customSalePrice: Number(salePrice) || ipo.issuePrice,
      customUpiId,
      senderName,
    })
  }, [
    application,
    ipo,
    account,
    selectedBank,
    salePrice,
    customUpiId,
    senderName,
  ])

  // Formatted message
  const message = useMemo(() => {
    return formatWhatsAppSettlementMessage(calculation, note)
  }, [calculation, note])

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      toast.add({
        title: "Settlement message copied!",
        description: "Ready to paste in WhatsApp.",
        type: "success",
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.add({
        title: "Failed to copy",
        type: "error",
      })
    }
  }

  const handleCopyUpi = async () => {
    if (!calculation.upiId) return
    try {
      await navigator.clipboard.writeText(calculation.upiId)
      setCopiedUpi(true)
      toast.add({
        title: "UPI ID copied!",
        type: "success",
      })
      setTimeout(() => setCopiedUpi(false), 2000)
    } catch {
      toast.add({
        title: "Failed to copy UPI ID",
        type: "error",
      })
    }
  }

  const handleSendWhatsApp = () => {
    const url = getWhatsAppShareUrl(message, phone)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleToggleSettlement = async () => {
    if (!user) return
    const nextStatus = settlementStatus === "settled" ? "pending" : "settled"
    setUpdatingSettlement(true)
    try {
      await updateApplicationSettlement(user.uid, application.id, nextStatus)
      setSettlementStatus(nextStatus)
      toast.add({
        title:
          nextStatus === "settled"
            ? "Payment Marked as Settled"
            : "Reverted to Pending Payment",
        description:
          nextStatus === "settled"
            ? `Recorded payment receipt of ${formatCurrency(calculation.amountToSendUser)}.`
            : "Settlement marked as pending receipt.",
        type: "success",
      })
      onSuccess?.()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update settlement status",
        type: "error",
      })
    } finally {
      setUpdatingSettlement(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Financial Breakdown Highlights */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card
          size="sm"
          className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Capital Applied
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              {formatCurrency(calculation.investedAmount)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {calculation.allottedShares} sh @ ₹{calculation.issuePrice}
            </span>
          </div>
        </Card>

        <Card
          size="sm"
          className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Sale Proceeds
            </span>
            <span className="font-mono text-sm font-bold text-foreground">
              {formatCurrency(calculation.saleProceeds)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              In owner&apos;s bank @ ₹{calculation.salePrice}
            </span>
          </div>
        </Card>

        <Card
          size="sm"
          className="rounded-none border-border/60 bg-muted/20 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Owner Keeps ({calculation.profitSharingPercentage}%)
            </span>
            <span className="font-mono text-sm font-bold text-warning-foreground">
              {formatCurrency(calculation.ownerProfitShare)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Profit retention
            </span>
          </div>
        </Card>

        <Card
          size="sm"
          className="rounded-none border-2 border-success/60 bg-success/10 px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold tracking-wider text-success uppercase">
              Transfer to You
            </span>
            <span className="font-mono text-base font-extrabold text-success">
              {formatCurrency(calculation.amountToSendUser)}
            </span>
            <span className="text-[10px] font-medium text-success/90">
              Capital + Your Profit
            </span>
          </div>
        </Card>
      </div>

      {/* Settlement Payment Status Banner */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-none border p-3 text-xs sm:flex-row sm:items-center sm:justify-between",
          settlementStatus === "settled"
            ? "border-success/40 bg-success/10"
            : "border-warning/40 bg-warning/10"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-none border",
              settlementStatus === "settled"
                ? "border-success/50 bg-success/20 text-success"
                : "border-warning/50 bg-warning/20 text-warning-foreground"
            )}
          >
            {settlementStatus === "settled" ? (
              <CheckCheck className="size-4" />
            ) : (
              <Clock className="size-4" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground">Payment Status:</span>
              <Badge
                variant={settlementStatus === "settled" ? "success" : "warning"}
                className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold uppercase tracking-wider"
              >
                {settlementStatus === "settled"
                  ? "Settled / Payment Received"
                  : "Pending Payment"}
              </Badge>
            </div>
            <span className="truncate text-[11px] text-muted-foreground">
              {settlementStatus === "settled"
                ? `Net payout of ${formatCurrency(calculation.amountToSendUser)} marked as received${
                    application.settledAt
                      ? ` on ${formatDate(application.settledAt)}`
                      : ""
                  }.`
                : `Awaiting ${formatCurrency(calculation.amountToSendUser)} transfer from ${account?.name || "account owner"}.`}
            </span>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant={settlementStatus === "settled" ? "outline" : "default"}
          disabled={updatingSettlement}
          onClick={handleToggleSettlement}
          className="h-8 shrink-0 rounded-none text-xs font-semibold"
        >
          {settlementStatus === "settled" ? (
            <>
              <RotateCcw className="size-3" data-icon="inline-start" />
              Revert to Pending
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3" data-icon="inline-start" />
              Mark as Settled
            </>
          )}
        </Button>
      </div>

      {/* Configuration Controls */}
      <Card className="rounded-none border-border/60 bg-card p-3.5">
        <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Bank & UPI Selection */}
          <Field className="gap-1.5">
            <FieldLabel
              htmlFor={upiInputId}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
            >
              <Landmark className="size-3.5 text-muted-foreground" />
              Applied From Bank & UPI ID
            </FieldLabel>
            {bankAccounts.length > 0 ? (
              <Select
                value={selectedBankId}
                onValueChange={(val) => val && handleBankChange(val)}
              >
                <SelectTrigger className="h-8 w-full bg-background font-mono text-xs">
                  <SelectValue placeholder="Select bank account">
                    {(val) => {
                      const bank = bankAccounts.find((b) => b.id === val)
                      if (!bank) return "Select bank account"
                      return `${bank.nickname || bank.bankName} ${bank.last4 ? `(••${bank.last4})` : ""} ${bank.upiId ? `— UPI: ${bank.upiId}` : "(No UPI configured)"}`
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {bankAccounts.map((bank) => (
                      <SelectItem
                        key={bank.id}
                        value={bank.id}
                        className="font-mono text-xs"
                      >
                        {bank.nickname || bank.bankName}{" "}
                        {bank.last4 ? `(••${bank.last4})` : ""}{" "}
                        {bank.upiId
                          ? `— UPI: ${bank.upiId}`
                          : "(No UPI configured)"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null}

            <InputGroup className="h-8">
              <InputGroupInput
                id={upiInputId}
                placeholder="e.g. yourname@okhdfcbank"
                value={customUpiId}
                onChange={(e) => setCustomUpiId(e.target.value)}
                className="h-8 font-mono text-xs"
              />
              {customUpiId && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="xs"
                    onClick={handleCopyUpi}
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? (
                      <Check className="size-3 text-success" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
          </Field>

          {/* Sale Price, Your Name & Owner Phone */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Field className="gap-1">
                <FieldLabel
                  htmlFor={senderNameInputId}
                  className="text-xs font-semibold text-foreground"
                >
                  Your Name
                </FieldLabel>
                <Input
                  id={senderNameInputId}
                  placeholder="e.g. Heet"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </Field>
              <Field className="gap-1">
                <FieldLabel
                  htmlFor={salePriceInputId}
                  className="text-xs font-semibold text-foreground"
                >
                  Sale Price (₹)
                </FieldLabel>
                <Input
                  id={salePriceInputId}
                  type="number"
                  step="any"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </Field>
              <Field className="gap-1">
                <FieldLabel
                  htmlFor={phoneInputId}
                  className="text-xs font-semibold text-foreground"
                >
                  WhatsApp No.
                </FieldLabel>
                <Input
                  id={phoneInputId}
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </Field>
            </div>

            <Field className="gap-1">
              <FieldLabel htmlFor={noteInputId} className="sr-only">
                Add optional note
              </FieldLabel>
              <Input
                id={noteInputId}
                placeholder="Add optional note (e.g. please verify transaction ID)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-8 text-xs"
              />
            </Field>
          </div>
        </FieldGroup>
      </Card>

      {/* Live WhatsApp Message Preview */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Ready-to-Send WhatsApp Message
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleCopyMessage}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check
                  className="size-3 text-success"
                  data-icon="inline-start"
                />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-3" data-icon="inline-start" />
                Copy Text
              </>
            )}
          </Button>
        </div>

        <Card className="rounded-none border-border/80 bg-muted/40 p-0">
          <CardContent className="max-h-50 overflow-y-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground select-all">
            {message}
          </CardContent>
        </Card>
      </div>

      {/* Footer Actions */}
      <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="rounded-none text-xs"
        >
          Close
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMessage}
            className="rounded-none text-xs"
          >
            {copied ? (
              <>
                <Check
                  className="size-3.5 text-success"
                  data-icon="inline-start"
                />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="size-3.5" data-icon="inline-start" />
                Copy Message
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSendWhatsApp}
            className="rounded-none bg-success text-xs text-success-foreground hover:bg-success/90"
          >
            <MessageSquare className="size-3.5" data-icon="inline-start" />
            Open in WhatsApp
          </Button>
        </div>
      </DialogFooter>
    </div>
  )
}
