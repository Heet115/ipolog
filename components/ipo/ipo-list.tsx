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
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
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

  const archivedCount = ipos.filter((i) => i.archived).length

  const handleToggleArchive = useCallback(async (ipo: Ipo) => {
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
  }, [userId, onRefresh])

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
        <div className="flex flex-col gap-0.5 min-w-0 max-w-[240px]">
          <Link
            href={`/ipos/${ipo.id}`}
            className="font-bold text-foreground hover:underline truncate block text-xs"
            title={ipo.name}
          >
            {ipo.name}
          </Link>
          {ipo.companyName && (
            <span
              className="text-[10px] text-muted-foreground truncate"
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
          className="text-[9px] uppercase px-1.5 py-0 font-mono"
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
        <span className="font-mono font-bold text-foreground text-xs">
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
          <span className="font-mono font-semibold text-xs text-foreground">
            {formatCurrency(ipo.lotSize * ipo.issuePrice)}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {ipo.lotSize} shares
          </span>
        </div>
      ),
    },
    {
      id: "dates",
      header: "Issue Dates",
      cell: (ipo) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
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
          <Badge variant={variant} className="text-[10px] px-1.5 py-0">
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
      sortFn: (a, b) => (appCountMap.get(a.id) || 0) - (appCountMap.get(b.id) || 0),
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
        if (!cmp) return <span className="text-muted-foreground text-xs">—</span>
        const gainPct = ((cmp - ipo.issuePrice) / ipo.issuePrice) * 100
        const isPos = gainPct >= 0
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono font-bold text-xs text-foreground">
              {formatCurrency(cmp)}
            </span>
            <span
              className={`text-[10px] font-mono font-semibold ${
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
  ], [appCountMap, onEdit, handleToggleArchive])

  return (
    <div className="flex flex-col gap-5">
      {/* Controls Bar: Search, Status Filters & View Toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Input */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search IPO name, company, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-background pl-8 text-xs"
          />
        </div>

        {/* Filters Group + View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mainboard vs SME Type Toggle */}
          <ToggleGroup
            value={[typeFilter]}
            onValueChange={(val) => {
              if (val && val[0]) setTypeFilter(val[0] as TypeFilter)
            }}
            className="h-8"
          >
            <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">
              All Types
            </ToggleGroupItem>
            <ToggleGroupItem value="mainboard" className="h-7 px-2.5 text-xs">
              Mainboard
            </ToggleGroupItem>
            <ToggleGroupItem value="sme" className="h-7 px-2.5 text-xs">
              SME
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Status Filters */}
          <ToggleGroup
            value={[statusFilter]}
            onValueChange={(val) => {
              if (val && val[0]) setStatusFilter(val[0] as StatusFilter)
            }}
            className="h-8"
          >
            <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">
              All ({ipos.filter((i) => !i.archived).length})
            </ToggleGroupItem>
            <ToggleGroupItem value="open" className="h-7 px-2.5 text-xs">
              Open
            </ToggleGroupItem>
            <ToggleGroupItem value="upcoming" className="h-7 px-2.5 text-xs">
              Upcoming
            </ToggleGroupItem>
            <ToggleGroupItem
              value="allotment_pending"
              className="h-7 px-2.5 text-xs"
            >
              Allotment
            </ToggleGroupItem>
            <ToggleGroupItem value="listed" className="h-7 px-2.5 text-xs">
              Listed
            </ToggleGroupItem>
            {archivedCount > 0 && (
              <ToggleGroupItem value="archived" className="h-7 px-2.5 text-xs">
                Archived ({archivedCount})
              </ToggleGroupItem>
            )}
          </ToggleGroup>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-none border border-border bg-background p-0.5 h-8">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
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
              className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
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
        </Empty>
      ) : viewMode === "table" ? (
        <DataTable
          data={filteredIpos}
          columns={tableColumns}
          keyExtractor={(ipo) => ipo.id}
          pageSize={12}
          bordered={true}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIpos.map((ipo) => {
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
                className={`relative flex flex-col justify-between border transition-all hover:border-foreground/40 hover:shadow-xs rounded-none ${
                  ipo.archived ? "opacity-60 bg-muted/20" : "bg-card"
                }`}
              >
                <CardContent className="flex flex-col gap-4 p-4.5">
                  {/* Top Bar: Badges & Dropdown Action Menu */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <Badge variant={variant} className="text-[10px] px-1.5 py-0">
                        {label}
                      </Badge>
                      <Badge
                        variant={ipo.type === "sme" ? "default" : "secondary"}
                        className="text-[9px] uppercase px-1.5 py-0 font-mono"
                      >
                        {ipo.type}
                      </Badge>
                      {appCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 flex items-center gap-1"
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
                            className="size-7 -mr-1.5 -mt-1.5 text-muted-foreground hover:text-foreground"
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
                      <h3 className="font-heading text-sm font-bold tracking-tight text-foreground transition-colors group-hover:underline truncate">
                        {ipo.name}
                      </h3>
                    </Link>
                    {ipo.companyName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {ipo.companyName}
                      </p>
                    )}
                  </div>

                  {/* Issue Metrics Strip */}
                  <div className="grid grid-cols-2 gap-2 border-y border-border/50 py-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Issue Price
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {formatCurrency(ipo.issuePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        1 Lot ({ipo.lotSize} shares)
                      </span>
                      <span className="font-bold text-foreground font-mono">
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
                        <span className="font-bold text-foreground font-mono">
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
                        <span className="text-[10px] text-muted-foreground block">
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
                      className="text-xs h-7"
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
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete IPO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
