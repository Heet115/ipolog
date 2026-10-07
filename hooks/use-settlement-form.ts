"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { updateApplicationSettlement } from "@/lib/firebase/applications"
import {
  calculateSettlement,
  formatWhatsAppSettlementMessage,
  getWhatsAppShareUrl,
} from "@/lib/utils/whatsapp-settlement"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface UseSettlementFormProps {
  application: Application
  ipo: Ipo
  account?: ApplicationAccount
  bankAccounts: BankAccount[]
  onSuccess?: () => void
}

export function useSettlementForm({
  application,
  ipo,
  account,
  bankAccounts,
  onSuccess,
}: UseSettlementFormProps) {
  const { user } = useAuth()
  const defaultSender =
    user?.displayName?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Me"

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
  const handleBankChange = useCallback(
    (bankId: string) => {
      setSelectedBankId(bankId)
      const selected = bankAccounts.find((b) => b.id === bankId)
      if (selected?.upiId) {
        setCustomUpiId(selected.upiId)
      }
    },
    [bankAccounts]
  )

  const selectedBank = useMemo(
    () => bankAccounts.find((b) => b.id === selectedBankId),
    [bankAccounts, selectedBankId]
  )

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

  const handleCopyMessage = useCallback(async () => {
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
  }, [message])

  const handleCopyUpi = useCallback(async () => {
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
  }, [calculation.upiId])

  const handleSendWhatsApp = useCallback(() => {
    const url = getWhatsAppShareUrl(message, phone)
    window.open(url, "_blank", "noopener,noreferrer")
  }, [message, phone])

  const handleToggleSettlement = useCallback(async () => {
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
  }, [user, settlementStatus, application.id, calculation.amountToSendUser, onSuccess])

  return {
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
  }
}
