"use client"

import { useState, useMemo, useCallback } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { toast } from "@/components/ui/toast"
import { archiveIpo, deleteIpo } from "@/lib/firebase/ipos"
import { getIpoStatus } from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  StatusFilter,
  TypeFilter,
  IpoSortOption,
} from "@/types"

interface UseIpoListProps {
  ipos: Ipo[]
  applications?: Application[]
  userId: string
  onRefresh: () => void
}

export function useIpoList({
  ipos,
  applications = [],
  userId,
  onRefresh,
}: UseIpoListProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "table">(
    "ipolog:ipo-view-mode",
    "grid"
  )
  const [sortBy, setSortBy] = useLocalStorage<IpoSortOption>(
    "ipolog:ipo-grid-sort",
    "close_date_asc"
  )
  const [ipoToDelete, setIpoToDelete] = useState<Ipo | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Map application counts per IPO
  const appCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const app of applications) {
      map.set(app.ipoId, (map.get(app.ipoId) || 0) + 1)
    }
    return map
  }, [applications])

  const filteredIpos = useMemo(() => {
    return ipos.filter((ipo) => {
      // Archived filter logic
      if (statusFilter === "archived") {
        if (!ipo.archived) return false
      } else {
        if (ipo.archived) return false
      }

      // Type filter
      if (typeFilter !== "all" && ipo.type !== typeFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== "all" && statusFilter !== "archived") {
        const derived = getIpoStatus(ipo)
        if (derived.status !== statusFilter) return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          ipo.name.toLowerCase().includes(q) ||
          (ipo.companyName && ipo.companyName.toLowerCase().includes(q)) ||
          (ipo.notes && ipo.notes.toLowerCase().includes(q))
        )
      }

      return true
    })
  }, [ipos, statusFilter, typeFilter, search])

  // Sort IPOs for Grid (and initial Table) display
  const sortedIpos = useMemo(() => {
    const list = [...filteredIpos]
    list.sort((a, b) => {
      switch (sortBy) {
        case "close_date_asc": {
          const timeA = a.closeDate?.toMillis?.() ?? Number.MAX_SAFE_INTEGER
          const timeB = b.closeDate?.toMillis?.() ?? Number.MAX_SAFE_INTEGER
          return timeA - timeB
        }
        case "close_date_desc": {
          const timeA = a.closeDate?.toMillis?.() ?? 0
          const timeB = b.closeDate?.toMillis?.() ?? 0
          return timeB - timeA
        }
        case "open_date_desc": {
          const timeA = a.openDate?.toMillis?.() ?? 0
          const timeB = b.openDate?.toMillis?.() ?? 0
          return timeB - timeA
        }
        case "open_date_asc": {
          const timeA = a.openDate?.toMillis?.() ?? Number.MAX_SAFE_INTEGER
          const timeB = b.openDate?.toMillis?.() ?? Number.MAX_SAFE_INTEGER
          return timeA - timeB
        }
        case "name_asc":
          return a.name.localeCompare(b.name)
        case "name_desc":
          return b.name.localeCompare(a.name)
        case "price_desc":
          return (b.issuePrice || 0) - (a.issuePrice || 0)
        case "price_asc":
          return (a.issuePrice || 0) - (b.issuePrice || 0)
        case "created_asc": {
          const timeA = a.createdAt?.toMillis?.() ?? 0
          const timeB = b.createdAt?.toMillis?.() ?? 0
          return timeA - timeB
        }
        case "created_desc":
        default: {
          const timeA = a.createdAt?.toMillis?.() ?? 0
          const timeB = b.createdAt?.toMillis?.() ?? 0
          return timeB - timeA
        }
      }
    })
    return list
  }, [filteredIpos, sortBy])

  const statusCounts = useMemo(() => {
    let all = 0
    let open = 0
    let upcoming = 0
    let allotment = 0
    let listed = 0
    let archived = 0

    for (const ipo of ipos) {
      if (ipo.archived) {
        archived++
        continue
      }
      all++
      const derived = getIpoStatus(ipo).status
      if (derived === "open") open++
      else if (derived === "upcoming") upcoming++
      else if (derived === "allotment_pending") allotment++
      else if (derived === "listed") listed++
    }

    return { all, open, upcoming, allotment, listed, archived }
  }, [ipos])

  const handleToggleArchive = useCallback(
    async (ipo: Ipo) => {
      try {
        await archiveIpo(userId, ipo.id, !ipo.archived)
        toast.add({
          title: ipo.archived ? "IPO restored" : "IPO archived",
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({
          title: "Failed to update IPO",
          type: "error",
        })
      }
    },
    [userId, onRefresh]
  )

  const handleDelete = useCallback(async () => {
    if (!ipoToDelete) return
    setDeleting(true)
    try {
      await deleteIpo(userId, ipoToDelete.id)
      toast.add({
        title: "IPO deleted",
        type: "success",
      })
      setIpoToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete IPO",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }, [ipoToDelete, userId, onRefresh])

  const resetFilters = useCallback(() => {
    setSearch("")
    setTypeFilter("all")
    setStatusFilter("all")
  }, [])

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    ipoToDelete,
    setIpoToDelete,
    deleting,
    appCountMap,
    filteredIpos,
    sortedIpos,
    statusCounts,
    handleToggleArchive,
    handleDelete,
    resetFilters,
  }
}
