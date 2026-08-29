"use client"

import { useState } from "react"
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
  const [ipoToDelete, setIpoToDelete] = useState<Ipo | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Map application counts per IPO
  const appCountMap = new Map<string, number>()
  for (const app of applications) {
    appCountMap.set(app.ipoId, (appCountMap.get(app.ipoId) || 0) + 1)
  }

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

  const handleToggleArchive = async (ipo: Ipo) => {
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
  }

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

  return (
    <div className="flex flex-col gap-5">
      {/* Controls Bar: Search & Status Filters */}
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

        {/* Filters Group */}
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
        </div>
      </div>

      {/* Grid of IPO Cards */}
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIpos.map((ipo) => {
            const count = appCountMap.get(ipo.id) || 0
            return (
              <IpoCard
                key={ipo.id}
                ipo={ipo}
                applicationsCount={count}
                onEdit={() => onEdit(ipo)}
                onToggleArchive={() => handleToggleArchive(ipo)}
                onDelete={() => setIpoToDelete(ipo)}
              />
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
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
              records will also be removed.
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

function IpoCard({
  ipo,
  applicationsCount = 0,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  ipo: Ipo
  applicationsCount?: number
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  const statusInfo = getIpoStatus(ipo)
  const minAmount = ipo.issuePrice * ipo.lotSize

  return (
    <Card
      className={`group relative overflow-hidden rounded-none border border-border/70 transition-all hover:border-foreground/30 ${
        ipo.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex h-full flex-col justify-between gap-3.5 p-4">
        <div className="flex flex-col gap-3">
          {/* Top Header: Name & Menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/ipos/${ipo.id}`}
                  className="truncate text-sm font-bold text-foreground hover:underline"
                >
                  {ipo.name}
                </Link>
                {ipo.archived && (
                  <Badge
                    variant="outline"
                    className="px-1 py-0 font-mono text-[10px]"
                  >
                    Archived
                  </Badge>
                )}
              </div>

              {ipo.companyName && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {ipo.companyName}
                </p>
              )}
            </div>

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
                <span className="sr-only">IPO actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link href={`/ipos/${ipo.id}`} />}>
                    <ExternalLink data-icon="inline-start" />
                    Open IPO
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 data-icon="inline-start" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleArchive}>
                    {ipo.archived ? (
                      <>
                        <ArchiveRestore data-icon="inline-start" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive data-icon="inline-start" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 data-icon="inline-start" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges & Application Count */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={ipo.type === "sme" ? "outline" : "secondary"}
                className="px-1 py-0 font-mono text-[9px] uppercase"
              >
                {ipo.type}
              </Badge>
              <Badge
                variant={statusInfo.variant}
                className="px-1.5 py-0 text-[9px] font-normal"
              >
                {statusInfo.label}
              </Badge>
            </div>

            {applicationsCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                <Layers className="size-3 text-muted-foreground" />
                {applicationsCount} Apps
              </span>
            )}
          </div>

          {/* Pricing & Lots Metric Grid */}
          <div className="grid grid-cols-2 gap-2 rounded-none border border-border/50 bg-muted/40 p-2.5 text-xs">
            <div>
              <span className="block text-[10px] text-muted-foreground">
                Issue Price
              </span>
              <span className="font-mono font-semibold text-foreground">
                {formatCurrency(ipo.issuePrice)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground">
                Lot Size
              </span>
              <span className="font-mono font-semibold text-foreground">
                {ipo.lotSize} sh/lot
              </span>
            </div>
            <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-1 text-[11px]">
              <span className="text-muted-foreground">1-Lot Mandate:</span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(minAmount)}
              </span>
            </div>
          </div>

          {/* Market Price / Performance Badge if set */}
          {(ipo.listingPrice || ipo.currentPrice) && (
            <div className="flex items-center justify-between rounded-none border border-border/40 bg-muted/30 p-2 text-xs">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="size-3 text-success" />
                {ipo.currentPrice ? "CMP:" : "Listing Price:"}
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(ipo.currentPrice || ipo.listingPrice)}
                <span className="ml-1 font-mono text-[10px] font-normal text-success">
                  (
                  {(
                    (((ipo.currentPrice || ipo.listingPrice || 0) -
                      ipo.issuePrice) /
                      ipo.issuePrice) *
                    100
                  ).toFixed(1)}
                  %)
                </span>
              </span>
            </div>
          )}

          {/* Key Dates */}
          {(ipo.closeDate || ipo.listingDate) && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Calendar className="size-3 shrink-0" />
              {ipo.closeDate && (
                <span>Closes: {formatDate(ipo.closeDate)}</span>
              )}
              {ipo.closeDate && ipo.listingDate && <span>•</span>}
              {ipo.listingDate && (
                <span>Listing: {formatDate(ipo.listingDate)}</span>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="border-t border-border/50 pt-2">
          <Button
            variant="outline"
            size="xs"
            className="h-8 w-full text-xs"
            render={<Link href={`/ipos/${ipo.id}`} />}
          >
            Manage Applications ({applicationsCount})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
