"use client"

import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"
import type { SettlementFilterTab } from "@/hooks/use-settlement-center"

interface SettlementControlsBarProps {
  statusTab: SettlementFilterTab
  setStatusTab: (tab: SettlementFilterTab) => void
  search: string
  setSearch: (search: string) => void
  totalPartnersCount: number
  pendingPartnersCount: number
  settledPartnersCount: number
  filteredCount: number
}

export function SettlementControlsBar({
  statusTab,
  setStatusTab,
  search,
  setSearch,
  totalPartnersCount,
  pendingPartnersCount,
  settledPartnersCount,
  filteredCount,
}: SettlementControlsBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Tier 1: Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => setStatusTab("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusTab === "all"
              ? "bg-foreground text-background font-semibold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>All Partners</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusTab === "all"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalPartnersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab("pending")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusTab === "pending"
              ? "bg-foreground text-background font-semibold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "size-1.5 shrink-0",
              pendingPartnersCount > 0 ? "bg-amber-500 animate-pulse" : "bg-muted-foreground"
            )}
          />
          <span>Needs Settlement</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusTab === "pending"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {pendingPartnersCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab("settled")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
            statusTab === "settled"
              ? "bg-foreground text-background font-semibold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>Fully Settled</span>
          <span
            className={cn(
              "px-1.5 py-0.2 font-mono text-[10px]",
              statusTab === "settled"
                ? "bg-background/25 text-background font-bold"
                : "bg-muted text-muted-foreground"
            )}
          >
            {settledPartnersCount}
          </span>
        </button>
      </div>

      {/* Tier 2: Search Input & Controls */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="w-full sm:w-72 md:w-80">
            <InputGroup className="h-8">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search partner, phone, PAN, IPO..."
                aria-label="Search partner settlements"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
              {search && (
                <InputGroupAddon align="inline-end">
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>

          {(search || statusTab !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("")
                setStatusTab("all")
              }}
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-muted-foreground">
            Showing {filteredCount} partner{filteredCount === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </div>
  )
}
