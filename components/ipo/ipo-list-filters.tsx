"use client"

import {
  Search,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  X,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import {
  IPO_SORT_LABELS,
  type StatusFilter,
  type TypeFilter,
  type IpoSortOption,
} from "@/types/ipo"

interface IpoListFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (val: StatusFilter) => void
  typeFilter: TypeFilter
  onTypeFilterChange: (val: TypeFilter) => void
  sortBy: IpoSortOption
  onSortByChange: (val: IpoSortOption) => void
  viewMode: "grid" | "table"
  onViewModeChange: (val: "grid" | "table") => void
  statusCounts: {
    all: number
    open: number
    upcoming: number
    allotment: number
    listed: number
    archived: number
  }
  totalFiltered: number
  onReset: () => void
}

export function IpoListFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  statusCounts,
  totalFiltered,
  onReset,
}: IpoListFiltersProps) {
  const isFiltered = search || typeFilter !== "all" || statusFilter !== "all"

  return (
    <div className="flex flex-col gap-3">
      {/* Tier 1: Horizontal Scrollable Status Tabs */}
      <div className="-mx-4 no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-4 pb-2 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => onStatusFilterChange("all")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
            statusFilter === "all"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>All</span>
          <span
            className={cn(
              "py-0.2 px-1.5 font-mono text-[10px]",
              statusFilter === "all"
                ? "bg-background/25 font-bold text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("open")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
            statusFilter === "open"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0",
              statusCounts.open > 0
                ? "animate-pulse bg-success"
                : "bg-muted-foreground"
            )}
          />
          <span>Open</span>
          <span
            className={cn(
              "py-0.2 px-1.5 font-mono text-[10px]",
              statusFilter === "open"
                ? "bg-background/25 font-bold text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.open}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("upcoming")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
            statusFilter === "upcoming"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Upcoming</span>
          <span
            className={cn(
              "py-0.2 px-1.5 font-mono text-[10px]",
              statusFilter === "upcoming"
                ? "bg-background/25 font-bold text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.upcoming}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("allotment_pending")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
            statusFilter === "allotment_pending"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Allotment</span>
          <span
            className={cn(
              "py-0.2 px-1.5 font-mono text-[10px]",
              statusFilter === "allotment_pending"
                ? "bg-background/25 font-bold text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.allotment}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("listed")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
            statusFilter === "listed"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Listed</span>
          <span
            className={cn(
              "py-0.2 px-1.5 font-mono text-[10px]",
              statusFilter === "listed"
                ? "bg-background/25 font-bold text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusCounts.listed}
          </span>
        </button>

        {statusCounts.archived > 0 && (
          <button
            type="button"
            onClick={() => onStatusFilterChange("archived")}
            className={cn(
              "flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors",
              statusFilter === "archived"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>Archived</span>
            <span
              className={cn(
                "py-0.2 px-1.5 font-mono text-[10px]",
                statusFilter === "archived"
                  ? "bg-background/25 font-bold text-background"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {statusCounts.archived}
            </span>
          </button>
        )}
      </div>

      {/* Tier 2: Search, Type Filter, Sort & View Modes */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Search + Type Select + Reset */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="w-full sm:w-60 md:w-72">
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search IPO, company, notes..."
                aria-label="Search IPOs"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="text-xs"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          {/* Type Filter Select */}
          <Select
            value={typeFilter}
            onValueChange={(val) =>
              val && onTypeFilterChange(val as TypeFilter)
            }
          >
            <SelectTrigger
              className="h-8 w-[130px] gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-medium"
              aria-label="Filter by Type"
            >
              <Layers className="size-3 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All Types">
                {(val) =>
                  val === "mainboard"
                    ? "Mainboard"
                    : val === "sme"
                      ? "SME"
                      : "All Types"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[130px]">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mainboard">Mainboard</SelectItem>
              <SelectItem value="sme">SME</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters (shown when active) */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right: Count + Sort Dropdown + View Toggle */}
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <span className="hidden font-mono text-[11px] text-muted-foreground lg:inline">
            {totalFiltered} {totalFiltered === 1 ? "IPO" : "IPOs"}
          </span>

          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(val) => val && onSortByChange(val as IpoSortOption)}
          >
            <SelectTrigger
              className="h-8 w-[165px] gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-medium"
              aria-label="Sort IPOs"
            >
              <ArrowUpDown className="size-3 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Sort by">
                {(val) => IPO_SORT_LABELS[val as IpoSortOption] || "Sort"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="w-[175px]">
              {Object.entries(IPO_SORT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
    </div>
  )
}
