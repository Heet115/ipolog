"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "@/lib/firebase/auth-context"
import { toast } from "@/components/ui/toast"
import type { ExternalIPO } from "@/lib/ipo/types"
import type { Ipo } from "@/types"

export type StatusTab = "open" | "upcoming" | "closed" | "listed"
export type IssueTypeFilter = "all" | "regular" | "sme"

interface UseImportIpoOptions {
  open: boolean
  existingIpos: Ipo[]
  onSuccess?: (importedIpoId?: string) => void
}

export function useImportIpo({
  open,
  existingIpos,
  onSuccess,
}: UseImportIpoOptions) {
  const { user } = useAuth()
  const [status, setStatus] = useState<StatusTab>("open")
  const [issueType, setIssueType] = useState<IssueTypeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [ipos, setIpos] = useState<ExternalIPO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const handleRefresh = useCallback(() => {
    setFetchTrigger((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!open) return
    let ignore = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          status,
        })
        if (issueType !== "all") {
          params.set("issue_type", issueType)
        }

        const res = await fetch(`/api/ipos/available?${params.toString()}`)
        const json = await res.json()

        if (!ignore) {
          if (!res.ok || !json.success) {
            setError(
              json.error ||
                "Unable to load IPO data right now. Please try again later."
            )
          } else {
            setIpos(json.data || [])
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load IPO data right now. Please try again later."
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [open, status, issueType, fetchTrigger])

  // Client-side search filter
  const filteredIpos = useMemo(() => {
    if (!searchQuery.trim()) return ipos
    const q = searchQuery.toLowerCase().trim()
    return ipos.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.symbol?.toLowerCase().includes(q) ||
        item.isin?.toLowerCase().includes(q) ||
        item.industry?.toLowerCase().includes(q)
      )
    })
  }, [ipos, searchQuery])

  // Fast duplicate lookup map
  const existingMap = useMemo(() => {
    const map = new Map<string, Ipo>()
    existingIpos.forEach((ipo) => {
      if (ipo.provider === "upstox" && ipo.externalId) {
        map.set(`upstox:${ipo.externalId}`, ipo)
      }
      // Also map normalized names as fallback duplicate prevention
      map.set(`name:${ipo.name.toLowerCase().trim()}`, ipo)
    })
    return map
  }, [existingIpos])

  // Count of tracked IPOs in current view
  const importedCount = useMemo(() => {
    return filteredIpos.filter((item) =>
      Boolean(
        existingMap.get(`upstox:${item.externalId}`) ||
        existingMap.get(`name:${item.name.toLowerCase().trim()}`)
      )
    ).length
  }, [filteredIpos, existingMap])

  const handleImportClick = async (externalIpo: ExternalIPO) => {
    if (!user) {
      toast.add({
        title: "Authentication Required",
        description: "Please sign in to import IPOs.",
        type: "error",
      })
      return
    }

    setImportingId(externalIpo.externalId)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/ipos/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalId: externalIpo.externalId,
          provider: "upstox",
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to import IPO.")
      }

      if (json.alreadyExists) {
        toast.add({
          title: "Already in My IPOs",
          description: `${externalIpo.name} is already in your tracker.`,
          type: "info",
        })
      } else {
        toast.add({
          title: "IPO Imported Successfully",
          description: `${externalIpo.name} has been added to your IPO list.`,
          type: "success",
        })
      }

      if (onSuccess) {
        onSuccess(json.ipo?.id)
      }
    } catch (err: unknown) {
      console.error("Failed to import IPO:", err)
      toast.add({
        title: "Import Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not import IPO. Please try again.",
        type: "error",
      })
    } finally {
      setImportingId(null)
    }
  }

  return {
    status,
    setStatus,
    issueType,
    setIssueType,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    importingId,
    filteredIpos,
    existingMap,
    importedCount,
    handleRefresh,
    handleImportClick,
  }
}
