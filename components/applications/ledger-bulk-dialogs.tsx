"use client"

import {
  Landmark,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
  RotateCcw,
  CheckCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils/ipo"
import { getBankDisplayName } from "@/lib/utils/bank-helpers"
import { EditApplicationDialog } from "@/components/applications/edit-application-dialog"
import { RecordSaleDialog } from "@/components/applications/record-sale-dialog"
import { SettlementDialog } from "@/components/applications/settlement-dialog"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

interface LedgerBulkDialogsProps {
  // Selection info
  selectedIds: string[]
  onClearSelection: () => void
  selectedLots: number
  selectedAmount: number
  updatingStatus: boolean
  onBulkStatusChange: (status: ApplicationStatus) => void

  // Bulk bank change
  activeBankAccounts: BankAccount[]
  bankDialogOpen: boolean
  onBankDialogOpenChange: (open: boolean) => void
  targetBankId: string
  onTargetBankIdChange: (id: string) => void
  updatingBank: boolean
  onBulkChangeBank: () => void
  bankMap: Map<string, BankAccount>

  // Bulk delete
  bulkDeleteOpen: boolean
  onBulkDeleteOpenChange: (open: boolean) => void
  bulkDeleting: boolean
  onBulkDelete: () => void

  // Single delete
  appToDelete: Application | null
  onAppToDeleteChange: (app: Application | null) => void
  deleting: boolean
  onDeleteSingle: () => void
  accountMap: Map<string, ApplicationAccount>
  ipoMap: Map<string, Ipo>

  // Single edit / sale / settlement dialogs
  userId: string
  bankAccounts: BankAccount[]
  appToEdit: Application | null
  onAppToEditChange: (app: Application | null) => void
  appToSell: Application | null
  onAppToSellChange: (app: Application | null) => void
  appToSettle: Application | null
  onAppToSettleChange: (app: Application | null) => void
  onRefresh: () => void
}

export function LedgerBulkDialogs({
  selectedIds,
  onClearSelection,
  selectedLots,
  selectedAmount,
  updatingStatus,
  onBulkStatusChange,
  activeBankAccounts,
  bankDialogOpen,
  onBankDialogOpenChange,
  targetBankId,
  onTargetBankIdChange,
  updatingBank,
  onBulkChangeBank,
  bankMap,
  bulkDeleteOpen,
  onBulkDeleteOpenChange,
  bulkDeleting,
  onBulkDelete,
  appToDelete,
  onAppToDeleteChange,
  deleting,
  onDeleteSingle,
  accountMap,
  ipoMap,
  userId,
  bankAccounts,
  appToEdit,
  onAppToEditChange,
  appToSell,
  onAppToSellChange,
  appToSettle,
  onAppToSettleChange,
  onRefresh,
}: LedgerBulkDialogsProps) {
  return (
    <>
      {/* Sticky Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-none border border-border bg-background/95 px-4 py-2.5 shadow-xl backdrop-blur-md sm:gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="rounded-none px-2 py-0.5 font-mono text-[11px] font-bold"
            >
              {selectedIds.length}
            </Badge>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-foreground">
                {selectedIds.length} application
                {selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {selectedLots} lots • {formatCurrency(selectedAmount)}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Quick Status Changers */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 items-center gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-semibold hover:bg-muted/40"
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Spinner className="size-3.5" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              <span>Status</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-none text-xs"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => onBulkStatusChange("allotted")}
                  className="gap-2 text-success"
                >
                  <CheckCircle2 className="size-3.5" />
                  Mark Allotted
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkStatusChange("not_allotted")}
                  className="gap-2 text-muted-foreground"
                >
                  <XCircle className="size-3.5" />
                  Mark Not Allotted
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkStatusChange("pending")}
                  className="gap-2 text-warning"
                >
                  <RotateCcw className="size-3.5" />
                  Revert to Pending
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              onTargetBankIdChange(activeBankAccounts[0]?.id || "")
              onBankDialogOpenChange(true)
            }}
            disabled={activeBankAccounts.length === 0}
            className="h-8 gap-1.5 rounded-none text-xs font-semibold"
          >
            <Landmark className="size-3.5" />
            <span className="hidden sm:inline">Change</span> Bank
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => onBulkDeleteOpenChange(true)}
            className="h-8 gap-1.5 rounded-none border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Delete ({selectedIds.length})
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            title="Deselect all"
            aria-label="Deselect all"
            className="size-8 rounded-none text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={onBulkDeleteOpenChange}>
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete {selectedIds.length} Application
                  {selectedIds.length === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This will permanently delete the selected application records
                  spanning {selectedLots} lots and{" "}
                  <strong>{formatCurrency(selectedAmount)}</strong> in blocked
                  capital across your portfolio.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={bulkDeleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onBulkDelete}
              disabled={bulkDeleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {bulkDeleting ? (
                <>
                  <Spinner className="size-3.5" />
                  Deleting...
                </>
              ) : (
                `Permanently Delete (${selectedIds.length})`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Bank Modal Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={onBankDialogOpenChange}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
                <Landmark className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Change Bank Account
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Reassign the source ASBA bank account for{" "}
                  <strong>
                    {selectedIds.length} application
                    {selectedIds.length === 1 ? "" : "s"}
                  </strong>
                  .
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/30 p-2.5 text-xs">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Selected Applications
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedIds.length} Apps ({selectedLots} Lots)
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Blocked Amount
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(selectedAmount)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="target-bank"
                className="text-xs font-semibold text-foreground"
              >
                Select New Bank Account
              </label>
              <Select
                value={targetBankId}
                onValueChange={(val) => val && onTargetBankIdChange(val)}
              >
                <SelectTrigger
                  id="target-bank"
                  className="h-9 w-full rounded-none bg-background text-xs"
                >
                  <SelectValue placeholder="Choose a bank account">
                    {(val) => {
                      const bank = bankMap.get(val || targetBankId)
                      return bank
                        ? getBankDisplayName(bank)
                        : "Choose a bank account"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {activeBankAccounts.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      label={getBankDisplayName(b)}
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="font-medium">
                          {getBankDisplayName(b)}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ASBA Limit: {b.asbaLimit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBankDialogOpenChange(false)}
              disabled={updatingBank}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onBulkChangeBank}
              disabled={updatingBank || !targetBankId}
              className="rounded-none text-xs"
            >
              {updatingBank ? (
                <>
                  <Spinner className="size-3.5" />
                  Updating...
                </>
              ) : (
                "Update Bank Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(appToDelete)}
        onOpenChange={(open) => !open && onAppToDeleteChange(null)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Remove Application?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to remove this application for{" "}
                  <strong>
                    {accountMap.get(appToDelete?.accountId || "")?.name ||
                      "this account"}
                  </strong>{" "}
                  in{" "}
                  <strong>
                    {ipoMap.get(appToDelete?.ipoId || "")?.name || "this IPO"}
                  </strong>
                  ?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onDeleteSingle}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {deleting ? "Removing..." : "Remove Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Application Dialog */}
      {appToEdit && ipoMap.get(appToEdit.ipoId) && (
        <EditApplicationDialog
          open={Boolean(appToEdit)}
          onOpenChange={(open) => !open && onAppToEditChange(null)}
          userId={userId}
          ipo={ipoMap.get(appToEdit.ipoId)!}
          application={appToEdit}
          account={accountMap.get(appToEdit.accountId)!}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            onAppToEditChange(null)
            onRefresh()
          }}
        />
      )}

      {/* Record Sale Dialog */}
      {appToSell && ipoMap.get(appToSell.ipoId) && (
        <RecordSaleDialog
          open={Boolean(appToSell)}
          onOpenChange={(open) => !open && onAppToSellChange(null)}
          userId={userId}
          ipo={ipoMap.get(appToSell.ipoId)!}
          application={appToSell}
          account={accountMap.get(appToSell.accountId)!}
          onOpenSettlement={() => {
            const currentApp = appToSell
            onAppToSellChange(null)
            onAppToSettleChange(currentApp)
          }}
          onSuccess={() => {
            onAppToSellChange(null)
            onRefresh()
          }}
        />
      )}

      {/* Settlement Dialog */}
      {appToSettle && ipoMap.get(appToSettle.ipoId) && (
        <SettlementDialog
          open={Boolean(appToSettle)}
          onOpenChange={(open) => !open && onAppToSettleChange(null)}
          application={appToSettle}
          ipo={ipoMap.get(appToSettle.ipoId)!}
          account={accountMap.get(appToSettle.accountId)!}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            onAppToSettleChange(null)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
