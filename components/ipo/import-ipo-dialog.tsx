"use client"

import {
  Search,
  RefreshCw,
  Download,
  Building2,
  AlertCircle,
  CircleDot,
  Lock,
  TrendingUp,
  X,
  Radio,
  Calendar,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { useImportIpo, type StatusTab } from "@/hooks/use-import-ipo"
import { ImportIpoCard } from "@/components/ipo/import-ipo-card"
import { cn } from "@/lib/utils"
import type { Ipo } from "@/types"

interface ImportIpoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  existingIpos: Ipo[]
  onSuccess?: (importedIpoId?: string) => void
  onViewIpo?: (ipoId: string) => void
}

const STATUS_TABS: Array<{
  id: StatusTab
  label: string
  icon: typeof CircleDot
  description: string
}> = [
  {
    id: "open",
    label: "Open Now",
    icon: Radio,
    description: "Issues currently accepting bids",
  },
  {
    id: "upcoming",
    label: "Upcoming",
    icon: Calendar,
    description: "Scheduled issues opening soon",
  },
  {
    id: "closed",
    label: "Closed",
    icon: Lock,
    description: "Past issues awaiting allotment/listing",
  },
  {
    id: "listed",
    label: "Listed",
    icon: TrendingUp,
    description: "Recently debuted on exchange",
  },
]

export function ImportIpoDialog({
  open,
  onOpenChange,
  existingIpos,
  onSuccess,
  onViewIpo,
}: ImportIpoDialogProps) {
  const {
    status,
    setStatus,
    issueType,
    setIssueType,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    importingId,
    filteredIpos,
    existingMap,
    importedCount,
    handleRefresh,
    handleImportClick,
  } = useImportIpo({ open, existingIpos, onSuccess })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92svh] w-full flex-col gap-0 overflow-hidden rounded-none border border-border bg-card p-0 shadow-2xl sm:max-w-3xl md:max-w-4xl">
        {/* Terminal Header */}
        <DialogHeader className="border-b border-border/60 bg-muted/20 py-3 pr-14 pl-4 sm:py-3.5 sm:pr-16 sm:pl-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-none border border-primary/20 bg-primary/10 text-primary">
                <Download className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="truncate text-base font-bold tracking-tight text-foreground">
                    Import IPO from Upstox
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="hidden rounded-none border-primary/30 bg-primary/5 font-mono text-[10px] font-bold tracking-wider text-primary uppercase sm:inline-flex"
                  >
                    Live Exchange Feed
                  </Badge>
                </div>
                <DialogDescription className="truncate text-xs text-muted-foreground">
                  Official NSE/BSE pipeline with automated lot metrics, dates,
                  and direct sync
                </DialogDescription>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-7 gap-1.5 rounded-none font-mono text-xs"
                title="Refresh exchange feed"
              >
                <RefreshCw
                  className={cn("size-3", loading && "animate-spin")}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Command & Filter Deck */}
        <div className="flex flex-col gap-2.5 border-b border-border/70 bg-card px-4 pt-3 pb-0 sm:px-6">
          {/* Upper Deck: Search & Issue Type Toggle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <InputGroup className="h-8 flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search by IPO name, symbol, sector, or ISIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs"
              />
              {searchQuery && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                  >
                    <X className="size-3 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">Clear search</span>
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>

            {/* Issue Type Switcher */}
            <div className="flex items-center gap-1">
              <Button
                variant={issueType === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("all")}
                className="rounded-none font-mono text-xs uppercase"
              >
                All Types
              </Button>
              <Button
                variant={issueType === "regular" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("regular")}
                className="rounded-none font-mono text-xs uppercase"
              >
                Mainboard
              </Button>
              <Button
                variant={issueType === "sme" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("sme")}
                className="rounded-none font-mono text-xs uppercase"
              >
                SME
              </Button>
            </div>
          </div>

          {/* Lower Deck: Status Pipeline Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-t border-border/40 pt-1">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = status === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatus(tab.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-none px-3.5 py-2 font-mono text-xs font-semibold tracking-wider uppercase transition-all",
                    isActive
                      ? "border-b-2 border-primary bg-primary/10 font-bold text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === "open" && (
                    <span className="size-1.5 animate-pulse rounded-none bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4 rounded-none">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between text-xs">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleRefresh}
                  className="rounded-none"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            /* High-fidelity 4-column skeletons */
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex flex-col gap-3 rounded-none border border-border/70 bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-48 rounded-none" />
                      <Skeleton className="h-4 w-16 rounded-none" />
                      <Skeleton className="h-4 w-20 rounded-none" />
                    </div>
                    <Skeleton className="h-7 w-24 rounded-none" />
                  </div>
                  <Skeleton className="h-3 w-72 rounded-none" />
                  <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5 sm:grid-cols-4 sm:gap-3">
                    <Skeleton className="h-12 w-full rounded-none" />
                    <Skeleton className="h-12 w-full rounded-none" />
                    <Skeleton className="h-12 w-full rounded-none" />
                    <Skeleton className="h-12 w-full rounded-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredIpos.length === 0 ? (
            <Empty className="rounded-none border border-dashed border-border/70 bg-muted/10 py-12">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="rounded-none border border-border bg-card"
                >
                  <Building2 className="size-5 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-bold">
                  {searchQuery
                    ? `No matching ${status} IPOs found`
                    : `No ${status} IPOs available`}
                </EmptyTitle>
                <EmptyDescription className="text-xs">
                  {searchQuery
                    ? `No issues in the ${status} category matched "${searchQuery}". Try clearing filters or refining search terms.`
                    : `There are currently no ${status} issues listed on the Upstox exchange feed.`}
                </EmptyDescription>
              </EmptyHeader>
              {(searchQuery || issueType !== "all") && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none text-xs"
                    onClick={() => {
                      setSearchQuery("")
                      setIssueType("all")
                    }}
                  >
                    Clear All Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            /* Modern IPO Ledger */
            <div className="flex flex-col gap-3">
              {filteredIpos.map((ipo) => {
                const existing =
                  existingMap.get(`upstox:${ipo.externalId}`) ||
                  existingMap.get(`name:${ipo.name.toLowerCase().trim()}`)

                return (
                  <ImportIpoCard
                    key={ipo.externalId}
                    ipo={ipo}
                    existing={existing}
                    isImporting={importingId === ipo.externalId}
                    onImport={handleImportClick}
                    onViewIpo={onViewIpo}
                    onCloseDialog={() => onOpenChange(false)}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Status Deck Footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/15 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="size-1.5 rounded-none bg-primary" />
            <span>
              {filteredIpos.length}{" "}
              {filteredIpos.length === 1 ? "issue" : "issues"} available
              {importedCount > 0 && ` • ${importedCount} already in tracker`}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-none text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
