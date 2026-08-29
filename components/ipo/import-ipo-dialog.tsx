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
  Layers,
  IndianRupee,
  AlertCircle,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl">
        {/* Header */}
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-none bg-primary/10 text-primary">
                <Download className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Import IPO from Upstox
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Browse official upcoming, open, and closed IPOs and import them
                  into your tracker
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh IPO list"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </DialogHeader>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 border-b bg-muted/20 px-6 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <InputGroup>
                <InputGroupAddon>
                  <Search className="size-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search IPO name, company, symbol, or ISIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />
              </InputGroup>
            </div>

            {/* Issue Type Filter */}
            <div className="flex items-center gap-1">
              <Button
                variant={issueType === "all" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("all")}
              >
                All Types
              </Button>
              <Button
                variant={issueType === "regular" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("regular")}
              >
                Mainboard
              </Button>
              <Button
                variant={issueType === "sme" ? "default" : "outline"}
                size="xs"
                onClick={() => setIssueType("sme")}
              >
                SME
              </Button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {(["open", "upcoming", "closed", "listed"] as const).map(
              (tabStatus) => (
                <button
                  key={tabStatus}
                  onClick={() => setStatus(tabStatus)}
                  className={`rounded-none px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    status === tabStatus
                      ? "border-b-2 border-primary bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tabStatus === "open"
                    ? "🟢 Open Now"
                    : tabStatus === "upcoming"
                      ? "📅 Upcoming"
                      : tabStatus === "closed"
                        ? "🔒 Closed"
                        : "📈 Listed"}
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="flex items-center justify-between text-xs">
                <span>{error}</span>
                <Button variant="outline" size="xs" onClick={handleRefresh}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="flex flex-col justify-between gap-3 rounded-none border p-4 sm:flex-row sm:items-center"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-3 w-56" />
                    <div className="flex gap-4 pt-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredIpos.length === 0 ? (
            <Empty className="py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No {status} IPOs found</EmptyTitle>
                <EmptyDescription>
                  {searchQuery
                    ? `No ${status} IPOs matched your search query "${searchQuery}".`
                    : `There are currently no ${status} IPOs available on Upstox.`}
                </EmptyDescription>
              </EmptyHeader>
              {(searchQuery || issueType !== "all") && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("")
                      setIssueType("all")
                    }}
                  >
                    Clear Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredIpos.map((ipo) => {
                const existing =
                  existingMap.get(`upstox:${ipo.externalId}`) ||
                  existingMap.get(`name:${ipo.name.toLowerCase().trim()}`)
                const isImported = Boolean(existing)
                const isImporting = importingId === ipo.externalId

                return (
                  <div
                    key={ipo.externalId}
                    className="flex flex-col justify-between gap-4 rounded-none border bg-card p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
                  >
                    {/* Left: IPO Details */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground">
                          {ipo.name}
                        </span>
                        {ipo.symbol && (
                          <Badge variant="outline" className="text-[10px]">
                            {ipo.symbol}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            ipo.type === "mainboard" ? "default" : "secondary"
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {ipo.type === "mainboard" ? "Mainboard" : "SME"}
                        </Badge>
                        {ipo.status === "open" && (
                          <Badge
                            variant="default"
                            className="bg-emerald-600 text-[10px] text-white dark:bg-emerald-600 hover:bg-emerald-600"
                          >
                            Open
                          </Badge>
                        )}
                      </div>

                      {ipo.industry && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="size-3" />
                          <span>{ipo.industry}</span>
                        </div>
                      )}

                      {/* Pricing & Dates Metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
                        {/* Price Band */}
                        <div className="flex items-center gap-1 text-foreground font-semibold">
                          <IndianRupee className="size-3 text-muted-foreground" />
                          {ipo.priceBandMin && ipo.priceBandMax
                            ? ipo.priceBandMin === ipo.priceBandMax
                              ? formatCurrency(ipo.priceBandMin)
                              : `${formatCurrency(ipo.priceBandMin)} – ${formatCurrency(ipo.priceBandMax)}`
                            : ipo.issuePrice > 0
                              ? formatCurrency(ipo.issuePrice)
                              : "Price TBA"}
                        </div>

                        {/* Issue Size */}
                        {ipo.issueSize && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Layers className="size-3" />
                            <span>Issue: ₹{ipo.issueSize} Cr</span>
                          </div>
                        )}

                        {/* Timeline */}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>
                            {ipo.openDate ? formatIsoDate(ipo.openDate) : "TBA"}
                            {" – "}
                            {ipo.closeDate
                              ? formatIsoDate(ipo.closeDate)
                              : "TBA"}
                          </span>
                        </div>

                        {/* Subscription */}
                        {ipo.totalSubscription &&
                          parseFloat(ipo.totalSubscription) > 0 && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Sub: {ipo.totalSubscription}x
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isImported ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 text-xs font-medium"
                          >
                            <Check className="size-3 text-emerald-600" />
                            Already in My IPOs
                          </Badge>
                          {existing && (
                            <Button
                              variant="outline"
                              size="sm"
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
                              Import
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
