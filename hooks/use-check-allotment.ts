"use client"

import { useState, useMemo } from "react"
import { toast } from "@/components/ui/toast"
import {
  updateApplication,
  updateAllotmentsBatch,
} from "@/lib/firebase/applications"
import { updateIpo } from "@/lib/firebase/ipos"
import {
  KNOWN_REGISTRARS,
  detectRegistrar,
  getRegistrarPortalUrl,
} from "@/lib/utils/registrars"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  ApplicationStatus,
} from "@/types"

export type AllotmentStatusFilter =
  "all" | "pending" | "allotted" | "not_allotted"

interface UseCheckAllotmentProps {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

export function useCheckAllotment({
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: UseCheckAllotmentProps) {
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  const detected = detectRegistrar(ipo.registrar)
  const [userSelectedRegistrar, setUserSelectedRegistrar] = useState<{
    ipoId: string
    registrar: string
  } | null>(null)

  const selectedRegistrar =
    userSelectedRegistrar?.ipoId === ipo.id
      ? userSelectedRegistrar.registrar
      : ipo.registrar || detected?.name || ""

  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AllotmentStatusFilter>("all")

  const portalUrl = getRegistrarPortalUrl(selectedRegistrar, ipo.registrarUrl)
  const activeRegistrarMeta =
    detectRegistrar(selectedRegistrar) ||
    KNOWN_REGISTRARS.find(
      (r) =>
        r.id === selectedRegistrar ||
        r.name.toLowerCase() === selectedRegistrar.toLowerCase()
    )

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast.add({
        title: `${label} Copied`,
        description: `${text} copied to clipboard.`,
        type: "success",
      })
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast.add({
        title: "Failed to copy",
        type: "error",
      })
    }
  }

  const handleUpdateStatus = async (
    applicationId: string,
    status: "allotted" | "not_allotted"
  ) => {
    const app = applications.find((a) => a.id === applicationId)
    if (!app) return

    setUpdatingAppId(applicationId)
    try {
      const allottedLots =
        status === "allotted" ? app.allottedLots || app.lotsApplied || 1 : 0
      const allottedShares =
        status === "allotted" ? allottedLots * ipo.lotSize : 0

      await updateApplication(userId, applicationId, {
        status,
        allottedLots,
        allottedShares,
      })

      toast.add({
        title: `Marked as ${status === "allotted" ? "Allotted" : "Not Allotted"}`,
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update status",
        type: "error",
      })
    } finally {
      setUpdatingAppId(null)
    }
  }

  const handleSaveRegistrar = async (registrarName: string) => {
    setUserSelectedRegistrar({ ipoId: ipo.id, registrar: registrarName })
    const detectedReg = detectRegistrar(registrarName)
    try {
      await updateIpo(userId, ipo.id, {
        registrar: registrarName,
        registrarUrl: detectedReg?.checkUrl || null,
      })
      toast.add({
        title: "Registrar updated",
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllPendingNotAllotted = async () => {
    const pendingApps = applications.filter((a) => a.status === "pending")
    if (pendingApps.length === 0) return

    setIsBulkUpdating(true)
    try {
      await updateAllotmentsBatch(
        userId,
        pendingApps.map((a) => ({
          applicationId: a.id,
          status: "not_allotted" as ApplicationStatus,
          allottedLots: 0,
          allottedShares: 0,
        }))
      )
      toast.add({
        title: `Updated ${pendingApps.length} pending applications`,
        description: "All pending applications marked as Not Allotted.",
        type: "success",
      })
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Bulk update failed",
        type: "error",
      })
    } finally {
      setIsBulkUpdating(false)
    }
  }

  // Progress metrics
  const pendingCount = applications.filter((a) => a.status === "pending").length
  const allottedCount = applications.filter(
    (a) => a.status === "allotted" || a.status === "sold"
  ).length
  const notAllottedCount = applications.filter(
    (a) => a.status === "not_allotted"
  ).length
  const totalCount = applications.length
  const verifiedCount = allottedCount + notAllottedCount
  const progressPercent =
    totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Status filter
      if (statusFilter === "pending" && app.status !== "pending") return false
      if (
        statusFilter === "allotted" &&
        app.status !== "allotted" &&
        app.status !== "sold"
      )
        return false
      if (statusFilter === "not_allotted" && app.status !== "not_allotted")
        return false

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const account = accountMap.get(app.accountId)
        const nameMatch = account?.name?.toLowerCase().includes(q)
        const panMatch = account?.pan?.toLowerCase().includes(q)
        const dematMatch = account?.dematAccount?.toLowerCase().includes(q)
        const appNoMatch = app.applicationNumber?.toLowerCase().includes(q)
        return Boolean(nameMatch || panMatch || dematMatch || appNoMatch)
      }

      return true
    })
  }, [applications, statusFilter, searchQuery, accountMap])

  return {
    accountMap,
    selectedRegistrar,
    portalUrl,
    activeRegistrarMeta,
    handleSaveRegistrar,
    updatingAppId,
    isBulkUpdating,
    copiedKey,
    handleCopy,
    handleUpdateStatus,
    handleMarkAllPendingNotAllotted,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredApplications,
    pendingCount,
    allottedCount,
    notAllottedCount,
    totalCount,
    verifiedCount,
    progressPercent,
  }
}
