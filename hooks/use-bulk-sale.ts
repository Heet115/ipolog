"use client"

import { useState, useMemo, useCallback } from "react"
import { Timestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"
import { recordSaleBulk, type BulkSaleItem } from "@/lib/firebase/applications"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import type { Ipo, Application, ApplicationAccount } from "@/types"

export interface SaleRowState {
  selected: boolean
  salePrice: number
  sharesSold: number
}

export type BulkSaleSortColumn = "account" | "shares" | "price" | "profit" | null

interface UseBulkSaleProps {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

export function useBulkSale({
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: UseBulkSaleProps) {
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )

  // Only allotted and partially sold applications
  const eligibleApps = useMemo(
    () =>
      applications.filter(
        (a) => a.status === "allotted" || a.status === "sold"
      ),
    [applications]
  )

  const defaultPrice = useMemo(
    () => ipo.currentPrice || ipo.listingPrice || ipo.issuePrice,
    [ipo.currentPrice, ipo.listingPrice, ipo.issuePrice]
  )

  const [globalSalePrice, setGlobalSalePrice] = useState<string>(
    String(defaultPrice)
  )
  const [globalSaleDate, setGlobalSaleDate] = useState<Date | undefined>(
    new Date()
  )

  const [rowStates, setRowStates] = useState<Record<string, SaleRowState>>(
    () => {
      const init: Record<string, SaleRowState> = {}
      for (const app of eligibleApps) {
        const shares =
          app.allottedShares || (app.allottedLots || 1) * ipo.lotSize
        init[app.id] = {
          selected: true,
          salePrice: defaultPrice,
          sharesSold: shares,
        }
      }
      return init
    }
  )

  const [sortColumn, setSortColumn] = useState<BulkSaleSortColumn>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSort = useCallback(
    (col: "account" | "shares" | "price" | "profit") => {
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

  const handleFillCmp = useCallback(() => {
    const cmp = ipo.currentPrice || ipo.listingPrice
    if (cmp) {
      setGlobalSalePrice(String(cmp))
      setRowStates((prev) => {
        const updated = { ...prev }
        for (const id in updated) {
          updated[id] = { ...updated[id], salePrice: cmp }
        }
        return updated
      })
    }
  }, [ipo.currentPrice, ipo.listingPrice])

  const handleApplyGlobalPrice = useCallback(() => {
    const price = parseFloat(globalSalePrice)
    if (!price || price <= 0) return

    setRowStates((prev) => {
      const updated = { ...prev }
      for (const id in updated) {
        if (updated[id]?.selected) {
          updated[id] = { ...updated[id], salePrice: price }
        }
      }
      return updated
    })
  }, [globalSalePrice])

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setRowStates((prev) => {
        const updated = { ...prev }
        for (const app of eligibleApps) {
          updated[app.id] = { ...updated[app.id], selected: checked }
        }
        return updated
      })
    },
    [eligibleApps]
  )

  const toggleRow = useCallback((appId: string) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        selected: !prev[appId]?.selected,
      },
    }))
  }, [])

  const updateRowPrice = useCallback((appId: string, price: number) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        salePrice: price,
      },
    }))
  }, [])

  const updateRowShares = useCallback((appId: string, shares: number) => {
    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        sharesSold: shares,
      },
    }))
  }, [])

  // Summary calculations
  const summary = useMemo(() => {
    let totalGrossProfit = 0
    let totalProfitShared = 0
    let totalYourProfit = 0
    let selectedCount = 0

    for (const app of eligibleApps) {
      const state = rowStates[app.id]
      if (state?.selected) {
        selectedCount++
        const account = accountMap.get(app.accountId)
        const gross = calculateRealizedGrossProfit(
          state.sharesSold,
          state.salePrice,
          ipo.issuePrice
        )
        const shared = calculateProfitShared(
          gross,
          account?.type === "my" ? 0 : (account?.profitSharePercent ?? 40)
        )
        const your = calculateYourProfit(
          gross,
          account?.type === "my" ? 0 : (account?.profitSharePercent ?? 40)
        )

        totalGrossProfit += gross
        totalProfitShared += shared
        totalYourProfit += your
      }
    }

    return {
      totalGrossProfit,
      totalProfitShared,
      totalYourProfit,
      selectedCount,
    }
  }, [eligibleApps, rowStates, accountMap, ipo.issuePrice])

  const allSelected = useMemo(
    () =>
      eligibleApps.length > 0 &&
      eligibleApps.every((a) => rowStates[a.id]?.selected),
    [eligibleApps, rowStates]
  )

  const sortedEligibleApps = useMemo(() => {
    if (!sortColumn) return eligibleApps

    const list = [...eligibleApps]
    list.sort((appA, appB) => {
      const accA = accountMap.get(appA.accountId)
      const accB = accountMap.get(appB.accountId)
      const stateA = rowStates[appA.id] || {
        selected: false,
        salePrice: defaultPrice,
        sharesSold: 0,
      }
      const stateB = rowStates[appB.id] || {
        selected: false,
        salePrice: defaultPrice,
        sharesSold: 0,
      }

      let res = 0
      if (sortColumn === "account") {
        res = (accA?.name || "").localeCompare(accB?.name || "")
      } else if (sortColumn === "shares") {
        res = stateA.sharesSold - stateB.sharesSold
      } else if (sortColumn === "price") {
        res = stateA.salePrice - stateB.salePrice
      } else if (sortColumn === "profit") {
        const grossA = calculateRealizedGrossProfit(
          stateA.sharesSold,
          stateA.salePrice,
          ipo.issuePrice
        )
        const yourA = calculateYourProfit(
          grossA,
          accA?.type === "my" ? 0 : (accA?.profitSharePercent ?? 40)
        )
        const grossB = calculateRealizedGrossProfit(
          stateB.sharesSold,
          stateB.salePrice,
          ipo.issuePrice
        )
        const yourB = calculateYourProfit(
          grossB,
          accB?.type === "my" ? 0 : (accB?.profitSharePercent ?? 40)
        )
        res = yourA - yourB
      }

      return sortDirection === "asc" ? res : -res
    })
    return list
  }, [
    eligibleApps,
    sortColumn,
    sortDirection,
    accountMap,
    rowStates,
    defaultPrice,
    ipo.issuePrice,
  ])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      setError(null)

      try {
        const items: BulkSaleItem[] = []

        for (const app of eligibleApps) {
          const state = rowStates[app.id]
          if (state?.selected) {
            if (!state.salePrice || state.salePrice <= 0) {
              throw new Error(
                "Please ensure all selected rows have a valid sale price."
              )
            }
            if (!state.sharesSold || state.sharesSold <= 0) {
              throw new Error(
                "Please ensure all selected rows have valid shares sold."
              )
            }

            items.push({
              applicationId: app.id,
              salePrice: state.salePrice,
              sharesSold: state.sharesSold,
              saleDate: globalSaleDate
                ? Timestamp.fromDate(globalSaleDate)
                : undefined,
            })
          }
        }

        if (items.length === 0) {
          throw new Error("Please select at least one account to record a sale.")
        }

        await recordSaleBulk(userId, items)
        toast.add({
          title: `Sales recorded for ${items.length} applications`,
          type: "success",
        })
        onSuccess()
      } catch (err: unknown) {
        console.error(err)
        setError(
          err instanceof Error ? err.message : "Failed to record bulk sale."
        )
      } finally {
        setLoading(false)
      }
    },
    [eligibleApps, rowStates, globalSaleDate, userId, onSuccess]
  )

  return {
    accountMap,
    eligibleApps,
    defaultPrice,
    globalSalePrice,
    setGlobalSalePrice,
    globalSaleDate,
    setGlobalSaleDate,
    rowStates,
    sortColumn,
    sortDirection,
    loading,
    error,
    toggleSort,
    handleFillCmp,
    handleApplyGlobalPrice,
    toggleSelectAll,
    toggleRow,
    updateRowPrice,
    updateRowShares,
    summary,
    allSelected,
    sortedEligibleApps,
    handleSubmit,
  }
}
