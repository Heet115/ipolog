"use client"

import { useState } from "react"
import { Timestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"
import { recordSaleSingle } from "@/lib/firebase/applications"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateYourProfit,
} from "@/lib/calculations/financials"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface UseRecordSaleFormProps {
  userId: string
  ipo: Ipo
  application: Application
  account?: ApplicationAccount
  onOpenSettlement?: (app: Application) => void
  onSuccess: () => void
}

export function useRecordSaleForm({
  userId,
  ipo,
  application,
  account,
  onOpenSettlement,
  onSuccess,
}: UseRecordSaleFormProps) {
  const maxShares =
    application.allottedShares || (application.allottedLots || 1) * ipo.lotSize

  const [salePrice, setSalePrice] = useState<string>(
    application.salePrice
      ? String(application.salePrice)
      : ipo.currentPrice
        ? String(ipo.currentPrice)
        : ipo.listingPrice
          ? String(ipo.listingPrice)
          : ""
  )
  const [sharesSold, setSharesSold] = useState<string>(
    application.sharesSold ? String(application.sharesSold) : String(maxShares)
  )
  const [saleDate, setSaleDate] = useState<Date | undefined>(
    application.saleDate?.toDate?.() ?? new Date()
  )
  const [notes, setNotes] = useState(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numSalePrice = parseFloat(salePrice) || 0
  const numSharesSold = parseInt(sharesSold, 10) || 0

  // Live profit calculation
  const grossProfit = calculateRealizedGrossProfit(
    numSharesSold,
    numSalePrice,
    ipo.issuePrice
  )
  const profitSharePct = account?.profitSharePercent ?? 40
  const isMyAccount = account?.type === "my"
  const profitShared = calculateProfitShared(
    grossProfit,
    isMyAccount ? 0 : profitSharePct
  )
  const yourProfit = calculateYourProfit(
    grossProfit,
    isMyAccount ? 0 : profitSharePct
  )

  const handleFillCmp = () => {
    if (ipo.currentPrice) setSalePrice(String(ipo.currentPrice))
    else if (ipo.listingPrice) setSalePrice(String(ipo.listingPrice))
  }

  const handleAllShares = () => {
    setSharesSold(String(maxShares))
  }

  const handleHalfShares = () => {
    setSharesSold(String(Math.floor(maxShares / 2)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!numSalePrice || numSalePrice <= 0) {
      setError("Please enter a valid sale price greater than 0.")
      return
    }

    if (!numSharesSold || numSharesSold <= 0) {
      setError("Please enter valid shares sold (at least 1).")
      return
    }

    if (numSharesSold > maxShares) {
      setError(`Cannot sell more shares than allotted (${maxShares} shares).`)
      return
    }

    setError(null)
    setLoading(true)

    try {
      await recordSaleSingle(userId, application.id, {
        salePrice: numSalePrice,
        sharesSold: numSharesSold,
        saleDate: saleDate ? Timestamp.fromDate(saleDate) : undefined,
        notes: notes.trim(),
      })

      toast.add({
        title: "Sale recorded successfully",
        type: "success",
      })
      onSuccess()
      if (
        onOpenSettlement &&
        (account?.type === "other" || (account?.profitSharePercent ?? 0) > 0)
      ) {
        onOpenSettlement({
          ...application,
          status: "sold",
          salePrice: numSalePrice,
          sharesSold: numSharesSold,
          saleDate: saleDate
            ? Timestamp.fromDate(saleDate)
            : application.saleDate,
        })
      }
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to record sale. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return {
    maxShares,
    salePrice,
    setSalePrice,
    sharesSold,
    setSharesSold,
    saleDate,
    setSaleDate,
    notes,
    setNotes,
    loading,
    error,
    numSalePrice,
    numSharesSold,
    grossProfit,
    profitSharePct,
    isMyAccount,
    profitShared,
    yourProfit,
    handleFillCmp,
    handleAllShares,
    handleHalfShares,
    handleSubmit,
  }
}
