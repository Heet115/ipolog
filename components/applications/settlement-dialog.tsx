"use client"

import { useId } from "react"
import { MessageSquare, Copy, Check, Landmark } from "lucide-react"
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
import { useSettlementForm } from "@/hooks/use-settlement-form"
import { SettlementFinancialCards } from "@/components/applications/settlement-financial-cards"
import { SettlementStatusBanner } from "@/components/applications/settlement-status-banner"
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
                Generate settlement breakdown and UPI share message for{" "}
                {ipo.name}
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
  const senderNameInputId = useId()
  const phoneInputId = useId()
  const upiInputId = useId()
  const salePriceInputId = useId()
  const noteInputId = useId()

  const {
    selectedBankId,
    customUpiId,
    setCustomUpiId,
    senderName,
    setSenderName,
    salePrice,
    setSalePrice,
    phone,
    setPhone,
    note,
    setNote,
    copied,
    copiedUpi,
    settlementStatus,
    updatingSettlement,
    handleBankChange,
    calculation,
    message,
    handleCopyMessage,
    handleCopyUpi,
    handleSendWhatsApp,
    handleToggleSettlement,
  } = useSettlementForm({
    application,
    ipo,
    account,
    bankAccounts,
    onSuccess,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Financial Breakdown Highlights */}
      <SettlementFinancialCards calculation={calculation} />

      {/* Settlement Payment Status Banner */}
      <SettlementStatusBanner
        settlementStatus={settlementStatus}
        amountToSendUser={calculation.amountToSendUser}
        settledAt={application.settledAt}
        accountName={account?.name}
        updatingSettlement={updatingSettlement}
        onToggleSettlement={handleToggleSettlement}
      />

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
