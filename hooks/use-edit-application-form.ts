"use client"

import { useState } from "react"
import { Timestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"
import {
  updateApplication,
  deleteApplication,
} from "@/lib/firebase/applications"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import {
  getCategoryMinLots,
  validateCategoryLots,
  isShareBasedAllotment,
} from "@/lib/calculations/categories"
import type {
  Ipo,
  Application,
  ApplicationStatus,
  ApplicationCategory,
} from "@/types"

interface UseEditApplicationFormProps {
  userId: string
  ipo: Ipo
  application: Application
  onSuccess: () => void
}

export function useEditApplicationForm({
  userId,
  ipo,
  application,
  onSuccess,
}: UseEditApplicationFormProps) {
  const [bankAccountId, setBankAccountId] = useState(application.bankAccountId)
  const [category, setCategory] = useState<ApplicationCategory>(
    application.category || "retail"
  )
  const [lotsApplied, setLotsApplied] = useState(
    String(application.lotsApplied)
  )
  const [status, setStatus] = useState<ApplicationStatus>(application.status)
  const [allottedLots, setAllottedLots] = useState(
    application.allottedLots !== undefined
      ? String(application.allottedLots)
      : ""
  )
  const [allottedShares, setAllottedShares] = useState(
    application.allottedShares !== undefined
      ? String(application.allottedShares)
      : application.allottedLots !== undefined && application.allottedLots > 0
        ? String(application.allottedLots * ipo.lotSize)
        : ""
  )
  const isShareBased = isShareBasedAllotment(category)
  const [applicationDate, setApplicationDate] = useState<Date | undefined>(
    application.applicationDate?.toDate?.() ?? undefined
  )
  const [notes, setNotes] = useState(application.notes || "")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numLots = parseInt(lotsApplied, 10) || 1
  const sharesApplied = calculateSharesApplied(numLots, ipo.lotSize)
  const amountApplied = calculateAmountApplied(
    numLots,
    ipo.lotSize,
    ipo.issuePrice
  )
  const categoryValidation = validateCategoryLots(
    category,
    numLots,
    ipo.lotSize,
    ipo.issuePrice
  )

  const handleCategoryChange = (newCat: ApplicationCategory) => {
    setCategory(newCat)
    const minLots = getCategoryMinLots(newCat, ipo.lotSize, ipo.issuePrice)
    if (numLots < minLots) {
      setLotsApplied(String(minLots))
    }
    if (isShareBasedAllotment(newCat) && !allottedShares) {
      setAllottedShares(String(sharesApplied))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteApplication(userId, application.id)
      toast.add({
        title: "Application removed",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      toast.add({
        title: "Failed to remove application",
        type: "error",
      })
    } finally {
      setDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bankAccountId) {
      setError("Please select a bank account.")
      return
    }

    if (!numLots || numLots <= 0) {
      setError("Please enter a valid lot size (at least 1).")
      return
    }

    setError(null)
    setLoading(true)

    try {
      let finalAllottedLots: number | undefined
      let finalAllottedShares: number | undefined

      if (status === "allotted" || status === "sold") {
        if (isShareBased) {
          finalAllottedShares = parseInt(allottedShares, 10) || sharesApplied
          finalAllottedLots = 0
        } else {
          finalAllottedLots = parseInt(allottedLots, 10) || numLots
          finalAllottedShares = finalAllottedLots * ipo.lotSize
        }
      } else if (status === "not_allotted") {
        finalAllottedLots = 0
        finalAllottedShares = 0
      }

      await updateApplication(userId, application.id, {
        bankAccountId,
        category,
        lotsApplied: numLots,
        sharesApplied,
        amountApplied,
        status,
        allottedLots: finalAllottedLots,
        allottedShares: finalAllottedShares,
        applicationDate: applicationDate
          ? Timestamp.fromDate(applicationDate)
          : undefined,
        notes: notes.trim(),
      })

      toast.add({
        title: "Application updated successfully",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to update application. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return {
    bankAccountId,
    setBankAccountId,
    category,
    handleCategoryChange,
    lotsApplied,
    setLotsApplied,
    status,
    setStatus,
    allottedLots,
    setAllottedLots,
    allottedShares,
    setAllottedShares,
    isShareBased,
    applicationDate,
    setApplicationDate,
    notes,
    setNotes,
    loading,
    deleting,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    error,
    numLots,
    sharesApplied,
    amountApplied,
    categoryValidation,
    handleDelete,
    handleSubmit,
  }
}
