"use client"

import { TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RecordSaleForm } from "@/components/applications/record-sale-form"
import type { Ipo, Application, ApplicationAccount } from "@/types"

interface RecordSaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  application: Application | null
  account?: ApplicationAccount
  onOpenSettlement?: (application: Application) => void
  onSuccess: () => void
}

export function RecordSaleDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  application,
  account,
  onOpenSettlement,
  onSuccess,
}: RecordSaleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Record Sale — {account?.name || "Account"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record exit / sale price and calculate profit sharing for{" "}
                {ipo.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {application && (
          <RecordSaleForm
            key={application.id}
            userId={userId}
            ipo={ipo}
            application={application}
            account={account}
            onOpenSettlement={onOpenSettlement}
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
