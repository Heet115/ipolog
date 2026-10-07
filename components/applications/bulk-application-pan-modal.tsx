"use client"

import { AlertTriangle } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import type { ApplicationAccount } from "@/types"

interface BulkApplicationPanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  intraBatchDuplicatePans: Array<{ pan: string; accounts: ApplicationAccount[] }>
  selectedPanConflictsWithApplied: Array<{
    selectedAccount: ApplicationAccount
    appliedAccount: ApplicationAccount
    pan: string
  }>
  onCancel: () => void
  onConfirm: () => void
}

export function BulkApplicationPanModal({
  open,
  onOpenChange,
  loading,
  intraBatchDuplicatePans,
  selectedPanConflictsWithApplied,
  onCancel,
  onConfirm,
}: BulkApplicationPanModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-none sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
            <AlertDialogTitle className="text-base font-bold">
              Duplicate PAN Warning
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-xs text-muted-foreground">
            Multiple applications in this batch share identical PAN numbers:
            <div className="my-2.5 flex flex-col gap-1 rounded-none border border-amber-500/30 bg-amber-500/5 p-2 font-mono text-[11px] text-amber-900 dark:text-amber-200">
              {intraBatchDuplicatePans.map((d) => (
                <div key={d.pan}>
                  • <strong>{d.accounts.map((a) => a.name).join(", ")}</strong>{" "}
                  share PAN <strong>{d.pan}</strong>
                </div>
              ))}
              {selectedPanConflictsWithApplied.map((c) => (
                <div key={c.selectedAccount.id}>
                  • <strong>{c.selectedAccount.name}</strong> shares PAN{" "}
                  <strong>{c.pan}</strong> with already-applied{" "}
                  <strong>{c.appliedAccount.name}</strong>
                </div>
              ))}
            </div>
            In Indian IPOs, SEBI regulations mandate that duplicate bids under
            the same PAN will be rejected by the exchange registrar. Are you sure
            you want to proceed anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t border-border/60 pt-3">
          <AlertDialogCancel
            disabled={loading}
            onClick={onCancel}
            className="rounded-none text-xs"
          >
            Back to Selection
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={onConfirm}
            className="rounded-none bg-amber-600 text-xs text-white hover:bg-amber-700"
          >
            {loading && <Spinner className="size-3" />}
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
