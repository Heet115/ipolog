"use client"

import { Trash2, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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
import type { Application, ApplicationAccount, BankAccount } from "@/types"

interface ApplicationTableDialogsProps {
  // Single delete
  appToDelete: Application | null
  onCloseSingleDelete: () => void
  onConfirmSingleDelete: () => void
  deleting: boolean
  accountMap: Map<string, ApplicationAccount>

  // Bulk delete
  bulkDeleteOpen: boolean
  onCloseBulkDelete: () => void
  onConfirmBulkDelete: () => void
  bulkDeleting: boolean
  selectedCount: number
  selectedLots: number
  selectedAmount: number

  // Bulk bank change
  bankDialogOpen: boolean
  onCloseBankDialog: () => void
  onConfirmBankChange: () => void
  updatingBank: boolean
  targetBankId: string
  onTargetBankIdChange: (val: string) => void
  activeBankAccounts: BankAccount[]
  bankMap: Map<string, BankAccount>
}

export function ApplicationTableDialogs({
  appToDelete,
  onCloseSingleDelete,
  onConfirmSingleDelete,
  deleting,
  accountMap,
  bulkDeleteOpen,
  onCloseBulkDelete,
  onConfirmBulkDelete,
  bulkDeleting,
  selectedCount,
  selectedLots,
  selectedAmount,
  bankDialogOpen,
  onCloseBankDialog,
  onConfirmBankChange,
  updatingBank,
  targetBankId,
  onTargetBankIdChange,
  activeBankAccounts,
  bankMap,
}: ApplicationTableDialogsProps) {
  return (
    <>
      {/* Bulk Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && onCloseBulkDelete()}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete {selectedCount} Application
                  {selectedCount > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This action will permanently delete the selected application
                  records.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 py-3 text-xs">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/20 p-2.5">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Lots
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedLots} Lots
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Capital Applied
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(selectedAmount)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Associated profit metrics and blocked funds calculations will be
              updated immediately.
            </p>
          </div>

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
              onClick={onConfirmBulkDelete}
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
                `Delete ${selectedCount} Applications`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Bank Dialog */}
      <Dialog
        open={bankDialogOpen}
        onOpenChange={(open) => !open && onCloseBankDialog()}
      >
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
                <Landmark className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Change Funding Bank
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update the bank account for {selectedCount} selected
                  application{selectedCount > 1 ? "s" : ""}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/20 p-2.5 text-xs">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Applications
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedCount} Apps ({selectedLots} Lots)
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
                  className="h-9 w-full bg-background text-xs"
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
                <SelectContent>
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
              onClick={onCloseBankDialog}
              disabled={updatingBank}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onConfirmBankChange}
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
        onOpenChange={(open) => !open && onCloseSingleDelete()}
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
                  </strong>
                  ? All recorded lots and allotment data will be cleared.
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
              onClick={onConfirmSingleDelete}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {deleting ? "Removing..." : "Remove Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
