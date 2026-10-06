"use client"

import { useState, useMemo } from "react"
import {
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  Phone,
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
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import {
  formatMultiIpoWhatsAppSettlementMessage,
  getWhatsAppShareUrl,
  type MultiIpoSettlementItem,
} from "@/lib/utils/whatsapp-settlement"
import { updateSettlementsBatch } from "@/lib/firebase/applications"
import { formatCurrency } from "@/lib/utils/ipo"
import type { ApplicationAccount, BankAccount } from "@/types"

interface MultiIpoSettlementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: ApplicationAccount
  items: MultiIpoSettlementItem[]
  bankAccounts?: BankAccount[]
  userId: string
  defaultSenderName?: string
  onSettled?: () => void
}

export function MultiIpoSettlementDialog({
  open,
  onOpenChange,
  account,
  items,
  bankAccounts = [],
  userId,
  defaultSenderName = "",
  onSettled,
}: MultiIpoSettlementDialogProps) {
  // Option: Include all sold IPOs or only pending ones
  const [filterMode, setFilterMode] = useState<"pending" | "all">("pending")
  const [senderName, setSenderName] = useState(defaultSenderName || "Me")
  const [customNote, setCustomNote] = useState("")
  const [copied, setCopied] = useState(false)
  const [settling, setSettling] = useState(false)

  // Default UPI ID from bank accounts
  const defaultUpi = useMemo(() => {
    const withUpi = bankAccounts.find((b) => Boolean(b.upiId && !b.archived))
    return withUpi?.upiId || ""
  }, [bankAccounts])

  const [upiId, setUpiId] = useState(defaultUpi)

  // Filter items based on selection
  const filteredItems = useMemo(() => {
    if (filterMode === "pending") {
      const pending = items.filter((i) => i.settlementStatus !== "settled")
      return pending.length > 0 ? pending : items
    }
    return items
  }, [items, filterMode])

  // Generate WhatsApp message
  const whatsappMessage = useMemo(() => {
    return formatMultiIpoWhatsAppSettlementMessage({
      accountName: account.name,
      accountType: account.type,
      profitSharingPercentage: account.profitSharePercent || 0,
      items: filteredItems,
      upiId,
      senderName,
      customNote,
    })
  }, [account, filteredItems, upiId, senderName, customNote])

  const totalTransfer = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + item.amountToSendUser, 0)
  }, [filteredItems])

  const pendingAppIds = useMemo(() => {
    return filteredItems
      .filter((i) => i.settlementStatus !== "settled")
      .map((i) => i.applicationId)
  }, [filteredItems])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage)
      setCopied(true)
      toast.add({
        title: "Statement copied to clipboard",
        type: "success",
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.add({
        title: "Failed to copy message",
        type: "error",
      })
    }
  }

  const handleOpenWhatsApp = () => {
    const url = getWhatsAppShareUrl(whatsappMessage, account.phoneNumber || undefined)
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const handleSettleAndSend = async () => {
    if (pendingAppIds.length > 0) {
      setSettling(true)
      try {
        await updateSettlementsBatch(userId, pendingAppIds, "settled")
        toast.add({
          title: `Marked ${pendingAppIds.length} IPO(s) as settled`,
          type: "success",
        })
        onSettled?.()
      } catch (err) {
        console.error(err)
        toast.add({
          title: "Failed to update settlement status",
          type: "error",
        })
      } finally {
        setSettling(false)
      }
    }
    handleOpenWhatsApp()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-border/70 p-5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-none bg-primary text-primary-foreground">
              <MessageSquare className="size-3.5" />
            </div>
            <div>
              <DialogTitle className="font-heading text-base font-bold">
                WhatsApp Settlement Statement
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Consolidated statement for {account.name} across{" "}
                {filteredItems.length} IPO allotment{filteredItems.length > 1 ? "s" : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-5 max-h-[65vh] overflow-y-auto">
          {/* Partner & Transfer Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-border/80 bg-muted/20 p-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {account.name}
                </span>
                {account.profitSharePercent ? (
                  <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px]">
                    {account.profitSharePercent}% Share
                  </Badge>
                ) : null}
              </div>
              {account.phoneNumber && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="size-3" />
                  <span>{account.phoneNumber}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total to Transfer
              </span>
              <span className="font-mono text-base font-bold text-primary">
                {formatCurrency(totalTransfer)}
              </span>
            </div>
          </div>

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Include Allotments</Label>
              <div className="flex h-8 items-center rounded-none border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setFilterMode("pending")}
                  className={`flex-1 py-1 text-xs font-medium transition-all ${
                    filterMode === "pending"
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Pending Only ({items.filter((i) => i.settlementStatus !== "settled").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`flex-1 py-1 text-xs font-medium transition-all ${
                    filterMode === "all"
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All ({items.length})
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="senderName" className="text-xs">
                Your Name (Funder)
              </Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Heet"
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upiId" className="text-xs">
                Your UPI ID for Receiving Payment
              </Label>
              <Input
                id="upiId"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@oksbi"
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customNote" className="text-xs">
                Additional Note (Optional)
              </Label>
              <Input
                id="customNote"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Net after brokerage"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Message Preview
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-success" />
                    <span className="text-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-none border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed text-foreground select-all">
              {whatsappMessage}
            </pre>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 p-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              <Copy data-icon="inline-start" />
              Copy Statement
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenWhatsApp}
              className="text-xs"
            >
              <ExternalLink data-icon="inline-start" />
              Open in WhatsApp
            </Button>

            {pendingAppIds.length > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleSettleAndSend}
                disabled={settling}
                className="text-xs"
              >
                <CheckCircle2 data-icon="inline-start" />
                {settling ? "Settling..." : `Settle & Send (${pendingAppIds.length})`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
