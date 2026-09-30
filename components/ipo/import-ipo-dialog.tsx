"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  Check,
  Calendar,
  Building2,
  AlertCircle,
  CircleDot,
  Lock,
  TrendingUp,
  X,
  Radio,
  FileSpreadsheet,
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
import { Spinner } from "@/components/ui/spinner"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { formatCurrency, formatIsoDate } from "@/lib/utils/ipo"
import { useAuth } from "@/lib/firebase/auth-context"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { ExternalIPO } from "@/lib/ipo/types"
import type { Ipo } from "@/types"

interface ImportIpoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  existingIpos: Ipo[]
  onSuccess?: (importedIpoId?: string) => void
  onViewIpo?: (ipoId: string) => void
}

type StatusTab = "open" | "upcoming" | "closed" | "listed"
type IssueTypeFilter = "all" | "regular" | "sme"

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
  const { user } = useAuth()
  const [status, setStatus] = useState<StatusTab>("open")
  const [issueType, setIssueType] = useState<IssueTypeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [ipos, setIpos] = useState<ExternalIPO[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const handleRefresh = useCallback(() => {
    setFetchTrigger((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!open) return
    let ignore = false

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          status,
        })
        if (issueType !== "all") {
          params.set("issue_type", issueType)
        }

        const res = await fetch(`/api/ipos/available?${params.toString()}`)
        const json = await res.json()

        if (!ignore) {
          if (!res.ok || !json.success) {
            setError(
              json.error ||
                "Unable to load IPO data right now. Please try again later."
            )
          } else {
            setIpos(json.data || [])
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load IPO data right now. Please try again later."
          )
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [open, status, issueType, fetchTrigger])

  // Client-side search filter
  const filteredIpos = useMemo(() => {
    if (!searchQuery.trim()) return ipos
    const q = searchQuery.toLowerCase().trim()
    return ipos.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q) ||
        item.symbol?.toLowerCase().includes(q) ||
        item.isin?.toLowerCase().includes(q) ||
        item.industry?.toLowerCase().includes(q)
      )
    })
  }, [ipos, searchQuery])

  // Fast duplicate lookup map
  const existingMap = useMemo(() => {
    const map = new Map<string, Ipo>()
    existingIpos.forEach((ipo) => {
      if (ipo.provider === "upstox" && ipo.externalId) {
        map.set(`upstox:${ipo.externalId}`, ipo)
      }
      // Also map normalized names as fallback duplicate prevention
      map.set(`name:${ipo.name.toLowerCase().trim()}`, ipo)
    })
    return map
  }, [existingIpos])

  // Count of tracked IPOs in current view
  const importedCount = useMemo(() => {
    return filteredIpos.filter((item) =>
      Boolean(
        existingMap.get(`upstox:${item.externalId}`) ||
        existingMap.get(`name:${item.name.toLowerCase().trim()}`)
      )
    ).length
  }, [filteredIpos, existingMap])

  const handleImportClick = async (externalIpo: ExternalIPO) => {
    if (!user) {
      toast.add({
        title: "Authentication Required",
        description: "Please sign in to import IPOs.",
        type: "error",
      })
      return
    }

    setImportingId(externalIpo.externalId)
    try {
      const token = await user.getIdToken()
      const res = await fetch("/api/ipos/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalId: externalIpo.externalId,
          provider: "upstox",
        }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to import IPO.")
      }

      if (json.alreadyExists) {
        toast.add({
          title: "Already in My IPOs",
          description: `${externalIpo.name} is already in your tracker.`,
          type: "info",
        })
      } else {
        toast.add({
          title: "IPO Imported Successfully",
          description: `${externalIpo.name} has been added to your IPO list.`,
          type: "success",
        })
      }

      if (onSuccess) {
        onSuccess(json.ipo?.id)
      }
    } catch (err: unknown) {
      console.error("Failed to import IPO:", err)
      toast.add({
        title: "Import Failed",
        description:
          err instanceof Error
            ? err.message
            : "Could not import IPO. Please try again.",
        type: "error",
      })
    } finally {
      setImportingId(null)
    }
  }

  const renderStatusBadge = (ipo: ExternalIPO) => {
    switch (ipo.status) {
      case "open":
        return (
          <Badge
            variant="default"
            className="flex items-center gap-1 rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            <span className="size-1.5 animate-pulse rounded-none bg-primary-foreground" />
            Open Now
          </Badge>
        )
      case "upcoming":
        return (
          <Badge
            variant="info"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            Upcoming
          </Badge>
        )
      case "closed":
        return (
          <Badge
            variant="outline"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
          >
            Closed
          </Badge>
        )
      case "listed":
        return (
          <Badge
            variant="secondary"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            Listed
          </Badge>
        )
      default:
        return null
    }
  }

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
                const isImported = Boolean(existing)
                const isImporting = importingId === ipo.externalId

                // Calculations
                const effectiveMaxPrice =
                  ipo.priceBandMax || ipo.issuePrice || ipo.priceBandMin || 0
                const minLotAmount = effectiveMaxPrice * (ipo.lotSize || 0)
                const listingGainPercent =
                  ipo.listingPrice !== undefined && effectiveMaxPrice > 0
                    ? ((ipo.listingPrice - effectiveMaxPrice) /
                        effectiveMaxPrice) *
                      100
                    : undefined

                const priceDisplay =
                  ipo.priceBandMin && ipo.priceBandMax
                    ? ipo.priceBandMin === ipo.priceBandMax
                      ? formatCurrency(ipo.priceBandMin)
                      : `${formatCurrency(ipo.priceBandMin)} – ${formatCurrency(ipo.priceBandMax)}`
                    : ipo.issuePrice > 0
                      ? formatCurrency(ipo.issuePrice)
                      : ipo.priceBandMin
                        ? `From ${formatCurrency(ipo.priceBandMin)}`
                        : "Price TBA"

                return (
                  <div
                    key={ipo.externalId}
                    className={cn(
                      "group relative flex flex-col justify-between gap-3.5 rounded-none border p-4 transition-all duration-150",
                      isImported
                        ? "border-l-2 border-border/70 border-l-primary/70 bg-muted/10 hover:border-primary/50"
                        : "border-border/80 bg-card hover:border-primary/60 hover:shadow-xs"
                    )}
                  >
                    {/* Top Row: Identity & Action */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      {/* Left: Names & Badges */}
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm font-bold tracking-tight text-foreground sm:text-base">
                            {ipo.name}
                          </h4>
                          {ipo.symbol && (
                            <Badge
                              variant="outline"
                              className="rounded-none font-mono text-[10px] font-bold tracking-wider uppercase"
                            >
                              {ipo.symbol}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              ipo.type === "mainboard" ? "default" : "warning"
                            }
                            className="rounded-none font-mono text-[10px] font-bold tracking-wider uppercase"
                          >
                            {ipo.type === "mainboard" ? "Mainboard" : "SME"}
                          </Badge>
                          {renderStatusBadge(ipo)}
                        </div>

                        {/* Subtitles: Sector, Company & ISIN */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {ipo.companyName && ipo.companyName !== ipo.name && (
                            <span className="truncate">{ipo.companyName}</span>
                          )}
                          {ipo.industry && (
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3 text-muted-foreground" />
                              <span className="truncate">{ipo.industry}</span>
                            </span>
                          )}
                          {ipo.isin && (
                            <span className="font-mono text-[10px] text-muted-foreground/80">
                              ISIN: {ipo.isin}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                        {isImported ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="h-7 rounded-none border border-border px-2.5 text-xs font-medium"
                            >
                              <Check
                                className="size-3 text-primary"
                                data-icon="inline-start"
                              />
                              In Tracker
                            </Badge>
                            {existing && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-none text-xs"
                                onClick={() => {
                                  onOpenChange(false)
                                  if (onViewIpo) {
                                    onViewIpo(existing.id)
                                  }
                                }}
                              >
                                View IPO
                                <ExternalLink data-icon="inline-end" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 rounded-none text-xs font-semibold"
                            onClick={() => handleImportClick(ipo)}
                            disabled={isImporting}
                          >
                            {isImporting ? (
                              <>
                                <Spinner data-icon="inline-start" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download data-icon="inline-start" />
                                Import IPO
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Financial Metric Strip (4 Columns) */}
                    <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2.5 text-xs sm:grid-cols-4 sm:gap-3">
                      {/* Col 1: Price Band */}
                      <div className="flex flex-col gap-0.5 rounded-none border border-border/40 bg-muted/20 p-2">
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          Price Band
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground sm:text-sm">
                          {priceDisplay}
                        </span>
                      </div>

                      {/* Col 2: Min Application (1 Lot) */}
                      <div className="flex flex-col gap-0.5 rounded-none border border-border/40 bg-muted/20 p-2">
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          Min Lot (1 Lot)
                        </span>
                        <span className="font-mono text-xs text-foreground">
                          {ipo.lotSize ? (
                            <>
                              <span className="font-bold">{ipo.lotSize}</span>{" "}
                              shares
                              {minLotAmount > 0 && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  • ~{formatCurrency(minLotAmount)}
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>

                      {/* Col 3: Issue Size & Subscription */}
                      <div className="flex flex-col gap-0.5 rounded-none border border-border/40 bg-muted/20 p-2">
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          Issue / Sub
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {ipo.issueSize ? `₹${ipo.issueSize} Cr` : "TBA"}
                          </span>
                          {ipo.totalSubscription &&
                            parseFloat(ipo.totalSubscription) > 0 && (
                              <Badge
                                variant="outline"
                                className="rounded-none border-primary/40 bg-primary/10 px-1.5 py-0 font-mono text-[10px] font-bold text-primary"
                              >
                                {ipo.totalSubscription}x
                              </Badge>
                            )}
                        </div>
                      </div>

                      {/* Col 4: Issue Window / Timeline */}
                      <div className="flex flex-col gap-0.5 rounded-none border border-border/40 bg-muted/20 p-2">
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                          Bidding Window
                        </span>
                        <span className="truncate font-mono text-xs text-foreground">
                          {ipo.openDate ? formatIsoDate(ipo.openDate) : "TBA"}
                          {" – "}
                          {ipo.closeDate ? formatIsoDate(ipo.closeDate) : "TBA"}
                        </span>
                      </div>
                    </div>

                    {/* Micro Meta Row: Allotment, Listing, Registrar & Listing Price */}
                    {(ipo.allotmentDate ||
                      ipo.listingDate ||
                      ipo.registrarName ||
                      (ipo.listingPrice !== undefined &&
                        ipo.listingPrice > 0) ||
                      ipo.rhpUrl) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          {ipo.allotmentDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3 text-muted-foreground/70" />
                              <span className="text-muted-foreground">
                                Allotment:
                              </span>
                              <span className="font-mono font-medium text-foreground">
                                {formatIsoDate(ipo.allotmentDate)}
                              </span>
                            </span>
                          )}
                          {ipo.listingDate && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="size-3 text-muted-foreground/70" />
                              <span className="text-muted-foreground">
                                Listing:
                              </span>
                              <span className="font-mono font-medium text-foreground">
                                {formatIsoDate(ipo.listingDate)}
                              </span>
                            </span>
                          )}
                          {ipo.registrarName && (
                            <span className="hidden items-center gap-1 sm:inline-flex">
                              <span className="text-muted-foreground">
                                Registrar:
                              </span>
                              <span className="max-w-[160px] truncate font-medium text-foreground">
                                {ipo.registrarName}
                              </span>
                            </span>
                          )}
                          {ipo.rhpUrl && (
                            <a
                              href={ipo.rhpUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <FileSpreadsheet className="size-3" />
                              <span>RHP Prospectus</span>
                            </a>
                          )}
                        </div>

                        {ipo.listingPrice !== undefined &&
                          ipo.listingPrice > 0 && (
                            <span className="font-mono font-semibold text-primary">
                              Listed @ {formatCurrency(ipo.listingPrice)}
                              {listingGainPercent !== undefined && (
                                <span
                                  className={
                                    listingGainPercent >= 0
                                      ? "text-primary"
                                      : "text-destructive"
                                  }
                                >
                                  {" "}
                                  ({listingGainPercent >= 0 ? "+" : ""}
                                  {listingGainPercent.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
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
