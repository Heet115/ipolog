"use client"

import { useState, useCallback, useMemo } from "react"
import { toast } from "@/components/ui/toast"
import {
  deleteApplication,
  deleteApplicationsBatch,
  updateApplicationSettlement,
  updateApplicationsBankBatch,
  updateApplicationsStatusBatch,
} from "@/lib/firebase/applications"
import type { DataTableFilterPill } from "@/components/ui/data-table"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

interface UseApplicationTableProps {
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  ipo: Ipo
  userId: string
  onRefresh: () => void
}

export function useApplicationTable({
  applications,
  accounts,
  bankAccounts,
  userId,
  onRefresh,
}: UseApplicationTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [appToDelete, setAppToDelete] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [targetBankId, setTargetBankId] = useState<string>("")
  const [updatingBank, setUpdatingBank] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Map for fast lookups
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

  // Filter selected applications
  const selectedApps = useMemo(
    () => applications.filter((a) => selectedIds.includes(a.id)),
    [applications, selectedIds]
  )
  const selectedLots = useMemo(
    () => selectedApps.reduce((acc, a) => acc + a.lotsApplied, 0),
    [selectedApps]
  )
  const selectedAmount = useMemo(
    () => selectedApps.reduce((acc, a) => acc + a.amountApplied, 0),
    [selectedApps]
  )

  const handleBulkStatus = useCallback(
    async (status: ApplicationStatus) => {
      if (selectedApps.length === 0) return
      setUpdatingStatus(true)
      try {
        const updates = selectedApps.map((app) => ({
          applicationId: app.id,
          status,
          allottedLots: status === "allotted" ? app.lotsApplied : 0,
          allottedShares: status === "allotted" ? app.sharesApplied : 0,
        }))
        await updateApplicationsStatusBatch(userId, updates)
        toast.add({
          title: `Updated ${selectedApps.length} application(s)`,
          description: `Status marked as ${
            status === "allotted"
              ? "Allotted"
              : status === "not_allotted"
                ? "Not Allotted"
                : "Pending"
          }.`,
          type: "success",
        })
        setSelectedIds([])
        onRefresh()
      } catch (err) {
        console.error("Bulk status error:", err)
        toast.add({
          title: "Failed to update applications",
          type: "error",
        })
      } finally {
        setUpdatingStatus(false)
      }
    },
    [selectedApps, userId, onRefresh]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await deleteApplicationsBatch(userId, selectedIds)
      toast.add({
        title: `Deleted ${selectedIds.length} application(s)`,
        type: "success",
      })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      onRefresh()
    } catch (err) {
      console.error("Bulk delete error:", err)
      toast.add({
        title: "Failed to delete applications",
        type: "error",
      })
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, userId, onRefresh])

  const handleBulkChangeBank = useCallback(async () => {
    if (selectedIds.length === 0 || !targetBankId) return
    setUpdatingBank(true)
    try {
      await updateApplicationsBankBatch(userId, selectedIds, targetBankId)
      const targetBank = bankMap.get(targetBankId)
      toast.add({
        title: `Bank account updated`,
        description: `Changed funding bank to ${targetBank?.bankName || "selected bank"} for ${selectedIds.length} application(s).`,
        type: "success",
      })
      setSelectedIds([])
      setBankDialogOpen(false)
      onRefresh()
    } catch (err) {
      console.error("Bulk bank update error:", err)
      toast.add({
        title: "Failed to update bank account",
        type: "error",
      })
    } finally {
      setUpdatingBank(false)
    }
  }, [selectedIds, targetBankId, bankMap, userId, onRefresh])

  const handleDelete = useCallback(async () => {
    if (!appToDelete) return
    setDeleting(true)
    try {
      await deleteApplication(userId, appToDelete.id)
      toast.add({
        title: "Application removed",
        type: "success",
      })
      setAppToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to remove application",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }, [appToDelete, userId, onRefresh])

  const handleToggleSettlement = useCallback(
    async (app: Application) => {
      const nextStatus =
        app.settlementStatus === "settled" ? "pending" : "settled"
      try {
        await updateApplicationSettlement(userId, app.id, nextStatus)
        toast.add({
          title:
            nextStatus === "settled"
              ? "Marked as Settled"
              : "Reverted to Pending Payment",
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
    [userId, onRefresh]
  )

  // Filter pills counts
  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === "pending").length,
    [applications]
  )
  const allottedCount = useMemo(
    () => applications.filter((a) => a.status === "allotted").length,
    [applications]
  )
  const notAllottedCount = useMemo(
    () => applications.filter((a) => a.status === "not_allotted").length,
    [applications]
  )
  const soldCount = useMemo(
    () => applications.filter((a) => a.status === "sold").length,
    [applications]
  )
  const unsettledCount = useMemo(
    () =>
      applications.filter(
        (a) =>
          a.status === "sold" &&
          accountMap.get(a.accountId)?.type === "other" &&
          a.settlementStatus !== "settled"
      ).length,
    [applications, accountMap]
  )

  const filterPills: DataTableFilterPill[] = useMemo(() => {
    return [
      {
        id: "all",
        label: "All",
        count: applications.length,
        active: statusFilter === "all",
        onToggle: () => setStatusFilter("all"),
      },
      {
        id: "pending",
        label: "Pending",
        count: pendingCount,
        active: statusFilter === "pending",
        onToggle: () =>
          setStatusFilter(statusFilter === "pending" ? "all" : "pending"),
      },
      {
        id: "allotted",
        label: "Allotted",
        count: allottedCount,
        active: statusFilter === "allotted",
        onToggle: () =>
          setStatusFilter(statusFilter === "allotted" ? "all" : "allotted"),
      },
      {
        id: "not_allotted",
        label: "Not Allotted",
        count: notAllottedCount,
        active: statusFilter === "not_allotted",
        onToggle: () =>
          setStatusFilter(
            statusFilter === "not_allotted" ? "all" : "not_allotted"
          ),
      },
      {
        id: "sold",
        label: "Sold",
        count: soldCount,
        active: statusFilter === "sold",
        onToggle: () =>
          setStatusFilter(statusFilter === "sold" ? "all" : "sold"),
      },
      ...(unsettledCount > 0
        ? [
            {
              id: "unsettled",
              label: "Unsettled",
              count: unsettledCount,
              active: statusFilter === "unsettled",
              onToggle: () =>
                setStatusFilter(
                  statusFilter === "unsettled" ? "all" : "unsettled"
                ),
            },
          ]
        : []),
    ]
  }, [
    applications.length,
    statusFilter,
    pendingCount,
    allottedCount,
    notAllottedCount,
    soldCount,
    unsettledCount,
  ])

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter === "all") return true
      if (statusFilter === "unsettled") {
        return (
          app.status === "sold" &&
          accountMap.get(app.accountId)?.type === "other" &&
          app.settlementStatus !== "settled"
        )
      }
      return app.status === statusFilter
    })
  }, [applications, statusFilter, accountMap])

  // Aggregate stats for footer
  const totalLots = useMemo(
    () => filteredApplications.reduce((sum, a) => sum + a.lotsApplied, 0),
    [filteredApplications]
  )
  const totalAmount = useMemo(
    () => filteredApplications.reduce((sum, a) => sum + a.amountApplied, 0),
    [filteredApplications]
  )

  const handleToggleSelect = useCallback((appId: string) => {
    setSelectedIds((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    )
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(filteredApplications.map((a) => a.id))
      } else {
        setSelectedIds([])
      }
    },
    [filteredApplications]
  )

  return {
    statusFilter,
    setStatusFilter,
    appToDelete,
    setAppToDelete,
    deleting,
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
    accountMap,
    bankMap,
    activeBankAccounts,
    selectedApps,
    selectedLots,
    selectedAmount,
    handleBulkStatus,
    handleBulkDelete,
    handleBulkChangeBank,
    handleDelete,
    handleToggleSettlement,
    filterPills,
    filteredApplications,
    totalLots,
    totalAmount,
    handleToggleSelect,
    handleSelectAll,
  }
}
