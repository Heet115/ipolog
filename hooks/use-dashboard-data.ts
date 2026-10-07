"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/firebase/auth-context"
import { getIpos } from "@/lib/firebase/ipos"
import {
  getApplications,
  cleanupOrphanedApplications,
} from "@/lib/firebase/applications"
import { getApplicationAccounts } from "@/lib/firebase/accounts"
import { getBankAccounts } from "@/lib/firebase/bank-accounts"
import {
  calculateDashboardMetrics,
  checkBankAsbaLimits,
  calculateReceivablesSummary,
} from "@/lib/calculations/financials"
import { getIpoStatus } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export function useDashboardData() {
  const { user } = useAuth()

  const [ipos, setIpos] = useState<Ipo[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [accounts, setAccounts] = useState<ApplicationAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [fetchError, setFetchError] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    let ignore = false
    if (!user) return

    Promise.all([
      getIpos(user.uid, true),
      getApplications(user.uid),
      getApplicationAccounts(user.uid, true),
      getBankAccounts(user.uid, true),
    ])
      .then(([iposData, appsData, accountsData, banksData]) => {
        if (!ignore) {
          const validIpoIds = new Set(iposData.map((i) => i.id))
          const validApps = appsData.filter((a) => validIpoIds.has(a.ipoId))
          if (validApps.length !== appsData.length) {
            cleanupOrphanedApplications(
              user.uid,
              iposData.map((i) => i.id)
            ).catch(console.error)
          }
          setIpos(iposData)
          setApplications(validApps)
          setAccounts(accountsData)
          setBankAccounts(banksData)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err)
        if (!ignore) {
          setFetchError(true)
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [user, fetchTrigger])

  const retry = () => {
    setLoading(true)
    setFetchError(false)
    setFetchTrigger((prev) => prev + 1)
  }

  // Pre-calculate mappings & domain metrics
  const metrics = useMemo(
    () => calculateDashboardMetrics(ipos, applications, accounts),
    [ipos, applications, accounts]
  )
  const ipoMap = useMemo(() => new Map(ipos.map((i) => [i.id, i])), [ipos])
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const receivables = useMemo(
    () => calculateReceivablesSummary(applications, ipoMap, accountMap),
    [applications, ipoMap, accountMap]
  )

  // Active IPOs filtering
  const activeIpos = useMemo(() => {
    return ipos
      .filter((ipo) => !ipo.archived)
      .filter((ipo) => {
        const st = getIpoStatus(ipo).status
        return (
          st === "upcoming" ||
          st === "open" ||
          st === "allotment_pending" ||
          st === "closed"
        )
      })
  }, [ipos])

  const openIpos = useMemo(
    () => activeIpos.filter((ipo) => getIpoStatus(ipo).status === "open"),
    [activeIpos]
  )
  const allotmentIpos = useMemo(
    () =>
      activeIpos.filter((ipo) => {
        const st = getIpoStatus(ipo).status
        return st === "allotment_pending" || st === "closed"
      }),
    [activeIpos]
  )

  // Applications sorting & filtering
  const recentApps = useMemo(() => {
    return [...applications]
      .sort((a, b) => {
        const aTime = a.applicationDate?.seconds ?? 0
        const bTime = b.applicationDate?.seconds ?? 0
        return bTime - aTime
      })
      .slice(0, 7)
  }, [applications])

  const soldApps = useMemo(() => {
    return applications
      .filter((a) => a.status === "sold")
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds ?? a.applicationDate?.seconds ?? 0
        const bTime = b.updatedAt?.seconds ?? b.applicationDate?.seconds ?? 0
        return bTime - aTime
      })
      .slice(0, 7)
  }, [applications])

  // ASBA and bank liquidity stats
  const activeBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !b.archived),
    [bankAccounts]
  )
  const totalAsbaLimit = useMemo(
    () => activeBankAccounts.reduce((sum, b) => sum + (b.asbaLimit || 0), 0),
    [activeBankAccounts]
  )
  const asbaUtilization =
    totalAsbaLimit > 0
      ? Math.min(100, Math.round((metrics.totalBlocked / totalAsbaLimit) * 100))
      : 0

  const asbaWarnings = useMemo(
    () => checkBankAsbaLimits(bankAccounts, applications, ipoMap),
    [bankAccounts, applications, ipoMap]
  )
  const exceededWarnings = useMemo(
    () => asbaWarnings.filter((w) => w.isExceeded),
    [asbaWarnings]
  )

  const totalDecided =
    metrics.allottedApplications +
    metrics.soldApplications +
    metrics.notAllottedApplications
  const successRate =
    totalDecided > 0
      ? ((metrics.allottedApplications + metrics.soldApplications) /
          totalDecided) *
        100
      : 0

  const totalInMotion =
    metrics.totalInvested + metrics.totalBlocked + metrics.totalRefundExpected
  const investedPct =
    totalInMotion > 0 ? (metrics.totalInvested / totalInMotion) * 100 : 0
  const blockedPct =
    totalInMotion > 0 ? (metrics.totalBlocked / totalInMotion) * 100 : 0
  const refundPct =
    totalInMotion > 0 ? (metrics.totalRefundExpected / totalInMotion) * 100 : 0
  const userName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "Investor"

  const isCompletelyEmpty =
    ipos.length === 0 && accounts.length === 0 && bankAccounts.length === 0

  return {
    ipos,
    applications,
    accounts,
    bankAccounts,
    loading,
    fetchError,
    retry,
    metrics,
    ipoMap,
    accountMap,
    receivables,
    activeIpos,
    openIpos,
    allotmentIpos,
    recentApps,
    soldApps,
    totalAsbaLimit,
    asbaUtilization,
    exceededWarnings,
    totalDecided,
    successRate,
    totalInMotion,
    investedPct,
    blockedPct,
    refundPct,
    userName,
    isCompletelyEmpty,
  }
}
