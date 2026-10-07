"use client"

import { CheckCircle2, Search, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { formatCurrency } from "@/lib/utils/ipo"
import { useCheckAllotment } from "@/hooks/use-check-allotment"
import { CheckAllotmentRegistrarBar } from "@/components/ipo/check-allotment-registrar-bar"
import { CheckAllotmentProgressBar } from "@/components/ipo/check-allotment-progress-bar"
import { CheckAllotmentItem } from "@/components/ipo/check-allotment-item"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface CheckAllotmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  onSuccess: () => void
}

export function CheckAllotmentDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  onSuccess,
}: CheckAllotmentDialogProps) {
  const {
    accountMap,
    selectedRegistrar,
    portalUrl,
    activeRegistrarMeta,
    handleSaveRegistrar,
    updatingAppId,
    isBulkUpdating,
    copiedKey,
    handleCopy,
    handleUpdateStatus,
    handleMarkAllPendingNotAllotted,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    filteredApplications,
    pendingCount,
    allottedCount,
    notAllottedCount,
    totalCount,
    verifiedCount,
    progressPercent,
  } = useCheckAllotment({
    userId,
    ipo,
    applications,
    accounts,
    onSuccess,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-3.5 p-5 sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate text-base font-bold">
                    Check Allotment — {ipo.name}
                  </DialogTitle>
                  {ipo.type && (
                    <Badge
                      variant={ipo.type === "sme" ? "default" : "secondary"}
                      className="shrink-0 px-1.5 py-0 font-mono text-[9px] uppercase"
                    >
                      {ipo.type}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs">
                  Verify allotment on the registrar portal with 1-click PAN &
                  Demat copy
                </DialogDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs">
              <Badge
                variant="outline"
                className="rounded-none px-2 py-0.5 text-[11px]"
              >
                Issue: {formatCurrency(ipo.issuePrice)}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-none px-2 py-0.5 text-[11px]"
              >
                {totalCount} {totalCount === 1 ? "App" : "Apps"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Section 1: Compact Registrar Bar */}
        <CheckAllotmentRegistrarBar
          selectedRegistrar={selectedRegistrar}
          activeRegistrarMeta={activeRegistrarMeta}
          portalUrl={portalUrl}
          onSaveRegistrar={handleSaveRegistrar}
        />

        {/* Section 2: Progress & Filter Bar */}
        <CheckAllotmentProgressBar
          verifiedCount={verifiedCount}
          totalCount={totalCount}
          progressPercent={progressPercent}
          pendingCount={pendingCount}
          allottedCount={allottedCount}
          notAllottedCount={notAllottedCount}
          isBulkUpdating={isBulkUpdating}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onMarkAllPendingNotAllotted={handleMarkAllPendingNotAllotted}
        />

        {/* Section 3: Search Bar */}
        <div className="flex items-center justify-between gap-2">
          <InputGroup className="h-8 flex-1">
            <InputGroupAddon align="inline-start">
              <Search className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by account name, PAN, DP ID, or app #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSearchQuery("")}
                  className="size-5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>

          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            Showing {filteredApplications.length} of {totalCount}
          </span>
        </div>

        {/* Section 4: Applications Cards List */}
        <div className="flex max-h-[420px] min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-none border border-dashed border-border/80 bg-muted/10 p-8 text-center">
              <Search className="size-6 text-muted-foreground/60" />
              <div className="text-xs font-semibold text-foreground">
                No applications match your filter
              </div>
              <p className="max-w-xs text-[11px] text-muted-foreground">
                Try clearing the search query or selecting &quot;All&quot; in
                the status filter.
              </p>
              {(searchQuery || statusFilter !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}
                  className="mt-1 text-xs"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            filteredApplications.map((app) => (
              <CheckAllotmentItem
                key={app.id}
                app={app}
                account={accountMap.get(app.accountId)}
                copiedKey={copiedKey}
                updatingAppId={updatingAppId}
                isBulkUpdating={isBulkUpdating}
                onCopy={handleCopy}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-mono text-[11px] text-muted-foreground">
            {verifiedCount} of {totalCount} applications verified (
            {progressPercent}%)
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="rounded-none text-xs"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
