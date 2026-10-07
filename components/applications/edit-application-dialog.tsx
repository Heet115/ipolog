"use client"

import { Edit2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EditApplicationForm } from "@/components/applications/edit-application-form"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

interface EditApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  application: Application | null
  account?: ApplicationAccount
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function EditApplicationDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  application,
  account,
  bankAccounts,
  onSuccess,
}: EditApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Edit2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Edit Application — {account?.name || "Account"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Modify lots, quota category, funding bank account, or notes for{" "}
                {ipo.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {application && (
          <EditApplicationForm
            key={application.id}
            userId={userId}
            ipo={ipo}
            application={application}
            account={account}
            bankAccounts={bankAccounts}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onOpenChange(false)
              onSuccess()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
