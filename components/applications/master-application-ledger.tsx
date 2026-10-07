"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Layers } from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { useMasterLedger } from "@/hooks/use-master-ledger"
import { LedgerMetricsStrip } from "@/components/applications/ledger-metrics-strip"
import { LedgerFilters } from "@/components/applications/ledger-filters"
import { getLedgerColumns } from "@/components/applications/ledger-columns"
import { LedgerBulkDialogs } from "@/components/applications/ledger-bulk-dialogs"
import { formatCurrency } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface MasterApplicationLedgerProps {
  ipos: Ipo[]
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  userId: string
  onRefresh: () => void
}

export function MasterApplicationLedger({
  ipos,
  applications,
  accounts,
  bankAccounts,
  userId,
  onRefresh,
}: MasterApplicationLedgerProps) {
  const {
    selectedIpoId,
    setSelectedIpoId,
    selectedAccountId,
    setSelectedAccountId,
    selectedBankId,
    setSelectedBankId,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedIds,
    setSelectedIds,
    bulkDeleting,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bankDialogOpen,
    setBankDialogOpen,
    targetBankId,
    setTargetBankId,
    updatingBank,
    updatingStatus,
    appToDelete,
    setAppToDelete,
    deleting,
    appToEdit,
    setAppToEdit,
    appToSell,
    setAppToSell,
    appToSettle,
    setAppToSettle,
    ipoMap,
    accountMap,
    bankMap,
    activeBankAccounts,
    ipoApplicationCounts,
    filteredApplications,
    metrics,
    selectedLots,
    selectedAmount,
    isAnyFilterActive,
    handleResetFilters,
    handleBulkStatusChange,
    handleBulkChangeBank,
    handleBulkDelete,
    handleDeleteSingle,
    filterPills,
  } = useMasterLedger({
    ipos,
    applications,
    accounts,
    bankAccounts,
    userId,
    onRefresh,
  })

  const columns = useMemo(
    () =>
      getLedgerColumns({
        ipoMap,
        accountMap,
        bankMap,
        onEdit: setAppToEdit,
        onSell: setAppToSell,
        onSettle: setAppToSettle,
        onDeleteRequest: setAppToDelete,
      }),
    [
      ipoMap,
      accountMap,
      bankMap,
      setAppToEdit,
      setAppToSell,
      setAppToSettle,
      setAppToDelete,
    ]
  )

  return (
    <div className="flex flex-col gap-5">
      {/* 5-Card Portfolio Metrics Strip */}
      <LedgerMetricsStrip metrics={metrics} />

      {/* Filter and Controls Toolbar */}
      <LedgerFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isAnyFilterActive={isAnyFilterActive}
        onResetFilters={handleResetFilters}
        selectedIpoId={selectedIpoId}
        onSelectedIpoIdChange={setSelectedIpoId}
        ipos={ipos}
        ipoMap={ipoMap}
        ipoApplicationCounts={ipoApplicationCounts}
        totalApplicationsCount={applications.length}
        selectedAccountId={selectedAccountId}
        onSelectedAccountIdChange={setSelectedAccountId}
        accounts={accounts}
        accountMap={accountMap}
        selectedBankId={selectedBankId}
        onSelectedBankIdChange={setSelectedBankId}
        bankAccounts={bankAccounts}
        bankMap={bankMap}
        selectedCategory={selectedCategory}
        onSelectedCategoryChange={setSelectedCategory}
      />

      {/* Cross-IPO DataTable */}
      <DataTable
        data={filteredApplications}
        columns={columns}
        keyExtractor={(app) => app.id}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        filterPills={filterPills}
        pageSize={15}
        emptyTitle="No applications found"
        emptyDescription={
          isAnyFilterActive
            ? "No application records match your current filter criteria."
            : "You have not recorded any applications yet. Go to My IPOs to import an IPO and submit applications."
        }
        emptyIcon={<Layers className="size-8 text-muted-foreground" />}
        emptyAction={
          isAnyFilterActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="rounded-none text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-none text-xs"
              nativeButton={false}
              render={<Link href="/ipos" />}
            >
              Go to My IPOs
            </Button>
          )
        }
        footer={
          filteredApplications.length > 0 ? (
            <div className="flex flex-col items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 text-xs sm:flex-row">
              <span className="font-medium text-muted-foreground">
                Showing {filteredApplications.length} of {applications.length}{" "}
                applications ({metrics.totalLots} Lots)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Capital:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(metrics.totalAmount)}
                </span>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Sticky Bulk Bar, Bulk & Single Action Dialogs */}
      <LedgerBulkDialogs
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        selectedLots={selectedLots}
        selectedAmount={selectedAmount}
        updatingStatus={updatingStatus}
        onBulkStatusChange={handleBulkStatusChange}
        activeBankAccounts={activeBankAccounts}
        bankDialogOpen={bankDialogOpen}
        onBankDialogOpenChange={setBankDialogOpen}
        targetBankId={targetBankId}
        onTargetBankIdChange={setTargetBankId}
        updatingBank={updatingBank}
        onBulkChangeBank={handleBulkChangeBank}
        bankMap={bankMap}
        bulkDeleteOpen={bulkDeleteOpen}
        onBulkDeleteOpenChange={setBulkDeleteOpen}
        bulkDeleting={bulkDeleting}
        onBulkDelete={handleBulkDelete}
        appToDelete={appToDelete}
        onAppToDeleteChange={setAppToDelete}
        deleting={deleting}
        onDeleteSingle={handleDeleteSingle}
        accountMap={accountMap}
        ipoMap={ipoMap}
        userId={userId}
        bankAccounts={bankAccounts}
        appToEdit={appToEdit}
        onAppToEditChange={setAppToEdit}
        appToSell={appToSell}
        onAppToSellChange={setAppToSell}
        appToSettle={appToSettle}
        onAppToSettleChange={setAppToSettle}
        onRefresh={onRefresh}
      />
    </div>
  )
}
