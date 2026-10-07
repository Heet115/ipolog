"use client"

import { useState, useMemo, useCallback } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "@/components/ui/toast"
import {
  archiveBankAccount,
  deleteBankAccount,
} from "@/lib/firebase/bank-accounts"
import {
  calculateBankMoneySummary,
  checkBankAsbaLimits,
  type BankMoneySummary,
} from "@/lib/calculations/financials"
import type { BankAccount, Application, Ipo, BankSortOption } from "@/types"

interface UseBankAccountListProps {
  bankAccounts: BankAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onRefresh: () => void
}

export function useBankAccountList({
  bankAccounts,
  applications,
  ipos,
  userId,
  onRefresh,
}: UseBankAccountListProps) {
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "table">(
    "ipolog:bank-view-mode",
    "grid"
  )
  const [sortBy, setSortBy] = useLocalStorage<BankSortOption>(
    "ipolog:bank-grid-sort",
    "name_asc"
  )
  const [bankToDelete, setBankToDelete] = useState<BankAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const ipoMap = useMemo(() => new Map(ipos.map((i) => [i.id, i])), [ipos])

  // Filter bank accounts
  const filteredAccounts = useMemo(() => {
    return bankAccounts.filter((bank) => {
      if (!showArchived && bank.archived) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          bank.bankName.toLowerCase().includes(q) ||
          (bank.nickname && bank.nickname.toLowerCase().includes(q)) ||
          (bank.last4 && bank.last4.includes(q)) ||
          (bank.notes && bank.notes.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [bankAccounts, showArchived, search])

  const archivedCount = useMemo(
    () => bankAccounts.filter((bank) => bank.archived).length,
    [bankAccounts]
  )

  const handleToggleArchive = useCallback(
    async (bank: BankAccount) => {
      try {
        await archiveBankAccount(userId, bank.id, !bank.archived)
        toast.add({
          title: bank.archived
            ? "Bank account restored"
            : "Bank account archived",
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({
          title: "Failed to update bank account archive state",
          type: "error",
        })
      }
    },
    [userId, onRefresh]
  )

  const handleDelete = useCallback(async () => {
    if (!bankToDelete) return
    setDeleting(true)
    try {
      await deleteBankAccount(userId, bankToDelete.id)
      toast.add({
        title: "Bank account deleted",
        type: "success",
      })
      setBankToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete bank account",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }, [bankToDelete, userId, onRefresh])

  // Precalculate summaries
  const bankSummaryMap = useMemo(() => {
    const map = new Map<string, BankMoneySummary>()
    for (const b of filteredAccounts) {
      map.set(b.id, calculateBankMoneySummary(b.id, applications, ipoMap))
    }
    return map
  }, [filteredAccounts, applications, ipoMap])

  // Sort accounts based on chosen sort option
  const sortedAccounts = useMemo(() => {
    const list = [...filteredAccounts]
    switch (sortBy) {
      case "name_asc":
        return list.sort((a, b) =>
          (a.nickname || a.bankName).localeCompare(b.nickname || b.bankName)
        )
      case "name_desc":
        return list.sort((a, b) =>
          (b.nickname || b.bankName).localeCompare(a.nickname || a.bankName)
        )
      case "limit_desc":
        return list.sort((a, b) => (b.asbaLimit || 0) - (a.asbaLimit || 0))
      case "limit_asc":
        return list.sort((a, b) => (a.asbaLimit || 0) - (b.asbaLimit || 0))
      case "blocked_desc":
        return list.sort((a, b) => {
          const blockedA = bankSummaryMap.get(a.id)?.blockedAmount || 0
          const blockedB = bankSummaryMap.get(b.id)?.blockedAmount || 0
          return blockedB - blockedA
        })
      case "created_desc":
        return list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        )
      case "created_asc":
        return list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
        )
      default:
        return list
    }
  }, [filteredAccounts, sortBy, bankSummaryMap])

  const asbaWarnings = useMemo(
    () => checkBankAsbaLimits(bankAccounts, applications, ipoMap),
    [bankAccounts, applications, ipoMap]
  )
  const exceededWarnings = useMemo(
    () => asbaWarnings.filter((w) => w.isExceeded),
    [asbaWarnings]
  )

  return {
    search,
    setSearch,
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    bankToDelete,
    setBankToDelete,
    deleting,
    sortedAccounts,
    archivedCount,
    handleToggleArchive,
    handleDelete,
    bankSummaryMap,
    asbaWarnings,
    exceededWarnings,
  }
}
