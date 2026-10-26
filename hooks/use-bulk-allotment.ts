"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "@/components/ui/toast"
import {
  updateAllotmentsBatch,
  type AllotmentUpdateItem,
} from "@/lib/firebase/applications"
import { calculateInvestment } from "@/lib/calculations/financials"
import { isShareBasedAllotment } from "@/lib/calculations/categories"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

export interface RowState {
  status: ApplicationStatus
  /** For lot-based categories (retail/sHNI/bHNI): the allotted lot count */
  allottedLots: number
  /** For share-based categories (shareholder/employee): the allotted share count */
  allottedShares: number
}

export type AllotmentSortColumn =
  "account" | "bank" | "applied" | "status" | "invested" | null

interface UseBulkAllotmentProps {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

/**
 * Resolves the invested shares for a given row, accounting for share-based
 * vs lot-based allotment depending on the application's category.
 */
function resolveAllottedShares(
  app: Application,
  state: RowState,
  lotSize: number
): number {
  const isShareBased = isShareBasedAllotment(app.category || "retail")
  return isShareBased ? state.allottedShares : state.allottedLots * lotSize
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

  // Local state for each application's allotment status, lots, and shares
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {}
    for (const app of applications) {
      const isShareBased = isShareBasedAllotment(app.category || "retail")
      const defaultLots =
        app.allottedLots !== undefined
          ? app.allottedLots
          : app.status === "allotted" || app.status === "sold"
            ? app.lotsApplied
            : app.status === "not_allotted"
              ? 0
              : app.lotsApplied
      const defaultShares =
        app.allottedShares !== undefined
          ? app.allottedShares
          : app.status === "not_allotted"
            ? 0
            : isShareBased
              ? app.sharesApplied
              : defaultLots * ipo.lotSize

      init[app.id] = {
        status: app.status,
        allottedLots: defaultLots,
        allottedShares: defaultShares,
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
        if (!app) return prev

        const isShareBased = isShareBasedAllotment(app.category || "retail")
        const defaultLots = app.lotsApplied
        const defaultShares = isShareBased
          ? app.sharesApplied
          : defaultLots * ipo.lotSize
        const currentLots = prev[appId]?.allottedLots || defaultLots
        const currentShares = prev[appId]?.allottedShares || defaultShares

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
            allottedShares:
              status === "allotted"
                ? currentShares <= 0
                  ? defaultShares
                  : currentShares
                : status === "not_allotted"
                  ? 0
                  : defaultShares,
          },
        }
      })
    },
    [applications, ipo.lotSize]
  )

  const setAllottedLots = useCallback(
    (appId: string, lots: number) => {
      const clamped = isNaN(lots) || lots <= 0 ? 0 : lots

      setRowStates((prev) => ({
        ...prev,
        [appId]: {
          status: "allotted",
          allottedLots: clamped,
          allottedShares: clamped * ipo.lotSize,
        },
      }))
    },
    [ipo.lotSize]
  )

  const setAllottedShares = useCallback((appId: string, shares: number) => {
    const clamped = isNaN(shares) || shares <= 0 ? 0 : shares

    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        status: "allotted",
        allottedLots: 0,
        allottedShares: clamped,
      },
    }))
  }, [])

  // 1-Click Action Handlers
  const handleAllAllotted = useCallback(() => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          const isShareBased = isShareBasedAllotment(app.category || "retail")
          updated[app.id] = {
            status: "allotted",
            allottedLots: app.lotsApplied,
            allottedShares: isShareBased
              ? app.sharesApplied
              : app.lotsApplied * ipo.lotSize,
          }
        }
      }
      return updated
    })
  }, [applications, ipo.lotSize])

  const handleAllNotAllotted = useCallback(() => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "not_allotted",
            allottedLots: 0,
            allottedShares: 0,
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
          const isShareBased = isShareBasedAllotment(app.category || "retail")
          updated[app.id] = {
            status: "pending",
            allottedLots: app.lotsApplied,
            allottedShares: isShareBased
              ? app.sharesApplied
              : app.lotsApplied * ipo.lotSize,
          }
        }
      }
      return updated
    })
  }, [applications, ipo.lotSize])

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
        allottedShares: appA.sharesApplied,
      }
      const stateB = rowStates[appB.id] || {
        status: appB.status,
        allottedLots: appB.lotsApplied,
        allottedShares: appB.sharesApplied,
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
        const sharesA = resolveAllottedShares(appA, stateA, ipo.lotSize)
        const sharesB = resolveAllottedShares(appB, stateB, ipo.lotSize)
        const invA =
          stateA.status === "allotted" || stateA.status === "sold"
            ? sharesA * ipo.issuePrice
            : 0
        const invB =
          stateB.status === "allotted" || stateB.status === "sold"
            ? sharesB * ipo.issuePrice
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
      const shares = state
        ? resolveAllottedShares(app, state, ipo.lotSize)
        : (app.allottedShares ?? 0)

      if (st === "sold") {
        soldCount++
        const inv = calculateInvestment(shares, ipo.issuePrice)
        totalInvested += inv
      } else if (st === "allotted") {
        allottedCount++
        const inv = calculateInvestment(shares, ipo.issuePrice)
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
          const isShareBased = isShareBasedAllotment(app.category || "retail")

          if (state.status === "pending") {
            return {
              applicationId: app.id,
              status: state.status,
              allottedLots: undefined,
              allottedShares: undefined,
            }
          }

          if (isShareBased) {
            // Share-based: shareholder / employee — store raw shares, lots = 0
            const finalShares = isAllotted
              ? Math.max(1, state.allottedShares)
              : 0
            return {
              applicationId: app.id,
              status: state.status,
              allottedLots: 0,
              allottedShares: finalShares,
            }
          }

          // Lot-based: retail / sHNI / bHNI
          const finalLots = isAllotted ? Math.max(1, state.allottedLots) : 0
          const finalShares = finalLots * ipo.lotSize

          return {
            applicationId: app.id,
            status: state.status,
            allottedLots: finalLots,
            allottedShares: finalShares,
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
    setAllottedShares,
    handleAllAllotted,
    handleAllNotAllotted,
    handleResetToPending,
    sortedApps,
    stats,
    handleSubmit,
  }
}
