"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpoById, archiveIpo, deleteIpo } from "@/lib/firebase/ipos"
import { getApplicationsByIpo } from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import { toast } from "@/components/ui/toast"
import { getIpoStatus, isIpoSyncStale } from "@/lib/utils/ipo"
import {
  calculateIpoMoneySummary,
  calculateIpoProfitSummary,
} from "@/lib/calculations/financials"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export function useIpoDetail() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const ipoId = typeof params?.id === "string" ? params.id : ""

  const [ipo, setIpo] = useState<Ipo | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const reloadData = useCallback(async () => {
    if (!user || !ipoId) return
    try {
      const [ipoData, appsData, accountsData, banksData] = await Promise.all([
        getIpoById(user.uid, ipoId),
        getApplicationsByIpo(user.uid, ipoId),
        getApplicationAccounts(user.uid, true),
        getBankAccounts(user.uid, true),
      ])

      if (!ipoData) {
        setNotFound(true)
      } else {
        setIpo(ipoData)
        setApplications(appsData)
        setAccounts(accountsData)
        setBankAccounts(banksData)
      }
    } catch (err) {
      console.error("Failed to load IPO details:", err)
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [user, ipoId])

  useEffect(() => {
    let ignore = false
    if (!user || !ipoId) return

    Promise.all([
      getIpoById(user.uid, ipoId),
      getApplicationsByIpo(user.uid, ipoId),
      getApplicationAccounts(user.uid, true),
      getBankAccounts(user.uid, true),
    ])
      .then(([ipoData, appsData, accountsData, banksData]) => {
        if (!ignore) {
          if (!ipoData) {
            setNotFound(true)
          } else {
            setIpo(ipoData)
            setApplications(appsData)
            setAccounts(accountsData)
            setBankAccounts(banksData)

            // Auto-refresh in background if imported IPO data is older than 24 hours and not archived
            if (
              ipoData.externalId &&
              !ipoData.archived &&
              isIpoSyncStale(ipoData, 24)
            ) {
              user.getIdToken().then((token) => {
                fetch(`/api/ipos/${ipoData.id}/sync`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                  .then((res) => res.json())
                  .then((json) => {
                    if (json.success && json.ipo && !ignore) {
                      setIpo(json.ipo)
                    }
                  })
                  .catch(() => {})
              })
            }
          }
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load IPO details:", err)
        if (!ignore) {
          setFetchError(true)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, ipoId])

  useEffect(() => {
    const handleAutoRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{
        refreshedIpos?: Array<{ id: string }>
      }>
      if (
        !customEvent.detail?.refreshedIpos ||
        customEvent.detail.refreshedIpos.some((item) => item.id === ipoId)
      ) {
        reloadData()
      }
    }
    window.addEventListener("ipos-auto-refreshed", handleAutoRefreshed)
    return () => {
      window.removeEventListener("ipos-auto-refreshed", handleAutoRefreshed)
    }
  }, [ipoId, reloadData])

  const handleRefreshData = async () => {
    if (!user || !ipo || !ipo.externalId) return
    setSyncing(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch(`/api/ipos/${ipo.id}/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to refresh IPO data.")
      }

      toast.add({
        title: "Data Refreshed",
        description: `${ipo.name} updated from Upstox.`,
        type: "success",
      })
      reloadData()
    } catch (err: unknown) {
      console.error("Failed to sync IPO data:", err)
      toast.add({
        title: "Refresh Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not refresh IPO data. Please try again.",
        type: "error",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleArchive = async () => {
    if (!user || !ipo) return
    try {
      await archiveIpo(user.uid, ipo.id, !ipo.archived)
      toast.add({
        title: ipo.archived ? "IPO restored" : "IPO archived",
        type: "success",
      })
      reloadData()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update IPO archive state",
        type: "error",
      })
    }
  }

  const handleDelete = async () => {
    if (!user || !ipo) return
    setDeleting(true)
    try {
      await deleteIpo(user.uid, ipo.id)
      toast.add({
        title: "IPO deleted",
        type: "success",
      })
      router.replace("/ipos")
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete IPO",
        type: "error",
      })
      setDeleting(false)
    }
  }

  // Pre-calculated stats
  const statusInfo = useMemo(() => (ipo ? getIpoStatus(ipo) : null), [ipo])
  const minAmount = ipo ? ipo.issuePrice * ipo.lotSize : 0
  const accountsMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  const moneySummary = useMemo(
    () => (ipo ? calculateIpoMoneySummary(applications, ipo.issuePrice) : null),
    [applications, ipo]
  )
  const profitSummary = useMemo(
    () => (ipo ? calculateIpoProfitSummary(applications, ipo, accountsMap) : null),
    [applications, ipo, accountsMap]
  )

  const hasAllottedApps = useMemo(
    () => applications.some((a) => a.status === "allotted" || a.status === "sold"),
    [applications]
  )

  const timelineSteps = useMemo(() => {
    if (!ipo || !statusInfo) return []
    const isListed = statusInfo.status === "listed"
    const isAllotmentOut = isListed || statusInfo.status === "allotment_pending"
    const isClosed = isAllotmentOut || statusInfo.status === "closed"
    const isOpened = isClosed || statusInfo.status === "open"

    return [
      { label: "Bidding Opens", date: ipo.openDate, done: isOpened },
      { label: "Bidding Closes", date: ipo.closeDate, done: isClosed },
      { label: "Allotment", date: ipo.allotmentDate, done: isAllotmentOut },
      { label: "Listing Day", date: ipo.listingDate, done: isListed },
    ]
  }, [ipo, statusInfo])

  return {
    user,
    ipo,
    applications,
    accounts,
    bankAccounts,
    loading,
    notFound,
    fetchError,
    reloadData,
    handleRefreshData,
    handleToggleArchive,
    handleDelete,
    syncing,
    deleting,
    statusInfo,
    minAmount,
    moneySummary,
    profitSummary,
    hasAllottedApps,
    timelineSteps,
  }
}
