"use client"

import {
  Landmark,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  X,
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
import { formatCurrency } from "@/lib/utils/ipo"
import type { ApplicationStatus } from "@/types"

interface ApplicationTableBulkBarProps {
  selectedCount: number
  selectedLots: number
  selectedAmount: number
  updatingStatus: boolean
  hasActiveBankAccounts: boolean
  onBulkStatus: (status: ApplicationStatus) => void
  onChangeBank: () => void
  onDelete: () => void
  onClearSelection: () => void
}

export function ApplicationTableBulkBar({
  selectedCount,
  selectedLots,
  selectedAmount,
  updatingStatus,
  hasActiveBankAccounts,
  onBulkStatus,
  onChangeBank,
  onDelete,
  onClearSelection,
}: ApplicationTableBulkBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-none border border-border bg-background/95 px-4 py-2.5 shadow-xl backdrop-blur-md sm:gap-4">
      <div className="flex items-center gap-2">
        <Badge
          variant="default"
          className="rounded-none px-2 py-0.5 font-mono text-[11px] font-bold"
        >
          {selectedCount}
        </Badge>
        <div className="flex flex-col text-xs">
          <span className="font-bold text-foreground">
            {selectedCount} application{selectedCount > 1 ? "s" : ""} selected
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {selectedLots} lots • {formatCurrency(selectedAmount)}
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border/60" />

      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="xs"
                disabled={updatingStatus}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                {updatingStatus ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-success-foreground" />
                )}
                Status
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            }
          />
          <DropdownMenuContent align="center" className="w-48 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onBulkStatus("allotted")}>
                <CheckCircle2
                  data-icon="inline-start"
                  className="text-success"
                />
                Mark Allotted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatus("not_allotted")}>
                <XCircle
                  data-icon="inline-start"
                  className="text-muted-foreground"
                />
                Mark Not Allotted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBulkStatus("pending")}>
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
          onClick={onChangeBank}
          disabled={!hasActiveBankAccounts}
          className="h-8 gap-1.5 text-xs font-semibold"
        >
          <Landmark className="size-3.5" />
          <span className="hidden sm:inline">Change</span> Bank
        </Button>

        <Button
          variant="outline"
          size="xs"
          onClick={onDelete}
          className="h-8 gap-1.5 border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClearSelection}
          title="Clear selection"
          aria-label="Clear selection"
          className="size-8"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
