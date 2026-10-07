"use client"

import {
  GripVertical,
  X,
  Save,
  ArrowUpDown,
  RotateCcw,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import type { ApplicationAccount } from "@/types"

interface AccountReorderPanelProps {
  reorderedAccounts: ApplicationAccount[]
  isDirty: boolean
  savingOrder: boolean
  draggedIndex: number | null
  dragOverIndex: number | null
  setDraggedIndex: (val: number | null) => void
  setDragOverIndex: (val: number | null) => void
  cancelReorderMode: () => void
  saveOrder: () => void
  applyPresetMyFirst: () => void
  applyPresetAZ: () => void
  applyPresetZA: () => void
  applyPresetCreationOrder: () => void
  resetToDefault: () => void
  moveAccountToIndex: (fromIndex: number, toIndex: number) => void
  moveAccount: (index: number, direction: "up" | "down") => void
  moveToExtreme: (index: number, position: "top" | "bottom") => void
}

export function AccountReorderPanel({
  reorderedAccounts,
  isDirty,
  savingOrder,
  draggedIndex,
  dragOverIndex,
  setDraggedIndex,
  setDragOverIndex,
  cancelReorderMode,
  saveOrder,
  applyPresetMyFirst,
  applyPresetAZ,
  applyPresetZA,
  applyPresetCreationOrder,
  resetToDefault,
  moveAccountToIndex,
  moveAccount,
  moveToExtreme,
}: AccountReorderPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-none border border-border bg-card p-4">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Reorder Accounts
            </h2>
            {isDirty && (
              <Badge
                variant="outline"
                className="border-warning/50 bg-warning/10 font-mono text-[10px] text-warning-foreground"
              >
                Unsaved changes
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Drag rows, jump by number, or use quick presets. Your custom order
            persists across all IPO applications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={cancelReorderMode}
            disabled={savingOrder}
            className="h-8 text-xs"
          >
            <X data-icon="inline-start" className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={saveOrder}
            disabled={savingOrder || !isDirty}
            className={`h-8 text-xs ${isDirty ? "ring-2 ring-primary/40" : ""}`}
          >
            {savingOrder ? (
              <Spinner className="size-3.5" />
            ) : (
              <Save data-icon="inline-start" className="size-3.5" />
            )}
            {savingOrder ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-3 text-xs">
        <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-muted-foreground">
          <ArrowUpDown className="size-3" />
          Presets:
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={applyPresetMyFirst}
          disabled={savingOrder}
          className="h-7 text-[11px]"
        >
          My Accounts First
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={applyPresetAZ}
          disabled={savingOrder}
          className="h-7 text-[11px]"
        >
          A → Z
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={applyPresetZA}
          disabled={savingOrder}
          className="h-7 text-[11px]"
        >
          Z → A
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={applyPresetCreationOrder}
          disabled={savingOrder}
          className="h-7 text-[11px]"
        >
          <RotateCcw data-icon="inline-start" className="size-3" />
          Creation Order
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={resetToDefault}
          disabled={savingOrder}
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Reset to Alphabetical
        </Button>
      </div>

      {/* Draggable Reorder List */}
      <div className="flex flex-col divide-y divide-border/50 border border-border/60 bg-background">
        {reorderedAccounts.map((account, index) => {
          const isFirst = index === 0
          const isLast = index === reorderedAccounts.length - 1
          const isDragging = draggedIndex === index
          const isDragOver =
            dragOverIndex === index && draggedIndex !== index

          return (
            <div
              key={account.id}
              draggable={!savingOrder}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", `${index}`)
                e.dataTransfer.effectAllowed = "move"
                setDraggedIndex(index)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                if (dragOverIndex !== index) {
                  setDragOverIndex(index)
                }
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) {
                  setDragOverIndex(null)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedIndex !== null && draggedIndex !== index) {
                  moveAccountToIndex(draggedIndex, index)
                }
                setDraggedIndex(null)
                setDragOverIndex(null)
              }}
              onDragEnd={() => {
                setDraggedIndex(null)
                setDragOverIndex(null)
              }}
              className={`flex items-center justify-between gap-3 p-2.5 transition-colors sm:p-3 ${
                isDragging
                  ? "border-2 border-dashed border-primary bg-primary/5 opacity-40"
                  : isDragOver
                    ? "border-t-2 border-t-primary bg-primary/10"
                    : "hover:bg-muted/20"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                {/* Drag Handle */}
                <div
                  className="flex shrink-0 cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-label="Drag handle"
                >
                  <GripVertical className="size-4" />
                </div>

                {/* Direct Position Input / Jump */}
                <input
                  type="number"
                  min={1}
                  max={reorderedAccounts.length}
                  defaultValue={index + 1}
                  key={`${account.id}-${index}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(
                        (e.target as HTMLInputElement).value,
                        10
                      )
                      if (
                        !isNaN(val) &&
                        val >= 1 &&
                        val <= reorderedAccounts.length
                      ) {
                        moveAccountToIndex(index, val - 1)
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (
                      !isNaN(val) &&
                      val >= 1 &&
                      val <= reorderedAccounts.length &&
                      val - 1 !== index
                    ) {
                      moveAccountToIndex(index, val - 1)
                    } else {
                      e.target.value = `${index + 1}`
                    }
                  }}
                  className="size-7 shrink-0 rounded-none border border-border/70 bg-muted/30 text-center font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                  title="Edit number and press Enter to jump to position"
                  aria-label={`Position for ${account.name}`}
                />

                {/* Account Details */}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-foreground">
                      {account.name}
                    </span>
                    <Badge
                      variant={
                        account.type === "my" ? "secondary" : "default"
                      }
                      className="px-1 py-0 text-[9px] font-normal"
                    >
                      {account.type === "my"
                        ? "My"
                        : `${account.profitSharePercent}%`}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {account.pan && <span>PAN: {account.pan}</span>}
                    {account.dematAccount && (
                      <span>Demat: {account.dematAccount}</span>
                    )}
                    {account.phoneNumber && (
                      <span>Ph: {account.phoneNumber}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Movement Controls: Top, Up, Down, Bottom */}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={isFirst || savingOrder}
                  onClick={() => moveToExtreme(index, "top")}
                  aria-label={`Move ${account.name} to top`}
                  title="Move to top"
                  className="size-7"
                >
                  <ChevronsUp className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={isFirst || savingOrder}
                  onClick={() => moveAccount(index, "up")}
                  aria-label={`Move ${account.name} up`}
                  title="Move up"
                  className="size-7"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={isLast || savingOrder}
                  onClick={() => moveAccount(index, "down")}
                  aria-label={`Move ${account.name} down`}
                  title="Move down"
                  className="size-7"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  disabled={isLast || savingOrder}
                  onClick={() => moveToExtreme(index, "bottom")}
                  aria-label={`Move ${account.name} to bottom`}
                  title="Move to bottom"
                  className="size-7"
                >
                  <ChevronsDown className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
