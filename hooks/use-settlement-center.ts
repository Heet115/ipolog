"use client"

import { useState, useMemo } from "react"
import { toast } from "@/components/ui/toast"
import {
  updateApplicationSettlement,
  updateSettlementsBatch,
} from "@/lib/firebase/applications"
import {
  calculateReceivablesSummary,
  type AccountReceivableItem,
} from "@/lib/calculations/financials"
import type { Ipo, Application, ApplicationAccount } from "@/types"

export type SettlementFilterTab = "all" | "pending" | "settled"

interface UseSettlementCenterProps {
  applications: Application[]
  ipos: Ipo[]
  accounts: ApplicationAccount[]
  userId: string
  onRefresh: () => void
}

export function useSettlementCenter({
  applications,
  ipos,
  accounts,
  userId,
  onRefresh,
}: UseSettlementCenterProps) {
  const [statusTab, setStatusTab] = useState<SettlementFilterTab>("all")
  const [search, setSearch] = useState("")
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<
    Record<string, boolean>
  >({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Map Lookups
  const ipoMap = useMemo(() => {
    const map = new Map<string, Ipo>()
    for (const ipo of ipos) map.set(ipo.id, ipo)
    return map
  }, [ipos])

  const accountMap = useMemo(() => {
    const map = new Map<string, ApplicationAccount>()
    for (const acc of accounts) map.set(acc.id, acc)
    return map
  }, [accounts])

  // Receivables summary
  const summary = useMemo(() => {
    return calculateReceivablesSummary(applications, ipoMap, accountMap)
  }, [applications, ipoMap, accountMap])

  // Total Partner Profit Distributed
  const totalPartnerProfit = useMemo(() => {
    let sum = 0
    for (const item of summary.items) {
      sum += item.ownerProfitShare || 0
    }
    return sum
  }, [summary.items])

  // Convert byAccount Map into sorted array
  const partnerAccountsList = useMemo(() => {
    const list = Array.from(summary.byAccount.values())
    list.sort((a, b) => {
      // Pending first, then by pending amount descending
      if (a.unsettledCount > 0 && b.unsettledCount === 0) return -1
      if (a.unsettledCount === 0 && b.unsettledCount > 0) return 1
      return b.pendingAmount - a.pendingAmount
    })
    return list
  }, [summary.byAccount])

  // Filter partners based on tab and search
  const filteredPartners = useMemo(() => {
    return partnerAccountsList.filter((entry) => {
      // Tab filter
      if (statusTab === "pending" && entry.unsettledCount === 0) return false
      if (statusTab === "settled" && entry.unsettledCount > 0) return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = entry.account.name.toLowerCase().includes(q)
        const matchPhone = entry.account.phoneNumber?.toLowerCase().includes(q)
        const matchPan = entry.account.pan?.toLowerCase().includes(q)
        const matchIpo = entry.applications.some((app) =>
          app.ipoName.toLowerCase().includes(q)
        )
        if (!matchName && !matchPhone && !matchPan && !matchIpo) return false
      }

      return true
    })
  }, [partnerAccountsList, statusTab, search])

  // Toggle account expansion
  const toggleExpand = (accountId: string) => {
    setExpandedAccounts((prev) => ({
      ...prev,
      [accountId]: !prev[accountId],
    }))
  }

  // Handle single settlement toggle
  const handleToggleSingleSettlement = async (item: AccountReceivableItem) => {
    const nextStatus =
      item.settlementStatus === "settled" ? "pending" : "settled"
    setUpdatingId(item.applicationId)
    try {
      await updateApplicationSettlement(userId, item.applicationId, nextStatus)
      toast.add({
        title:
          nextStatus === "settled"
            ? "Marked as settled"
            : "Reverted to pending",
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update settlement status",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle batch settle for all pending applications of an account
  const handleSettleAllForAccount = async (
    accountId: string,
    applicationItems: AccountReceivableItem[]
  ) => {
    const pendingIds = applicationItems
      .filter((i) => i.settlementStatus !== "settled")
      .map((i) => i.applicationId)

    if (pendingIds.length === 0) return

    setUpdatingId(`all-${accountId}`)
    try {
      await updateSettlementsBatch(userId, pendingIds, "settled")
      toast.add({
        title: `Settled ${pendingIds.length} application(s)`,
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to batch settle applications",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle batch revert for all settled applications of an account
  const handleRevertAllForAccount = async (
    accountId: string,
    applicationItems: AccountReceivableItem[]
  ) => {
    const settledIds = applicationItems
      .filter((i) => i.settlementStatus === "settled")
      .map((i) => i.applicationId)

    if (settledIds.length === 0) return

    setUpdatingId(`all-${accountId}`)
    try {
      await updateSettlementsBatch(userId, settledIds, "pending")
      toast.add({
        title: `Reverted ${settledIds.length} application(s) to pending`,
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to revert applications",
        type: "error",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Open WhatsApp dialog for a partner
  const handleOpenDialog = (accountId: string) => {
    setSelectedPartnerId(accountId)
    setDialogOpen(true)
  }

  const selectedPartnerEntry = useMemo(() => {
    if (!selectedPartnerId) return null
    return summary.byAccount.get(selectedPartnerId) || null
  }, [summary.byAccount, selectedPartnerId])

  // Multi-IPO items formatted for dialog
  const dialogItems = useMemo(() => {
    if (!selectedPartnerEntry) return []
    return selectedPartnerEntry.applications.map((item) => ({
      applicationId: item.applicationId,
      ipoName: item.ipoName,
      allottedShares: item.allottedShares || 0,
      allottedLots: item.allottedLots || 1,
      issuePrice: item.issuePrice || 0,
      investedAmount: item.investedAmount,
      salePrice: item.salePrice || 0,
      saleProceeds: item.saleProceeds,
      grossProfit: item.grossProfit,
      ownerProfitShare: item.ownerProfitShare,
      yourProfitShare: item.yourProfitShare,
      amountToSendUser: item.amountToSendUser,
      settlementStatus: item.settlementStatus,
    }))
  }, [selectedPartnerEntry])

  const pendingPartnersCount = partnerAccountsList.filter(
    (p) => p.unsettledCount > 0
  ).length
  const settledPartnersCount = partnerAccountsList.filter(
    (p) => p.unsettledCount === 0 && p.settledCount > 0
  ).length

  return {
    statusTab,
    setStatusTab,
    search,
    setSearch,
    dialogOpen,
    setDialogOpen,
    expandedAccounts,
    updatingId,
    summary,
    totalPartnerProfit,
    partnerAccountsList,
    filteredPartners,
    pendingPartnersCount,
    settledPartnersCount,
    toggleExpand,
    handleToggleSingleSettlement,
    handleSettleAllForAccount,
    handleRevertAllForAccount,
    handleOpenDialog,
    selectedPartnerEntry,
    dialogItems,
  }
}
