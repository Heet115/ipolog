"use client"

import { useMemo } from "react"
import {
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Landmark,
  Trash2,
  X,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useApplicationTable } from "@/hooks/use-application-table"
import { getApplicationTableColumns } from "@/components/applications/application-table-columns"
import { ApplicationTableBulkBar } from "@/components/applications/application-table-bulk-bar"
import { ApplicationTableDialogs } from "@/components/applications/application-table-dialogs"
import { formatCurrency } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface ApplicationTableProps {
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  ipo: Ipo
  userId: string
  onEdit: (application: Application) => void
  onRecordSale: (application: Application) => void
  onWhatsAppSettlement?: (application: Application) => void
  onRefresh: () => void
}

export function ApplicationTable({
  applications,
  accounts,
  bankAccounts,
  ipo,
  userId,
  onEdit,
  onRecordSale,
  onWhatsAppSettlement,
  onRefresh,
}: ApplicationTableProps) {
  const {
    appToDelete,
    setAppToDelete,
    deleting,
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
    accountMap,
    bankMap,
    activeBankAccounts,
    selectedLots,
    selectedAmount,
    handleBulkStatus,
    handleBulkDelete,
    handleBulkChangeBank,
    handleDelete,
    handleToggleSettlement,
    filterPills,
    filteredApplications,
    totalLots,
    totalAmount,
  } = useApplicationTable({
    applications,
    accounts,
    bankAccounts,
    ipo,
    userId,
    onRefresh,
  })

  const columns = useMemo(
    () =>
      getApplicationTableColumns({
        accountMap,
        bankMap,
        ipo,
        onRecordSale,
        onEdit,
        onWhatsAppSettlement,
        onToggleSettlement: handleToggleSettlement,
        onDeleteRequest: setAppToDelete,
      }),
    [
      accountMap,
      bankMap,
      ipo,
      onRecordSale,
      onEdit,
      onWhatsAppSettlement,
      handleToggleSettlement,
      setAppToDelete,
    ]
  )

  const searchFields = useMemo(
    () => [
      (app: Application) => accountMap.get(app.accountId)?.name,
      (app: Application) => bankMap.get(app.bankAccountId)?.bankName,
      (app: Application) => bankMap.get(app.bankAccountId)?.nickname,
      (app: Application) => bankMap.get(app.bankAccountId)?.last4,
      (app: Application) => {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        return `${CATEGORY_CONFIG[cat]?.label} ${CATEGORY_CONFIG[cat]?.shortLabel}`
      },
      (app: Application) => app.notes,
    ],
    [accountMap, bankMap]
  )

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <DataTable
        data={filteredApplications}
        columns={columns}
        keyExtractor={(app) => app.id}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={() => (
          <div className="flex flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={updatingStatus}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    {updatingStatus ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-success" />
                    )}
                    Mark Status
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("allotted")}
                  >
                    <CheckCircle2
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Mark Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("not_allotted")}
                  >
                    <XCircle
                      data-icon="inline-start"
                      className="text-muted-foreground"
                    />
                    Mark Not Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatus("pending")}>
                    <Clock
                      data-icon="inline-start"
                      className="text-warning-foreground"
                    />
                    Revert to Pending
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setTargetBankId(activeBankAccounts[0]?.id || "")
                setBankDialogOpen(true)
              }}
              disabled={activeBankAccounts.length === 0}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Landmark className="size-3.5" />
              Change Bank
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setBulkDeleteOpen(true)}
              className="h-8 gap-1.5 border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete ({selectedIds.length})
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedIds([])}
              title="Clear selection"
              aria-label="Clear selection"
              className="size-8"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
        searchable={true}
        searchPlaceholder="Search accounts, banks, notes..."
        searchFields={searchFields}
        filterPills={filterPills}
        pageSize={15}
        emptyTitle="No applications found"
        emptyDescription="No application records match your current filter criteria."
        emptyIcon={<Layers className="size-7 text-muted-foreground" />}
        footer={
          filteredApplications.length > 0 ? (
            <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5 text-xs">
              <span className="font-medium text-muted-foreground">
                Total: {filteredApplications.length} Applications ({totalLots}{" "}
                Lots)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Applied:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          ) : undefined
        }
      />

      <ApplicationTableBulkBar
        selectedCount={selectedIds.length}
        selectedLots={selectedLots}
        selectedAmount={selectedAmount}
        updatingStatus={updatingStatus}
        hasActiveBankAccounts={activeBankAccounts.length > 0}
        onBulkStatus={handleBulkStatus}
        onChangeBank={() => {
          setTargetBankId(activeBankAccounts[0]?.id || "")
          setBankDialogOpen(true)
        }}
        onDelete={() => setBulkDeleteOpen(true)}
        onClearSelection={() => setSelectedIds([])}
      />

      <ApplicationTableDialogs
        appToDelete={appToDelete}
        onCloseSingleDelete={() => setAppToDelete(null)}
        onConfirmSingleDelete={handleDelete}
        deleting={deleting}
        accountMap={accountMap}
        bulkDeleteOpen={bulkDeleteOpen}
        onCloseBulkDelete={() => setBulkDeleteOpen(false)}
        onConfirmBulkDelete={handleBulkDelete}
        bulkDeleting={bulkDeleting}
        selectedCount={selectedIds.length}
        selectedLots={selectedLots}
        selectedAmount={selectedAmount}
        bankDialogOpen={bankDialogOpen}
        onCloseBankDialog={() => setBankDialogOpen(false)}
        onConfirmBankChange={handleBulkChangeBank}
        updatingBank={updatingBank}
        targetBankId={targetBankId}
        onTargetBankIdChange={setTargetBankId}
        activeBankAccounts={activeBankAccounts}
        bankMap={bankMap}
      />
    </div>
  )
}
