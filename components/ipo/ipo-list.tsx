"use client"

import { FolderOpen, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useIpoList } from "@/hooks/use-ipo-list"
import { IpoCard } from "@/components/ipo/ipo-card"
import { IpoListFilters } from "@/components/ipo/ipo-list-filters"
import { IpoTableView } from "@/components/ipo/ipo-table-view"
import type { Ipo, Application } from "@/types"

interface IpoListProps {
  ipos: Ipo[]
  applications?: Application[]
  userId: string
  onEdit: (ipo: Ipo) => void
  onRefresh: () => void
}

export function IpoList({
  ipos,
  applications = [],
  userId,
  onEdit,
  onRefresh,
}: IpoListProps) {
  const {
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
  } = useIpoList({ ipos, applications, userId, onRefresh })

  return (
    <div className="flex flex-col gap-5">
      {/* Search, Filter Tabs, Type Select, Sort & View Modes */}
      <IpoListFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        statusCounts={statusCounts}
        totalFiltered={filteredIpos.length}
        onReset={resetFilters}
      />

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
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : viewMode === "table" ? (
        <IpoTableView
          ipos={sortedIpos}
          appCountMap={appCountMap}
          onEdit={onEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={(ipo) => setIpoToDelete(ipo)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedIpos.map((ipo) => (
            <IpoCard
              key={ipo.id}
              ipo={ipo}
              appCount={appCountMap.get(ipo.id) || 0}
              onEdit={() => onEdit(ipo)}
              onToggleArchive={() => handleToggleArchive(ipo)}
              onDelete={() => setIpoToDelete(ipo)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(ipoToDelete)}
        onOpenChange={(open) => !open && setIpoToDelete(null)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete IPO?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to permanently delete{" "}
                  <strong>{ipoToDelete?.name}</strong>?
                </AlertDialogDescription>
              </div>
            </div>
            {Boolean(
              ipoToDelete && (appCountMap.get(ipoToDelete.id) || 0) > 0
            )}
          </AlertDialogHeader>
          {Boolean(
            ipoToDelete && (appCountMap.get(ipoToDelete.id) || 0) > 0
          ) && (
            <div className="rounded-none border border-warning/40 bg-warning/10 p-2.5 text-xs font-medium text-warning-foreground">
              ⚠️ Warning: This IPO has {appCountMap.get(ipoToDelete!.id)}{" "}
              recorded application(s). Deleting it will permanently delete all
              associated applications too.
            </div>
          )}
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            {Boolean(
              ipoToDelete && (appCountMap.get(ipoToDelete.id) || 0) > 0
            ) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs"
                onClick={async () => {
                  if (ipoToDelete) {
                    await handleToggleArchive(ipoToDelete)
                    setIpoToDelete(null)
                  }
                }}
                disabled={deleting}
              >
                Archive Instead
              </Button>
            )}
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {deleting ? "Deleting..." : "Delete IPO & Applications"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
