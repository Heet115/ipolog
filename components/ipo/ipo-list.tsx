"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  Calendar,
  ExternalLink,
  Layers,
  TrendingUp,
  FolderOpen,
  LayoutGrid,
  Table as TableIcon,
  X,
  ArrowUpDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocalStorage } from "@/hooks/use-local-storage"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { toast } from "@/components/ui/toast"
import { archiveIpo, deleteIpo } from "@/lib/firebase/ipos"
import { getIpoStatus, formatCurrency, formatDate } from "@/lib/utils/ipo"
import type { Ipo, Application, IpoType } from "@/types"

interface IpoListProps {
  ipos: Ipo[]
  applications?: Application[]
  userId: string
  onEdit: (ipo: Ipo) => void
  onRefresh: () => void
}

type StatusFilter =
  | "all"
  | "open"
  | "upcoming"
  | "allotment_pending"
  | "closed"
  | "listed"
  | "archived"

type TypeFilter = "all" | IpoType

export type IpoSortOption =
  | "close_date_asc"
  | "close_date_desc"
  | "open_date_desc"
  | "open_date_asc"
  | "name_asc"
  | "name_desc"
  | "price_desc"
  | "price_asc"
  | "created_desc"
  | "created_asc"

export const IPO_SORT_LABELS: Record<IpoSortOption, string> = {
  close_date_asc: "Closing Soonest",
  close_date_desc: "Closing Latest",
  open_date_desc: "Opening Latest",
  open_date_asc: "Opening Earliest",
  name_asc: "Name (A → Z)",
  name_desc: "Name (Z → A)",
  price_desc: "Price (High → Low)",
  price_asc: "Price (Low → High)",
  created_desc: "Recently Added",
  created_asc: "Oldest First",
}

