"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "@/components/ui/toast"
import {
  deleteApplication,
  deleteApplicationsBatch,
  updateApplicationsBankBatch,
  updateApplicationsStatusBatch,
} from "@/lib/firebase/applications"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { getBankDisplayName } from "@/lib/utils/bank-helpers"
import { inferCategoryFromAmount } from "@/lib/calculations/categories"
import type { DataTableFilterPill } from "@/components/ui/data-table"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

interface UseMasterLedgerProps {
  ipos: Ipo[]
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  userId: string
  onRefresh: () => void
}

export function useMasterLedger({
  ipos,
  applications,
  accounts,
  bankAccounts,
  userId,
  onRefresh,
}: UseMasterLedgerProps) {
  // Filters state
  const [selectedIpoId, setSelectedIpoId] = useState<string>("all")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [selectedBankId, setSelectedBankId] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [targetBankId, setTargetBankId] = useState<string>("")
  const [updatingBank, setUpdatingBank] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Single row action dialog states
  const [appToDelete, setAppToDelete] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [appToEdit, setAppToEdit] = useState<Application | null>(null)
  const [appToSell, setAppToSell] = useState<Application | null>(null)
  const [appToSettle, setAppToSettle] = useState<Application | null>(null)

  // Maps for fast lookups
  const ipoMap = useMemo(() => new Map(ipos.map((i) => [i.id, i])), [ipos])
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const bankMap = useMemo(
    () => new Map(bankAccounts.map((b) => [b.id, b])),
    [bankAccounts]
  )
  const activeBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !b.archived),
    [bankAccounts]
  )

  // Calculate counts for filters
  const ipoApplicationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const app of applications) {
      counts.set(app.ipoId, (counts.get(app.ipoId) || 0) + 1)
    }
    return counts
  }, [applications])

  // Real-time status counts across current filters (excluding status)
  const statusCounts = useMemo(() => {
    let baseApps = applications
    if (selectedIpoId !== "all") {
      baseApps = baseApps.filter((a) => a.ipoId === selectedIpoId)
    }
    if (selectedAccountId !== "all") {
      baseApps = baseApps.filter((a) => a.accountId === selectedAccountId)
    }
    if (selectedBankId !== "all") {
      baseApps = baseApps.filter((a) => a.bankAccountId === selectedBankId)
    }
    if (selectedCategory !== "all") {
      baseApps = baseApps.filter((a) => {
        const cat = a.category || inferCategoryFromAmount(a.amountApplied)
        return cat === selectedCategory
      })
    }

    const counts = {
      all: baseApps.length,
      pending: 0,
      allotted: 0,
      not_allotted: 0,
      sold: 0,
    }

    for (const app of baseApps) {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++
      }
    }
    return counts
  }, [
    applications,
    selectedIpoId,
    selectedAccountId,
    selectedBankId,
    selectedCategory,
  ])

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // IPO filter
      if (selectedIpoId !== "all" && app.ipoId !== selectedIpoId) return false

      // Account filter
      if (selectedAccountId !== "all" && app.accountId !== selectedAccountId)
        return false

      // Bank filter
      if (selectedBankId !== "all" && app.bankAccountId !== selectedBankId)
        return false

      // Category filter
      if (selectedCategory !== "all") {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        if (cat !== selectedCategory) return false
      }

      // Status filter
      if (statusFilter !== "all" && app.status !== statusFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)
        const bank = bankMap.get(app.bankAccountId)

        const matchIpo = ipo?.name.toLowerCase().includes(query)
        const matchAccount = account?.name.toLowerCase().includes(query)
        const matchBank =
          bank?.bankName.toLowerCase().includes(query) ||
          bank?.nickname?.toLowerCase().includes(query) ||
          bank?.last4?.includes(query)
        const matchPan = account?.pan?.toLowerCase().includes(query)
        const matchNotes = app.notes?.toLowerCase().includes(query)

        if (
          !matchIpo &&
          !matchAccount &&
          !matchBank &&
          !matchPan &&
          !matchNotes
        ) {
          return false
        }
      }

      return true
    })
  }, [
    applications,
    selectedIpoId,
    selectedAccountId,
    selectedBankId,
    selectedCategory,
    statusFilter,
    searchQuery,
    ipoMap,
    accountMap,
    bankMap,
  ])

  // Portfolio-wide summary metrics calculated across current filtered view
  const metrics = useMemo(() => {
    let totalLots = 0
    let totalAmount = 0
    let allottedCount = 0
    let decidedCount = 0
    let realizedGrossProfit = 0
    let realizedYourProfit = 0
    let pendingCount = 0

    for (const app of filteredApplications) {
      totalLots += app.lotsApplied || 0
      totalAmount += app.amountApplied || 0

      if (app.status === "pending") {
        pendingCount++
      } else if (app.status === "allotted" || app.status === "sold") {
        allottedCount++
        decidedCount++
      } else if (app.status === "not_allotted") {
        decidedCount++
      }

      const ipo = ipoMap.get(app.ipoId)
      const account = accountMap.get(app.accountId)
      if (ipo && account) {
        const p = calculateApplicationProfit(app, ipo, account)
        if (p.hasRealized) {
          realizedGrossProfit += p.realizedGrossProfit
          realizedYourProfit += p.realizedYourProfit
        }
      }
    }

    const winRate = decidedCount > 0 ? (allottedCount / decidedCount) * 100 : 0

    return {
      totalApplications: filteredApplications.length,
      totalLots,
      totalAmount,
      allottedCount,
      decidedCount,
      winRate,
      realizedGrossProfit,
      realizedYourProfit,
      pendingCount,
    }
  }, [filteredApplications, ipoMap, accountMap])

  // Selected applications calculation for bulk action bar
  const selectedApps = useMemo(
    () => applications.filter((a) => selectedIds.includes(a.id)),
    [applications, selectedIds]
  )
  const selectedLots = useMemo(
    () => selectedApps.reduce((sum, a) => sum + (a.lotsApplied || 0), 0),
    [selectedApps]
  )
  const selectedAmount = useMemo(
    () => selectedApps.reduce((sum, a) => sum + (a.amountApplied || 0), 0),
    [selectedApps]
  )

  const isAnyFilterActive =
    selectedIpoId !== "all" ||
    selectedAccountId !== "all" ||
    selectedBankId !== "all" ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    Boolean(searchQuery.trim())

  const handleResetFilters = useCallback(() => {
    setSelectedIpoId("all")
    setSelectedAccountId("all")
    setSelectedBankId("all")
    setSelectedCategory("all")
    setStatusFilter("all")
    setSearchQuery("")
  }, [])

  // Bulk actions handlers
  const handleBulkStatusChange = useCallback(
    async (status: ApplicationStatus) => {
      if (selectedIds.length === 0) return
      setUpdatingStatus(true)
      try {
        const updates = selectedApps.map((app) => ({
          applicationId: app.id,
          status,
          allottedLots: status === "allotted" ? app.lotsApplied : undefined,
          allottedShares: status === "allotted" ? app.sharesApplied : undefined,
        }))
        await updateApplicationsStatusBatch(userId, updates)
        toast.add({
          title: "Status updated",
          description: `Successfully updated ${selectedIds.length} application${
            selectedIds.length === 1 ? "" : "s"
          } to ${status.replace("_", " ").toUpperCase()}.`,
          type: "success",
        })
        setSelectedIds([])
        onRefresh()
      } catch (err) {
        console.error("Bulk status update failed:", err)
        toast.add({
          title: "Update failed",
          description: "Failed to update application statuses. Please try again.",
          type: "error",
        })
      } finally {
        setUpdatingStatus(false)
      }
    },
    [selectedIds, selectedApps, userId, onRefresh]
  )

  const handleBulkChangeBank = useCallback(async () => {
    if (selectedIds.length === 0 || !targetBankId) return
    setUpdatingBank(true)
    try {
      await updateApplicationsBankBatch(userId, selectedIds, targetBankId)
      const targetBank = bankMap.get(targetBankId)
      toast.add({
        title: "Bank accounts updated",
        description: `Successfully switched ${selectedIds.length} application${
          selectedIds.length === 1 ? "" : "s"
        } to ${targetBank ? getBankDisplayName(targetBank) : "selected bank"}.`,
        type: "success",
      })
      setBankDialogOpen(false)
      setSelectedIds([])
      onRefresh()
    } catch (err) {
      console.error("Bulk change bank failed:", err)
      toast.add({
        title: "Update failed",
        description: "Failed to update bank accounts. Please try again.",
        type: "error",
      })
    } finally {
      setUpdatingBank(false)
    }
  }, [selectedIds, targetBankId, userId, bankMap, onRefresh])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await deleteApplicationsBatch(userId, selectedIds)
      toast.add({
        title: "Applications removed",
        description: `Permanently removed ${selectedIds.length} application record${
          selectedIds.length === 1 ? "" : "s"
        }.`,
        type: "success",
      })
      setBulkDeleteOpen(false)
      setSelectedIds([])
      onRefresh()
    } catch (err) {
      console.error("Bulk delete failed:", err)
      toast.add({
        title: "Delete failed",
        description: "Failed to delete applications. Please try again.",
        type: "error",
      })
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, userId, onRefresh])

  // Single application delete
  const handleDeleteSingle = useCallback(async () => {
    if (!appToDelete) return
    setDeleting(true)
    try {
      await deleteApplication(userId, appToDelete.id)
      toast.add({
        title: "Application removed",
        description: "Application record was deleted successfully.",
        type: "success",
      })
      setAppToDelete(null)
      setSelectedIds((prev) => prev.filter((id) => id !== appToDelete.id))
      onRefresh()
    } catch (err) {
      console.error("Delete failed:", err)
      toast.add({
        title: "Delete failed",
        description: "Failed to delete application. Please try again.",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }, [appToDelete, userId, onRefresh])

  // Status Filter Pills
  const filterPills: DataTableFilterPill[] = useMemo(
    () => [
      {
        id: "all",
        label: "All",
        count: statusCounts.all,
        active: statusFilter === "all",
        onToggle: () => setStatusFilter("all"),
      },
      {
        id: "pending",
        label: "Pending",
        count: statusCounts.pending,
        active: statusFilter === "pending",
        onToggle: () =>
          setStatusFilter((prev) => (prev === "pending" ? "all" : "pending")),
      },
      {
        id: "allotted",
        label: "Allotted",
        count: statusCounts.allotted,
        active: statusFilter === "allotted",
        onToggle: () =>
          setStatusFilter((prev) => (prev === "allotted" ? "all" : "allotted")),
      },
      {
        id: "not_allotted",
        label: "Not Allotted",
        count: statusCounts.not_allotted,
        active: statusFilter === "not_allotted",
        onToggle: () =>
          setStatusFilter((prev) =>
            prev === "not_allotted" ? "all" : "not_allotted"
          ),
      },
      {
        id: "sold",
        label: "Sold",
        count: statusCounts.sold,
        active: statusFilter === "sold",
        onToggle: () =>
          setStatusFilter((prev) => (prev === "sold" ? "all" : "sold")),
      },
    ],
    [statusCounts, statusFilter]
  )

  return {
    selectedIpoId,
    setSelectedIpoId,
    selectedAccountId,
    setSelectedAccountId,
    selectedBankId,
    setSelectedBankId,
    selectedCategory,
    setSelectedCategory,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedIds,
    setSelectedIds,
    bulkDeleting,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bankDialogOpen,
    setBankDialogOpen,
    targetBankId,
    setTargetBankId,
    updatingBank,
    updatingStatus,
    appToDelete,
    setAppToDelete,
    deleting,
    appToEdit,
    setAppToEdit,
    appToSell,
    setAppToSell,
    appToSettle,
    setAppToSettle,
    ipoMap,
    accountMap,
    bankMap,
    activeBankAccounts,
    ipoApplicationCounts,
    statusCounts,
    filteredApplications,
    metrics,
    selectedApps,
    selectedLots,
    selectedAmount,
    isAnyFilterActive,
    handleResetFilters,
    handleBulkStatusChange,
    handleBulkChangeBank,
    handleBulkDelete,
    handleDeleteSingle,
    filterPills,
  }
}
