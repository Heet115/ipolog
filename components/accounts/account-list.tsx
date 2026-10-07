"use client"

import { Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useAccountList } from "@/hooks/use-account-list"
import { AccountCard } from "@/components/accounts/account-card"
import { AccountListHeader } from "@/components/accounts/account-list-header"
import { AccountReorderPanel } from "@/components/accounts/account-reorder-panel"
import { AccountTableView } from "@/components/accounts/account-table-view"
import { calculateAccountMoneySummary } from "@/lib/calculations/financials"
import type { ApplicationAccount, Application, Ipo } from "@/types"

interface AccountListProps {
  accounts: ApplicationAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onEdit: (account: ApplicationAccount) => void
  onRefresh: () => void
}

export function AccountList({
  accounts,
  applications,
  ipos,
  userId,
  onEdit,
  onRefresh,
}: AccountListProps) {
  const {
    search,
    setSearch,
    showArchived,
    setShowArchived,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    accountToDelete,
    setAccountToDelete,
    deleting,
    reorderMode,
    reorderedAccounts,
    savingOrder,
    draggedIndex,
    setDraggedIndex,
    dragOverIndex,
    setDragOverIndex,
    filteredAccounts,
    myAccounts,
    otherAccounts,
    archivedCount,
    isDirty,
    enterReorderMode,
    cancelReorderMode,
    moveAccount,
    moveToExtreme,
    moveAccountToIndex,
    applyPresetAZ,
    applyPresetZA,
    applyPresetMyFirst,
    applyPresetCreationOrder,
    saveOrder,
    resetToDefault,
    handleQuickMove,
    handleToggleArchive,
    handleDelete,
    handleSettleAll,
    accountSummaryMap,
  } = useAccountList({ accounts, applications, ipos, userId, onRefresh })

  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const activeAccountsCount = accounts.filter((a) => !a.archived).length

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar: Search, Archive Toggle, Reorder & View Switcher */}
      <AccountListHeader
        search={search}
        onSearchChange={setSearch}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        archivedCount={archivedCount}
        hasActiveAccounts={activeAccountsCount > 1}
        reorderMode={reorderMode}
        onEnterReorderMode={enterReorderMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {reorderMode ? (
        <AccountReorderPanel
          reorderedAccounts={reorderedAccounts}
          isDirty={isDirty}
          savingOrder={savingOrder}
          draggedIndex={draggedIndex}
          dragOverIndex={dragOverIndex}
          setDraggedIndex={setDraggedIndex}
          setDragOverIndex={setDragOverIndex}
          cancelReorderMode={cancelReorderMode}
          saveOrder={saveOrder}
          applyPresetMyFirst={applyPresetMyFirst}
          applyPresetAZ={applyPresetAZ}
          applyPresetZA={applyPresetZA}
          applyPresetCreationOrder={applyPresetCreationOrder}
          resetToDefault={resetToDefault}
          moveAccountToIndex={moveAccountToIndex}
          moveAccount={moveAccount}
          moveToExtreme={moveToExtreme}
        />
      ) : filteredAccounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No accounts match your filter</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different search term"
                : "Add application accounts to start recording applications"}
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
        <AccountTableView
          accounts={filteredAccounts}
          hasMultipleActiveAccounts={activeAccountsCount > 1}
          accountSummaryMap={accountSummaryMap}
          onEdit={onEdit}
          onToggleArchive={handleToggleArchive}
          onDelete={(account) => setAccountToDelete(account)}
          onSettleAll={handleSettleAll}
          onQuickMove={handleQuickMove}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* My Accounts Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                My Accounts ({myAccounts.length})
              </h2>
              <Badge
                variant="secondary"
                className="px-1 py-0 font-mono text-[10px]"
              >
                100% Profit Retention
              </Badge>
            </div>

            {myAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No personal accounts configured.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myAccounts.map((account) => {
                  const summary = calculateAccountMoneySummary(
                    account.id,
                    applications,
                    ipoMap,
                    account
                  )

                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      summary={summary}
                      onEdit={() => onEdit(account)}
                      onToggleArchive={() => handleToggleArchive(account)}
                      onDelete={() => setAccountToDelete(account)}
                      onQuickMove={(target) => handleQuickMove(account, target)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Other / Investor Accounts Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Other / Family Accounts ({otherAccounts.length})
              </h2>
              <Badge
                variant="outline"
                className="px-1 py-0 font-mono text-[10px]"
              >
                Profit Sharing Active
              </Badge>
            </div>

            {otherAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No family/investor accounts configured.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherAccounts.map((account) => {
                  const summary = calculateAccountMoneySummary(
                    account.id,
                    applications,
                    ipoMap,
                    account
                  )

                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      summary={summary}
                      onEdit={() => onEdit(account)}
                      onToggleArchive={() => handleToggleArchive(account)}
                      onDelete={() => setAccountToDelete(account)}
                      onSettleAll={() => handleSettleAll(account)}
                      onQuickMove={(target) => handleQuickMove(account, target)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete Application Account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to permanently delete{" "}
                  <strong>{accountToDelete?.name}</strong>? This action cannot
                  be undone.
                </AlertDialogDescription>
              </div>
            </div>
            {Boolean(
              accountToDelete &&
                applications.some((a) => a.accountId === accountToDelete.id)
            ) && (
              <p className="mt-2 rounded-none border border-warning/40 bg-warning/10 p-2.5 text-xs font-medium text-warning-foreground">
                ⚠️ Warning: This account has{" "}
                {
                  applications.filter(
                    (a) => a.accountId === accountToDelete?.id
                  ).length
                }{" "}
                linked application(s). Deleting it will leave those applications
                without account metadata. We strongly recommend archiving
                instead.
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
              accountToDelete &&
                applications.some((a) => a.accountId === accountToDelete.id)
            ) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs"
                onClick={async () => {
                  if (accountToDelete) {
                    await handleToggleArchive(accountToDelete)
                    setAccountToDelete(null)
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
              {deleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
