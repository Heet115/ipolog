"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
  Search,
  Calendar,
  ExternalLink,
  Layers,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
        title: "Failed to update IPO archive state",
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
    <div className="space-y-4">
      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search IPOs by name, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mainboard vs SME Type Toggle */}
          <div className="flex items-center rounded-md border p-0.5 bg-muted/40">
            {[
              { key: "all", label: "All Types" },
              { key: "mainboard", label: "Mainboard" },
              { key: "sme", label: "SME" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  typeFilter === t.key
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTypeFilter(t.key as TypeFilter)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { key: "all", label: "All Active" },
                { key: "open", label: "Open" },
                { key: "upcoming", label: "Upcoming" },
                { key: "closed", label: "Closed" },
                { key: "listed", label: "Listed" },
                ...(archivedCount > 0
                  ? [
                      {
                        key: "archived" as const,
                        label: `Archived (${archivedCount})`,
                      },
                    ]
                  : []),
              ] as { key: StatusFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredIpos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium text-foreground">
              No matching IPOs found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Add your first IPO to start tracking applications"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredIpos.map((ipo) => {
            const ipoApps = applications.filter((a) => a.ipoId === ipo.id)

            return (
              <IpoCard
                key={ipo.id}
                ipo={ipo}
                applicationsCount={ipoApps.length}
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
      className={`group relative overflow-hidden transition-all hover:border-foreground/20 ${
        ipo.archived ? "opacity-60 bg-muted/20" : ""
      }`}
    >
      <CardContent className="flex flex-col justify-between p-3.5 h-full">
        <div className="space-y-3">
          {/* Top Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/ipos/${ipo.id}`}
                  className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
                >
                  {ipo.name}
                </Link>
                {ipo.archived && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    Archived
                  </Badge>
                )}
              </div>

              {ipo.companyName && (
                <p className="text-[11px] text-muted-foreground truncate">
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
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <MoreVertical className="size-3.5" />
                <span className="sr-only">IPO actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem render={<Link href={`/ipos/${ipo.id}`} />}>
                  <ExternalLink className="mr-2 size-3.5" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="mr-2 size-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
                  {ipo.archived ? (
                    <>
                      <ArchiveRestore className="mr-2 size-3.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 size-3.5" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges & Applications Tag */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant={ipo.type === "sme" ? "secondary" : "outline"}
                className="text-[10px] py-0 px-1.5 font-normal uppercase"
              >
                {ipo.type}
              </Badge>
              <Badge
                variant={statusInfo.variant}
                className="text-[10px] py-0 px-1.5 font-normal"
              >
                {statusInfo.label}
              </Badge>
            </div>

            {applicationsCount > 0 && (
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Layers className="size-3 text-muted-foreground" />
                {applicationsCount} Apps
              </span>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Issue Price
              </span>
              <span className="font-semibold text-foreground">
                {formatCurrency(ipo.issuePrice)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Lot Size
              </span>
              <span className="font-semibold text-foreground">
                {ipo.lotSize} shares
              </span>
            </div>
            <div className="col-span-2 pt-1 border-t border-border/50 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground">
                1 Lot Investment:
              </span>
              <span className="font-medium text-foreground text-xs">
                {formatCurrency(minAmount)}
              </span>
            </div>
          </div>

          {/* Market Price Tag if set */}
          {(ipo.listingPrice || ipo.currentPrice) && (
            <div className="flex items-center justify-between rounded bg-muted/30 p-1.5 text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
                {ipo.currentPrice ? "CMP:" : "Listing:"}
              </span>
              <span className="font-bold text-foreground">
                {formatCurrency(ipo.currentPrice || ipo.listingPrice)}
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal ml-1">
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

          {/* Dates */}
          {(ipo.closeDate || ipo.listingDate) && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
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

        {/* Footer CTA */}
        <div className="pt-3 mt-3 border-t">
          <Button
            variant="outline"
            size="xs"
            className="w-full text-xs"
            render={<Link href={`/ipos/${ipo.id}`} />}
          >
            Manage Applications ({applicationsCount})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
