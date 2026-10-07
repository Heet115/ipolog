"use client"

import { CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency } from "@/lib/utils/ipo"
import { useBulkAllotment } from "@/hooks/use-bulk-allotment"
import { BulkAllotmentOverview } from "@/components/applications/bulk-allotment-overview"
import { BulkAllotmentTable } from "@/components/applications/bulk-allotment-table"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface BulkAllotmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function BulkAllotmentDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  bankAccounts,
  onSuccess,
}: BulkAllotmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <BulkAllotmentForm
          key={ipo.id}
          userId={userId}
          ipo={ipo}
          applications={applications}
          accounts={accounts}
          bankAccounts={bankAccounts}
          onClose={() => onOpenChange(false)}
          onSuccess={() => {
            onOpenChange(false)
            onSuccess()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function BulkAllotmentForm({
  userId,
  ipo,
  applications,
  accounts,
  bankAccounts,
  onClose,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onClose: () => void
  onSuccess: () => void
}) {
  const {
    accountMap,
    bankMap,
    rowStates,
    search,
    setSearch,
    sortColumn,
    sortDirection,
    toggleSort,
    loading,
    confirmResetOpen,
    setConfirmResetOpen,
    error,
    setStatus,
    setAllottedLots,
    handleAllAllotted,
    handleAllNotAllotted,
    handleResetToPending,
    sortedApps,
    stats,
    handleSubmit,
  } = useBulkAllotment({
    userId,
    ipo,
    applications,
    accounts,
    bankAccounts,
    onSuccess,
  })

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Update Allotment — {ipo.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record allotment status across applications and track invested
                vs refund capital
              </DialogDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="rounded-none font-mono text-xs uppercase"
          >
            {ipo.lotSize} sh/lot • {formatCurrency(ipo.issuePrice)}
          </Badge>
        </div>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Live Allotment Overview Card */}
      <BulkAllotmentOverview
        allottedCount={stats.allottedCount}
        soldCount={stats.soldCount}
        notAllottedCount={stats.notAllottedCount}
        pendingCount={stats.pendingCount}
        totalInvested={stats.totalInvested}
        totalRefund={stats.totalRefund}
        totalDecided={stats.totalDecided}
        successRate={stats.successRate}
        onAllAllotted={handleAllAllotted}
        onAllNotAllotted={handleAllNotAllotted}
        onOpenResetConfirm={() => setConfirmResetOpen(true)}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Sortable Allotment Table */}
      <BulkAllotmentTable
        sortedApps={sortedApps}
        accountMap={accountMap}
        bankMap={bankMap}
        rowStates={rowStates}
        ipo={ipo}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onToggleSort={toggleSort}
        onSetStatus={setStatus}
        onSetAllottedLots={setAllottedLots}
      />

      <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          size="sm"
          className="rounded-none text-xs"
        >
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? "Saving Allotments..." : "Save Allotments"}
        </Button>
      </DialogFooter>

      {/* Reset All Confirmation Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all allotments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all accounts back to pending
              status? Any customized allotment counts will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                handleResetToPending()
                setConfirmResetOpen(false)
              }}
              className="rounded-none text-xs"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
