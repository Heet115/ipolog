"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "@/components/ui/toast"
import {
  updateAllotmentsBatch,
  type AllotmentUpdateItem,
} from "@/lib/firebase/applications"
import { calculateInvestment } from "@/lib/calculations/financials"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

export interface RowState {
  status: ApplicationStatus
  allottedLots: number
}

export type AllotmentSortColumn =
  | "account"
  | "bank"
  | "applied"
  | "status"
  | "invested"
  | null

interface UseBulkAllotmentProps {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function useBulkAllotment({
  userId,
  ipo,
  applications,
  accounts,
  bankAccounts,
  onSuccess,
}: UseBulkAllotmentProps) {
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const bankMap = useMemo(
    () => new Map(bankAccounts.map((b) => [b.id, b])),
    [bankAccounts]
  )

  // Local state for each application's allotment status and lots
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {}
    for (const app of applications) {
      init[app.id] = {
        status: app.status,
        allottedLots:
          app.allottedLots !== undefined
            ? app.allottedLots
            : app.status === "allotted" || app.status === "sold"
              ? app.lotsApplied
              : app.status === "not_allotted"
                ? 0
                : app.lotsApplied,
      }
    }
    return init
  })

  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<AllotmentSortColumn>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSort = useCallback(
    (col: "account" | "bank" | "applied" | "status" | "invested") => {
      if (sortColumn !== col) {
        setSortColumn(col)
        setSortDirection("asc")
      } else if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortColumn(null)
      }
    },
    [sortColumn, sortDirection]
  )

  const setStatus = useCallback(
    (appId: string, status: ApplicationStatus) => {
      setRowStates((prev) => {
        const app = applications.find((a) => a.id === appId)
        const defaultLots = app ? app.lotsApplied : 1
        const currentLots = prev[appId]?.allottedLots || defaultLots

        return {
          ...prev,
          [appId]: {
            status,
            allottedLots:
              status === "allotted"
                ? currentLots <= 0
                  ? defaultLots
                  : currentLots
                : status === "not_allotted"
                  ? 0
                  : defaultLots,
          },
        }
      })
    },
    [applications]
  )

  const setAllottedLots = useCallback(
    (appId: string, lots: number) => {
      const app = applications.find((a) => a.id === appId)
      const maxLots = app ? app.lotsApplied : 1
      const clamped = isNaN(lots) || lots <= 0 ? 0 : Math.min(lots, maxLots)

      setRowStates((prev) => ({
        ...prev,
        [appId]: {
          status: "allotted",
          allottedLots: clamped,
        },
      }))
    },
    [applications]
  )

  // 1-Click Action Handlers
  const handleAllAllotted = useCallback(() => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "allotted",
            allottedLots: app.lotsApplied,
          }
        }
      }
      return updated
    })
  }, [applications])

  const handleAllNotAllotted = useCallback(() => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "not_allotted",
            allottedLots: 0,
          }
        }
      }
      return updated
    })
  }, [applications])

  const handleResetToPending = useCallback(() => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "pending",
            allottedLots: app.lotsApplied,
          }
        }
      }
      return updated
    })
  }, [applications])

  // Filter & Sort Applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const acc = accountMap.get(app.accountId)?.name?.toLowerCase() || ""
      const bank = bankMap.get(app.bankAccountId)
      const bName = bank?.bankName?.toLowerCase() || ""
      const bNick = bank?.nickname?.toLowerCase() || ""
      return acc.includes(q) || bName.includes(q) || bNick.includes(q)
    })
  }, [applications, search, accountMap, bankMap])

  const sortedApps = useMemo(() => {
    if (!sortColumn) return filteredApps

    const list = [...filteredApps]
    list.sort((appA, appB) => {
      const accA = accountMap.get(appA.accountId)
      const accB = accountMap.get(appB.accountId)
      const bankA = bankMap.get(appA.bankAccountId)
      const bankB = bankMap.get(appB.bankAccountId)
      const stateA = rowStates[appA.id] || {
        status: appA.status,
        allottedLots: appA.lotsApplied,
      }
      const stateB = rowStates[appB.id] || {
        status: appB.status,
        allottedLots: appB.lotsApplied,
      }

      let res = 0
      if (sortColumn === "account") {
        res = (accA?.name || "").localeCompare(accB?.name || "")
      } else if (sortColumn === "bank") {
        res = (bankA?.bankName || "").localeCompare(bankB?.bankName || "")
      } else if (sortColumn === "applied") {
        res = appA.amountApplied - appB.amountApplied
      } else if (sortColumn === "status") {
        const order: Record<string, number> = {
          allotted: 1,
          sold: 2,
          pending: 3,
          not_allotted: 4,
        }
        res = (order[stateA.status] || 9) - (order[stateB.status] || 9)
      } else if (sortColumn === "invested") {
        const invA =
          stateA.status === "allotted" || stateA.status === "sold"
            ? stateA.allottedLots * ipo.lotSize * ipo.issuePrice
            : 0
        const invB =
          stateB.status === "allotted" || stateB.status === "sold"
            ? stateB.allottedLots * ipo.lotSize * ipo.issuePrice
            : 0
        res = invA - invB
      }

      return sortDirection === "asc" ? res : -res
    })
    return list
  }, [
    filteredApps,
    sortColumn,
    sortDirection,
    accountMap,
    bankMap,
    rowStates,
    ipo.lotSize,
    ipo.issuePrice,
  ])

  // Live summary stats
  const stats = useMemo(() => {
    let allottedCount = 0
    let notAllottedCount = 0
    let pendingCount = 0
    let soldCount = 0
    let totalInvested = 0
    let totalRefund = 0

    for (const app of applications) {
      const state = rowStates[app.id]
      const st = state ? state.status : app.status
      const lots = state ? state.allottedLots : app.allottedLots || 0

      if (st === "sold") {
        soldCount++
        const inv = calculateInvestment(lots * ipo.lotSize, ipo.issuePrice)
        totalInvested += inv
      } else if (st === "allotted") {
        allottedCount++
        const inv = calculateInvestment(lots * ipo.lotSize, ipo.issuePrice)
        totalInvested += inv
        totalRefund += Math.max(0, app.amountApplied - inv)
      } else if (st === "not_allotted") {
        notAllottedCount++
        totalRefund += app.amountApplied
      } else {
        pendingCount++
      }
    }

    const totalDecided = allottedCount + soldCount + notAllottedCount
    const successRate =
      totalDecided > 0 ? ((allottedCount + soldCount) / totalDecided) * 100 : 0

    return {
      allottedCount,
      notAllottedCount,
      pendingCount,
      soldCount,
      totalInvested,
      totalRefund,
      totalDecided,
      successRate,
    }
  }, [applications, rowStates, ipo.lotSize, ipo.issuePrice])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      try {
        const itemsToUpdate: AllotmentUpdateItem[] = applications.map((app) => {
          const state = rowStates[app.id]
          if (!state) {
            return {
              applicationId: app.id,
              status: app.status,
              allottedLots: app.allottedLots,
              allottedShares: app.allottedShares,
            }
          }

          const isAllotted =
            state.status === "allotted" || state.status === "sold"
          const finalLots = isAllotted ? Math.max(1, state.allottedLots) : 0
          const finalShares = isAllotted ? finalLots * ipo.lotSize : 0

          return {
            applicationId: app.id,
            status: state.status,
            allottedLots: state.status === "pending" ? undefined : finalLots,
            allottedShares: state.status === "pending" ? undefined : finalShares,
          }
        })

        await updateAllotmentsBatch(userId, itemsToUpdate)
        toast.add({
          title: "Allotment statuses updated successfully",
          type: "success",
        })
        onSuccess()
      } catch (err: unknown) {
        console.error(err)
        setError("Failed to update allotment statuses. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [applications, rowStates, ipo.lotSize, userId, onSuccess]
  )

  return {
    accountMap,
    bankMap,
    rowStates,
    search,
    setSearch,
    sortColumn,
    sortDirection,
    toggleSort,
    loading,
    confirmResetOpen,
    setConfirmResetOpen,
    error,
    setStatus,
    setAllottedLots,
    handleAllAllotted,
    handleAllNotAllotted,
    handleResetToPending,
    sortedApps,
    stats,
    handleSubmit,
  }
}
