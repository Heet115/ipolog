"use client"

import {
  ExternalLink,
  Check,
  Calendar,
  Building2,
  TrendingUp,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { formatCurrency, formatIsoDate } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import type { ExternalIPO } from "@/lib/ipo/types"
import type { Ipo } from "@/types"

interface ImportIpoCardProps {
  ipo: ExternalIPO
  existing?: Ipo
  isImporting: boolean
  onImport: (ipo: ExternalIPO) => void
  onViewIpo?: (ipoId: string) => void
  onCloseDialog: () => void
}

function renderStatusBadge(ipo: ExternalIPO) {
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

export function ImportIpoCard({
  ipo,
  existing,
  isImporting,
  onImport,
  onViewIpo,
  onCloseDialog,
}: ImportIpoCardProps) {
  const isImported = Boolean(existing)

  // Calculations
  const effectiveMaxPrice =
    ipo.priceBandMax || ipo.issuePrice || ipo.priceBandMin || 0
  const minLotAmount = effectiveMaxPrice * (ipo.lotSize || 0)
  const listingGainPercent =
    ipo.listingPrice !== undefined && effectiveMaxPrice > 0
      ? ((ipo.listingPrice - effectiveMaxPrice) / effectiveMaxPrice) * 100
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
              variant={ipo.type === "mainboard" ? "default" : "warning"}
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
                    onCloseDialog()
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
              onClick={() => onImport(ipo)}
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
                <span className="font-bold">{ipo.lotSize}</span> shares
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
            {ipo.totalSubscription && parseFloat(ipo.totalSubscription) > 0 && (
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
        (ipo.listingPrice !== undefined && ipo.listingPrice > 0) ||
        ipo.rhpUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {ipo.allotmentDate && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground/70" />
                <span className="text-muted-foreground">Allotment:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatIsoDate(ipo.allotmentDate)}
                </span>
              </span>
            )}
            {ipo.listingDate && (
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3 text-muted-foreground/70" />
                <span className="text-muted-foreground">Listing:</span>
                <span className="font-mono font-medium text-foreground">
                  {formatIsoDate(ipo.listingDate)}
                </span>
              </span>
            )}
            {ipo.registrarName && (
              <span className="hidden items-center gap-1 sm:inline-flex">
                <span className="text-muted-foreground">Registrar:</span>
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

          {ipo.listingPrice !== undefined && ipo.listingPrice > 0 && (
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
}