export function IpoList({
  ipos,
  applications = [],
  userId,
  onEdit,
  onRefresh,
}: IpoListProps) {
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

  const filteredIpos = ipos.filter((ipo) => {
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

  const handleDelete = async () => {
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
  }

  // Table Columns for Table View
  const tableColumns: DataTableColumn<Ipo>[] = useMemo(
    () => [
      {
        id: "name",
        header: "IPO / Company",
        sortable: true,
        sortFn: (a, b) => a.name.localeCompare(b.name),
        cell: (ipo) => (
          <div className="flex max-w-[240px] min-w-0 flex-col gap-0.5">
            <Link
              href={`/ipos/${ipo.id}`}
              className="block truncate text-xs font-bold text-foreground hover:underline"
              title={ipo.name}
            >
              {ipo.name}
            </Link>
            {ipo.companyName && (
              <span
                className="truncate text-[10px] text-muted-foreground"
                title={ipo.companyName}
              >
                {ipo.companyName}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        align: "center",
        sortable: true,
        sortFn: (a, b) => a.type.localeCompare(b.type),
        cell: (ipo) => (
          <Badge
            variant={ipo.type === "sme" ? "default" : "secondary"}
            className="px-1.5 py-0 font-mono text-[9px] uppercase"
          >
            {ipo.type}
          </Badge>
        ),
      },
      {
        id: "price",
        header: "Price",
        align: "right",
        sortable: true,
        sortFn: (a, b) => a.issuePrice - b.issuePrice,
        cell: (ipo) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {formatCurrency(ipo.issuePrice)}
          </span>
        ),
      },
      {
        id: "lot",
        header: "Lot / 1-Lot Mandate",
        align: "right",
        sortable: true,
        sortFn: (a, b) => a.lotSize * a.issuePrice - b.lotSize * b.issuePrice,
        cell: (ipo) => (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-xs font-semibold text-foreground">
              {formatCurrency(ipo.lotSize * ipo.issuePrice)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {ipo.lotSize} shares
            </span>
          </div>
        ),
      },
      {
        id: "dates",
        header: "Issue Dates",
        cell: (ipo) => (
          <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>
              {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)}
            </span>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        align: "center",
        cell: (ipo) => {
          const { label, variant } = getIpoStatus(ipo)
          return (
            <Badge variant={variant} className="px-1.5 py-0 text-[10px]">
              {label}
            </Badge>
          )
        },
      },
      {
        id: "apps",
        header: "Apps",
        align: "center",
        sortable: true,
        sortFn: (a, b) =>
          (appCountMap.get(a.id) || 0) - (appCountMap.get(b.id) || 0),
        cell: (ipo) => {
          const count = appCountMap.get(ipo.id) || 0
          return (
            <span className="font-mono text-xs font-semibold text-foreground">
              {count}
            </span>
          )
        },
      },
      {
        id: "cmp",
        header: "Market / Gain",
        align: "right",
        cell: (ipo) => {
          const cmp = ipo.currentPrice || ipo.listingPrice
          if (!cmp)
            return <span className="text-xs text-muted-foreground">—</span>
          const gainPct = ((cmp - ipo.issuePrice) / ipo.issuePrice) * 100
          const isPos = gainPct >= 0
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-xs font-bold text-foreground">
                {formatCurrency(cmp)}
              </span>
              <span
                className={`font-mono text-[10px] font-semibold ${
                  isPos ? "text-success" : "text-destructive"
                }`}
              >
                {isPos ? "+" : ""}
                {gainPct.toFixed(1)}%
              </span>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (ipo) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href={`/ipos/${ipo.id}`} />}>
                  <ExternalLink data-icon="inline-start" />
                  View Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(ipo)}>
                  <Edit2 data-icon="inline-start" />
                  Edit IPO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleArchive(ipo)}>
                  {ipo.archived ? (
                    <>
                      <ArchiveRestore data-icon="inline-start" />
                      Restore IPO
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive IPO
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIpoToDelete(ipo)}
                >
                  <Trash2 data-icon="inline-start" />
                  Delete IPO
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [appCountMap, onEdit, handleToggleArchive]
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Tier 1: Lifecycle Stage Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusFilter === "all"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusFilter === "all"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("open")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusFilter === "open"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0",
              statusCounts.open > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
            )}
          />
          <span>Open</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusFilter === "open"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.open}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("upcoming")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusFilter === "upcoming"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Upcoming</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusFilter === "upcoming"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.upcoming}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("allotment_pending")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusFilter === "allotment_pending"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Allotment</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusFilter === "allotment_pending"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.allotment}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("listed")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusFilter === "listed"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Listed</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusFilter === "listed"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.listed}
          </span>
        </button>

        {statusCounts.archived > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter("archived")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
              statusFilter === "archived"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>Archived</span>
            <span
              className={cn(
                "px-1.5 py-0.2 font-mono text-[10px]",
                statusFilter === "archived"
                  ? "bg-background/25 text-background font-bold"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {statusCounts.archived}
            </span>
          </button>
        )}
      </div>

      {/* Tier 2: Search, Type Filter, Sort & View Modes */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Search + Type Select + Reset */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="w-full sm:w-60 md:w-72">
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search IPO, company, notes..."
                aria-label="Search IPOs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          {/* Type Filter Select */}
          <Select
            value={typeFilter}
            onValueChange={(val) => val && setTypeFilter(val as TypeFilter)}
          >
            <SelectTrigger
              className="h-8 w-[130px] gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-medium"
              aria-label="Filter by Type"
            >
              <Layers className="size-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="All Types">
                {(val) =>
                  val === "mainboard"
                    ? "Mainboard"
                    : val === "sme"
                      ? "SME"
                      : "All Types"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[130px]">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mainboard">Mainboard</SelectItem>
              <SelectItem value="sme">SME</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters (shown when active) */}
          {(search || typeFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setTypeFilter("all")
                setStatusFilter("all")
              }}
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right: Count + Sort Dropdown + View Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <span className="hidden text-[11px] font-mono text-muted-foreground lg:inline">
            {filteredIpos.length} {filteredIpos.length === 1 ? "IPO" : "IPOs"}
          </span>

          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(val) => val && setSortBy(val as IpoSortOption)}
          >
            <SelectTrigger
              className="h-8 w-[165px] gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-medium"
              aria-label="Sort IPOs"
            >
              <ArrowUpDown className="size-3 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Sort by">
                {(val) => IPO_SORT_LABELS[val as IpoSortOption] || "Sort"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[175px]">
              {Object.entries(IPO_SORT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Mode Toggle */}
          <div className="flex h-8 items-center rounded-none border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Grid vs Unified DataTable */}
      {filteredIpos.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No IPOs match your filters</EmptyTitle>
            <EmptyDescription>
              {search || statusFilter !== "all" || typeFilter !== "all"
                ? "Try clearing your filters or changing your search criteria"
                : "Add an IPO to begin tracking multi-account applications"}
            </EmptyDescription>
          </EmptyHeader>
          {(search || statusFilter !== "all" || typeFilter !== "all") && (
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setStatusFilter("all")
                  setTypeFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : viewMode === "table" ? (
        <DataTable
          data={sortedIpos}
          columns={tableColumns}
          keyExtractor={(ipo) => ipo.id}
          pageSize={12}
          bordered={true}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedIpos.map((ipo) => {
            const { label, variant } = getIpoStatus(ipo)
            const appCount = appCountMap.get(ipo.id) || 0
            const lotAmount = ipo.lotSize * ipo.issuePrice

            const hasCmp = Boolean(ipo.currentPrice || ipo.listingPrice)
            const cmp = ipo.currentPrice || ipo.listingPrice || 0
            const gainPerShare = cmp - ipo.issuePrice
            const gainPercent =
              ipo.issuePrice > 0 ? (gainPerShare / ipo.issuePrice) * 100 : 0
            const gainPerLot = gainPerShare * ipo.lotSize

            return (
              <Card
                key={ipo.id}
                className={`relative flex flex-col justify-between rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs ${
                  ipo.archived ? "bg-muted/20 opacity-60" : "bg-card"
                }`}
              >
                <CardContent className="flex flex-col gap-4 p-4.5">
                  {/* Top Bar: Badges & Dropdown Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Badge
                        variant={variant}
                        className="px-1.5 py-0 text-[10px]"
                      >
                        {label}
                      </Badge>
                      <Badge
                        variant={ipo.type === "sme" ? "default" : "secondary"}
                        className="px-1.5 py-0 font-mono text-[9px] uppercase"
                      >
                        {ipo.type}
                      </Badge>
                      {appCount > 0 && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 px-1.5 py-0 text-[10px]"
                        >
                          <Layers className="size-2.5" />
                          {appCount} {appCount === 1 ? "App" : "Apps"}
                        </Badge>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="-mt-1.5 -mr-1.5 size-7 text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <MoreVertical className="size-3.5" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            render={<Link href={`/ipos/${ipo.id}`} />}
                          >
                            <ExternalLink data-icon="inline-start" />
                            View Workspace
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(ipo)}>
                            <Edit2 data-icon="inline-start" />
                            Edit IPO
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleArchive(ipo)}
                          >
                            {ipo.archived ? (
                              <>
                                <ArchiveRestore data-icon="inline-start" />
                                Restore IPO
                              </>
                            ) : (
                              <>
                                <Archive data-icon="inline-start" />
                                Archive IPO
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setIpoToDelete(ipo)}
                          >
                            <Trash2 data-icon="inline-start" />
                            Delete IPO
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title & Company Name */}
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/ipos/${ipo.id}`}
                      className="group flex items-center gap-1.5"
                    >
                      <h3 className="truncate font-heading text-sm font-bold tracking-tight text-foreground transition-colors group-hover:underline">
                        {ipo.name}
                      </h3>
                    </Link>
                    {ipo.companyName && (
                      <p className="truncate text-xs text-muted-foreground">
                        {ipo.companyName}
                      </p>
                    )}
                  </div>

                  {/* Issue Metrics Strip */}
                  <div className="grid grid-cols-2 gap-2 border-y border-border/50 py-2.5 text-xs">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Issue Price
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(ipo.issuePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        1 Lot ({ipo.lotSize} shares)
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(lotAmount)}
                      </span>
                    </div>
                  </div>

                  {/* CMP / Listing Gain Block */}
                  {hasCmp && (
                    <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="size-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {ipo.currentPrice ? "CMP" : "Listing"}:
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrency(cmp)}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span
                          className={`text-xs font-bold ${
                            gainPercent >= 0
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {gainPercent >= 0 ? "+" : ""}
                          {gainPercent.toFixed(1)}%
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          ({gainPerLot >= 0 ? "+" : ""}
                          {formatCurrency(gainPerLot)}/lot)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Footer: Dates & Workspace Action */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="size-3 shrink-0" />
                      <span>
                        {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)}
                      </span>
                    </div>

                    <Button
                      size="xs"
                      variant="outline"
                      className="h-7 rounded-none text-xs"
                      nativeButton={false}
                      render={<Link href={`/ipos/${ipo.id}`} />}
                    >
                      Workspace
                      <ExternalLink data-icon="inline-end" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete IPO Confirmation Dialog */}
      <AlertDialog
        open={Boolean(ipoToDelete)}
        onOpenChange={(open) => !open && setIpoToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IPO?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{ipoToDelete?.name}</strong>? All linked application
              records and profit logs will also be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-none text-xs"
            >
              {deleting ? "Deleting..." : "Delete IPO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
