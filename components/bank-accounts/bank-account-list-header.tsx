"use client"

import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BANK_SORT_LABELS, type BankSortOption } from "@/types/bank-account"

interface BankAccountListHeaderProps {
  search: string
  onSearchChange: (value: string) => void
  showArchived: boolean
  onToggleArchived: () => void
  archivedCount: number
  sortBy: BankSortOption
  onSortByChange: (val: BankSortOption) => void
  viewMode: "grid" | "table"
  onViewModeChange: (val: "grid" | "table") => void
}

export function BankAccountListHeader({
  search,
  onSearchChange,
  showArchived,
  onToggleArchived,
  archivedCount,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
}: BankAccountListHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs md:max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search bank name, nickname, last 4 digits..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 w-full bg-background pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {archivedCount > 0 && (
          <Button
            variant="outline"
            size="xs"
            onClick={onToggleArchived}
            className="h-8 text-xs"
          >
            {showArchived
              ? "Hide Archived"
              : `Show Archived (${archivedCount})`}
          </Button>
        )}

        {/* Grid Sort Selector */}
        <div className="flex shrink-0 items-center">
          <Select
            value={sortBy}
            onValueChange={(val) =>
              val && onSortByChange(val as BankSortOption)
            }
          >
            <SelectTrigger
              className="h-8 gap-1.5 rounded-none border border-border bg-background px-2 text-xs font-semibold"
              aria-label="Sort Bank Accounts"
            >
              <ArrowUpDown className="size-3 text-muted-foreground" />
              <SelectValue placeholder="Sort by">
                {(val) => BANK_SORT_LABELS[val as BankSortOption] || "Sort"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {Object.entries(BANK_SORT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} label={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex h-8 items-center rounded-none border border-border bg-background p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
              viewMode === "table"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Table View"
          >
            <TableIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
