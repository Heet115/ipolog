"use client"

import { useState, useCallback, useMemo } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "@/components/ui/toast"
import {
  archiveApplicationAccount,
  deleteApplicationAccount,
  updateAccountSortOrder,
  sortAccounts,
} from "@/lib/firebase/accounts"
import { updateSettlementsBatch } from "@/lib/firebase/applications"
import {
  calculateAccountMoneySummary,
  type AccountMoneySummary,
} from "@/lib/calculations/financials"
import type { ApplicationAccount, Application, Ipo, AccountSortOption } from "@/types"

interface UseAccountListProps {
  accounts: ApplicationAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onRefresh: () => void
}

export function useAccountList({
  accounts,
  applications,
  ipos,
  userId,
  onRefresh,
}: UseAccountListProps) {
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "table">(
    "ipolog:account-view-mode",
    "grid"
  )
  const [sortBy, setSortBy] = useLocalStorage<AccountSortOption>(
    "ipolog:account-grid-sort",
    "custom"
  )
  const [accountToDelete, setAccountToDelete] =
    useState<ApplicationAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderedAccounts, setReorderedAccounts] = useState<
    ApplicationAccount[]
  >([])
  const [originalOrderIds, setOriginalOrderIds] = useState<string[]>([])
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const ipoMap = useMemo(() => new Map(ipos.map((i) => [i.id, i])), [ipos])

  // Sort accounts based on chosen sort option (or custom order)
  const sortedAccounts = useMemo(() => {
    const list = [...accounts]
    switch (sortBy) {
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case "name_desc":
        return list.sort((a, b) => b.name.localeCompare(a.name))
      case "type_my":
        return list.sort((a, b) => {
          if (a.type !== b.type) return a.type === "my" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      case "type_other":
        return list.sort((a, b) => {
          if (a.type !== b.type) return a.type === "other" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      case "profit_desc":
        return list.sort(
          (a, b) => (b.profitSharePercent || 0) - (a.profitSharePercent || 0)
        )
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
      case "custom":
      default:
        return sortAccounts(list)
    }
  }, [accounts, sortBy])

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return sortedAccounts.filter((acc) => {
      if (!showArchived && acc.archived) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          acc.name.toLowerCase().includes(q) ||
          (acc.notes && acc.notes.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [sortedAccounts, showArchived, search])

  const myAccounts = useMemo(
    () => filteredAccounts.filter((acc) => acc.type === "my"),
    [filteredAccounts]
  )
  const otherAccounts = useMemo(
    () => filteredAccounts.filter((acc) => acc.type === "other"),
    [filteredAccounts]
  )
  const archivedCount = useMemo(
    () => accounts.filter((acc) => acc.archived).length,
    [accounts]
  )

  // Check if current reordered array differs from original snapshot
  const isDirty = useMemo(() => {
    if (reorderedAccounts.length !== originalOrderIds.length) return false
    return reorderedAccounts.some(
      (acc, idx) => acc.id !== originalOrderIds[idx]
    )
  }, [reorderedAccounts, originalOrderIds])

  // Enter reorder mode — snapshot active (non-archived) accounts in current order
  const enterReorderMode = useCallback(() => {
    setSortBy("custom")
    const activeInOrder = sortAccounts(accounts.filter((a) => !a.archived))
    setReorderedAccounts(activeInOrder)
    setOriginalOrderIds(activeInOrder.map((a) => a.id))
    setReorderMode(true)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [accounts, setSortBy])

  const cancelReorderMode = useCallback(() => {
    setReorderMode(false)
    setReorderedAccounts([])
    setOriginalOrderIds([])
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const moveAccount = useCallback((index: number, direction: "up" | "down") => {
    setReorderedAccounts((prev) => {
      const next = [...prev]
      const targetIdx = direction === "up" ? index - 1 : index + 1
      if (targetIdx < 0 || targetIdx >= next.length) return prev
      ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
      return next
    })
  }, [])

  const moveToExtreme = useCallback(
    (index: number, position: "top" | "bottom") => {
      setReorderedAccounts((prev) => {
        if (position === "top" && index === 0) return prev
        if (position === "bottom" && index === prev.length - 1) return prev
        const item = prev[index]
        const next = prev.filter((_, i) => i !== index)
        return position === "top" ? [item, ...next] : [...next, item]
      })
    },
    []
  )

  const moveAccountToIndex = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      setReorderedAccounts((prev) => {
        const next = [...prev]
        const [movedItem] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, movedItem)
        return next
      })
    },
    []
  )

  // Presets
  const applyPresetAZ = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [])

  const applyPresetZA = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => b.name.localeCompare(a.name))
    )
  }, [])

  const applyPresetMyFirst = useCallback(() => {
    setReorderedAccounts((prev) => {
      const my = prev.filter((a) => a.type === "my")
      const other = prev.filter((a) => a.type === "other")
      return [...my, ...other]
    })
  }, [])

  const applyPresetCreationOrder = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => {
        const at = a.createdAt?.toMillis?.() ?? 0
        const bt = b.createdAt?.toMillis?.() ?? 0
        return at - bt
      })
    )
  }, [])

  const saveOrder = useCallback(async () => {
    setSavingOrder(true)
    try {
      const orderedIds = reorderedAccounts.map((a) => a.id)
      await updateAccountSortOrder(userId, orderedIds)
      toast.add({
        title: "Account order saved",
        description: "Your custom order will be used everywhere.",
        type: "success",
      })
      setReorderMode(false)
      setReorderedAccounts([])
      setOriginalOrderIds([])
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to save order",
        type: "error",
      })
    } finally {
      setSavingOrder(false)
    }
  }, [reorderedAccounts, userId, onRefresh])

  const resetToDefault = useCallback(async () => {
    setSavingOrder(true)
    try {
      // Reset all accounts to alphabetical by name
      const alphabetical = [...accounts]
        .filter((a) => !a.archived)
        .sort((a, b) => a.name.localeCompare(b.name))
      const orderedIds = alphabetical.map((a) => a.id)
      await updateAccountSortOrder(userId, orderedIds)
      toast.add({
        title: "Order reset to alphabetical",
        type: "success",
      })
      setReorderMode(false)
      setReorderedAccounts([])
      setOriginalOrderIds([])
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to reset order",
        type: "error",
      })
    } finally {
      setSavingOrder(false)
    }
  }, [accounts, userId, onRefresh])

  // Instant 1-click move from card/table dropdown
  const handleQuickMove = useCallback(
    async (account: ApplicationAccount, target: "top" | "bottom") => {
      const active = sortAccounts(accounts.filter((a) => !a.archived))
      const index = active.findIndex((a) => a.id === account.id)
      if (index === -1) return
      if (target === "top" && index === 0) {
        toast.add({
          title: `${account.name} is already at the top`,
          type: "info",
        })
        return
      }
      if (target === "bottom" && index === active.length - 1) {
        toast.add({
          title: `${account.name} is already at the bottom`,
          type: "info",
        })
        return
      }
      const item = active[index]
      const rest = active.filter((_, i) => i !== index)
      const reordered = target === "top" ? [item, ...rest] : [...rest, item]
      const orderedIds = reordered.map((a) => a.id)

      try {
        await updateAccountSortOrder(userId, orderedIds)
        toast.add({
          title: `Moved ${account.name} to ${target}`,
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({ title: "Failed to update account order", type: "error" })
      }
    },
    [accounts, userId, onRefresh]
  )

  const handleToggleArchive = useCallback(
    async (account: ApplicationAccount) => {
      try {
        await archiveApplicationAccount(userId, account.id, !account.archived)
        toast.add({
          title: account.archived ? "Account restored" : "Account archived",
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({
          title: "Failed to update account",
          type: "error",
        })
      }
    },
    [userId, onRefresh]
  )

  const handleDelete = useCallback(async () => {
    if (!accountToDelete) return
    setDeleting(true)
    try {
      await deleteApplicationAccount(userId, accountToDelete.id)
      toast.add({
        title: "Account deleted",
        type: "success",
      })
      setAccountToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete account",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }, [accountToDelete, userId, onRefresh])

  const handleSettleAll = useCallback(
    async (account: ApplicationAccount) => {
      const unsettledApps = applications.filter(
        (a) =>
          a.accountId === account.id &&
          a.status === "sold" &&
          a.settlementStatus !== "settled"
      )
      if (unsettledApps.length === 0) return

      try {
        await updateSettlementsBatch(
          userId,
          unsettledApps.map((a) => a.id),
          "settled"
        )
        toast.add({
          title: `Settled ${unsettledApps.length} application(s) for ${account.name}`,
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({
          title: "Failed to update settlement status",
          type: "error",
        })
      }
    },
    [applications, userId, onRefresh]
  )

  // Precalculate summaries for fast rendering in table/grid
  const accountSummaryMap = useMemo(() => {
    const map = new Map<string, AccountMoneySummary>()
    for (const acc of filteredAccounts) {
      map.set(
        acc.id,
        calculateAccountMoneySummary(acc.id, applications, ipoMap, acc)
      )
    }
    return map
  }, [filteredAccounts, applications, ipoMap])

  return {
    search,
    setSearch,
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    accountToDelete,
    setAccountToDelete,
    deleting,
    reorderMode,
    reorderedAccounts,
    savingOrder,
    draggedIndex,
    setDraggedIndex,
    dragOverIndex,
    setDragOverIndex,
    filteredAccounts,
    myAccounts,
    otherAccounts,
    archivedCount,
    isDirty,
    enterReorderMode,
    cancelReorderMode,
    moveAccount,
    moveToExtreme,
    moveAccountToIndex,
    applyPresetAZ,
    applyPresetZA,
    applyPresetMyFirst,
    applyPresetCreationOrder,
    saveOrder,
    resetToDefault,
    handleQuickMove,
    handleToggleArchive,
    handleDelete,
    handleSettleAll,
    accountSummaryMap,
  }
}
