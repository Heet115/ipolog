"use client"

import { useState } from "react"
import { Timestamp } from "firebase/firestore"
import { toast } from "@/components/ui/toast"
import { updateIpo } from "@/lib/firebase/ipos"
import { detectRegistrar } from "@/lib/utils/registrars"
import type { Ipo, IpoType } from "@/types"

interface UseIpoFormProps {
  userId: string
  ipoToEdit: Ipo
  onSuccess: (id?: string) => void
}

export function useIpoForm({ userId, ipoToEdit, onSuccess }: UseIpoFormProps) {
  const [name, setName] = useState(ipoToEdit?.name ?? "")
  const [companyName, setCompanyName] = useState(ipoToEdit?.companyName ?? "")
  const [type, setType] = useState<IpoType>(ipoToEdit?.type ?? "mainboard")
  const [issuePrice, setIssuePrice] = useState(
    ipoToEdit?.issuePrice !== undefined ? String(ipoToEdit.issuePrice) : ""
  )
  const [priceBandMin, setPriceBandMin] = useState(
    ipoToEdit?.priceBandMin !== undefined ? String(ipoToEdit.priceBandMin) : ""
  )
  const [priceBandMax, setPriceBandMax] = useState(
    ipoToEdit?.priceBandMax !== undefined ? String(ipoToEdit.priceBandMax) : ""
  )
  const [lotSize, setLotSize] = useState(
    ipoToEdit?.lotSize !== undefined ? String(ipoToEdit.lotSize) : ""
  )

  const [openDate, setOpenDate] = useState<Date | undefined>(
    ipoToEdit?.openDate?.toDate?.() ?? undefined
  )
  const [closeDate, setCloseDate] = useState<Date | undefined>(
    ipoToEdit?.closeDate?.toDate?.() ?? undefined
  )
  const [allotmentDate, setAllotmentDate] = useState<Date | undefined>(
    ipoToEdit?.allotmentDate?.toDate?.() ?? undefined
  )
  const [listingDate, setListingDate] = useState<Date | undefined>(
    ipoToEdit?.listingDate?.toDate?.() ?? undefined
  )
  const [registrar, setRegistrar] = useState(ipoToEdit?.registrar ?? "")
  const [registrarUrl, setRegistrarUrl] = useState(
    ipoToEdit?.registrarUrl ?? ""
  )
  const [notes, setNotes] = useState(ipoToEdit?.notes ?? "")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numIssuePrice = parseFloat(issuePrice) || 0
  const numLotSize = parseInt(lotSize, 10) || 0
  const minApplicationAmount = numIssuePrice * numLotSize

  const handleRegistrarChange = (val: string) => {
    setRegistrar(val)
    const detected = detectRegistrar(val)
    if (detected) {
      setRegistrarUrl(detected.checkUrl)
    }
  }

  const handleQuickRegistrarSelect = (regName: string, regCheckUrl: string) => {
    setRegistrar(regName)
    setRegistrarUrl(regCheckUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Please enter the IPO name.")
      return
    }

    if (!numIssuePrice || numIssuePrice <= 0) {
      setError("Please enter a valid issue price greater than 0.")
      return
    }

    if (!numLotSize || numLotSize <= 0) {
      setError("Please enter a valid lot size (at least 1 share).")
      return
    }

    if (priceBandMin && priceBandMax) {
      const min = parseFloat(priceBandMin)
      const max = parseFloat(priceBandMax)
      if (min > max) {
        setError("Price band floor cannot exceed cap.")
        return
      }
    }

    if (openDate && closeDate && openDate > closeDate) {
      setError("Open date cannot be after close date.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      await updateIpo(userId, ipoToEdit.id, {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        type,
        issuePrice: numIssuePrice,
        priceBandMin: priceBandMin ? parseFloat(priceBandMin) : undefined,
        priceBandMax: priceBandMax ? parseFloat(priceBandMax) : undefined,
        lotSize: numLotSize,
        openDate: openDate ? Timestamp.fromDate(openDate) : null,
        closeDate: closeDate ? Timestamp.fromDate(closeDate) : null,
        allotmentDate: allotmentDate ? Timestamp.fromDate(allotmentDate) : null,
        listingDate: listingDate ? Timestamp.fromDate(listingDate) : null,
        registrar: registrar.trim() || null,
        registrarUrl: registrarUrl.trim() || null,
        notes: notes.trim(),
      })
      toast.add({
        title: "IPO updated successfully",
        type: "success",
      })
      onSuccess(ipoToEdit.id)
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save IPO. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return {
    name,
    setName,
    companyName,
    setCompanyName,
    type,
    setType,
    issuePrice,
    setIssuePrice,
    priceBandMin,
    setPriceBandMin,
    priceBandMax,
    setPriceBandMax,
    lotSize,
    setLotSize,
    openDate,
    setOpenDate,
    closeDate,
    setCloseDate,
    allotmentDate,
    setAllotmentDate,
    listingDate,
    setListingDate,
    registrar,
    setRegistrar,
    registrarUrl,
    setRegistrarUrl,
    notes,
    setNotes,
    loading,
    error,
    numLotSize,
    minApplicationAmount,
    handleRegistrarChange,
    handleQuickRegistrarSelect,
    handleSubmit,
  }
}
