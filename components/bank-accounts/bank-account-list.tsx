"use client"

import { Landmark, Trash2 } from "lucide-react"
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
import { useBankAccountList } from "@/hooks/use-bank-account-list"
import { BankAccountCard } from "@/components/bank-accounts/bank-account-card"
import { BankAccountListHeader } from "@/components/bank-accounts/bank-account-list-header"
import { BankAccountAsbaAlert } from "@/components/bank-accounts/bank-account-asba-alert"
import { BankAccountTableView } from "@/components/bank-accounts/bank-account-table-view"
import type { BankAccount, Application, Ipo } from "@/types"

interface BankAccountListProps {
  bankAccounts: BankAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onEdit: (bankAccount: BankAccount) => void
  onRefresh: () => void
}

export function BankAccountList({
  bankAccounts,
  applications,
  ipos,
  userId,
  onEdit,
  onRefresh,
}: BankAccountListProps) {
  const {
    search,
    setSearch,
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    bankToDelete,
    setBankToDelete,
    deleting,
    sortedAccounts,
    archivedCount,
    handleToggleArchive,
    handleDelete,
    bankSummaryMap,
    exceededWarnings,
  } = useBankAccountList({ bankAccounts, applications, ipos, userId, onRefresh })

  return (
    <div className="flex flex-col gap-6">
      {/* ASBA Capital Limit Warning Banner */}
      <BankAccountAsbaAlert warnings={exceededWarnings} />

      {/* Controls Bar: Search, Archive Toggle & View Switcher */}
      <BankAccountListHeader
        search={search}
        onSearchChange={setSearch}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        archivedCount={archivedCount}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {sortedAccounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Landmark className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No bank accounts match your filter</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different search term"
                : "Add bank accounts to manage ASBA limits and fund IPO applications"}
            </EmptyDescription>
          </EmptyHeader>
          {search && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : viewMode === "table" ? (
        <BankAccountTableView
          bankAccounts={sortedAccounts}
          bankSummaryMap={bankSummaryMap}
          onEdit={onEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={(bank) => setBankToDelete(bank)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedAccounts.map((bank) => {
            const summary = bankSummaryMap.get(bank.id) || {
              totalApplied: 0,
              blockedAmount: 0,
              investedAmount: 0,
              activeApplicationsCount: 0,
              totalApplicationsCount: 0,
              relatedIpos: [],
            }

            return (
              <BankAccountCard
                key={bank.id}
                bank={bank}
                summary={summary}
                onEdit={() => onEdit(bank)}
                onToggleArchive={() => handleToggleArchive(bank)}
                onDelete={() => setBankToDelete(bank)}
              />
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(bankToDelete)}
        onOpenChange={(open) => !open && setBankToDelete(null)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete Bank Account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to permanently delete{" "}
                  <strong>{bankToDelete?.bankName}</strong>? This action cannot
                  be undone.
                </AlertDialogDescription>
              </div>
            </div>
            {Boolean(
              bankToDelete &&
                applications.some((a) => a.bankAccountId === bankToDelete.id)
            ) && (
              <p className="mt-2 rounded-none border border-warning/40 bg-warning/10 p-2.5 text-xs font-medium text-warning-foreground">
                ⚠️ Warning: This bank account has{" "}
                {
                  applications.filter(
                    (a) => a.bankAccountId === bankToDelete?.id
                  ).length
                }{" "}
                linked application(s). Deleting it will leave those applications
                without bank metadata. We strongly recommend archiving instead.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            {Boolean(
              bankToDelete &&
                applications.some((a) => a.bankAccountId === bankToDelete.id)
            ) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs"
                onClick={async () => {
                  if (bankToDelete) {
                    await handleToggleArchive(bankToDelete)
                    setBankToDelete(null)
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
              {deleting ? "Deleting..." : "Delete Bank Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
