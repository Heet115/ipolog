"use client"

import { Edit2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IpoForm } from "@/components/ipo/ipo-form"
import type { Ipo } from "@/types"

interface IpoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipoToEdit?: Ipo | null
  onSuccess: (ipoId?: string) => void
}

export function IpoDialog({
  open,
  onOpenChange,
  userId,
  ipoToEdit,
  onSuccess,
}: IpoDialogProps) {
  if (!ipoToEdit) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Edit2 className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Edit IPO Details
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update IPO pricing, lot size, key dates, or registrar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <IpoForm
          key={ipoToEdit.id}
          userId={userId}
          ipoToEdit={ipoToEdit}
          onCancel={() => onOpenChange(false)}
          onSuccess={(id) => {
            onSuccess(id)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
