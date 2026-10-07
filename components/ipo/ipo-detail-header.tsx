"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  RefreshCw,
  Check,
  BadgeIndianRupeeIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Timestamp } from "firebase/firestore"
import {
  formatCurrency,
  formatDate,
  formatSyncFreshness,
  getIpoStatus,
} from "@/lib/utils/ipo"
import type { Ipo } from "@/types"

interface TimelineStep {
  label: string
  date?: Timestamp | null
  done: boolean
}

interface IpoDetailHeaderProps {
  ipo: Ipo
  statusInfo: ReturnType<typeof getIpoStatus>
  minAmount: number
  timelineSteps: TimelineStep[]
  syncing: boolean
  onRefreshData: () => void
  onOpenPriceDialog: () => void
  onOpenEditDialog: () => void
  onToggleArchive: () => void
  onOpenDeleteDialog: () => void
}

export function IpoDetailHeader({
  ipo,
  statusInfo,
  minAmount,
  timelineSteps,
  syncing,
  onRefreshData,
  onOpenPriceDialog,
  onOpenEditDialog,
  onToggleArchive,
  onOpenDeleteDialog,
}: IpoDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/ipos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to My IPOs
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {Boolean(ipo.externalId) && !ipo.archived && (
            <Button
              variant="outline"
              size="xs"
              onClick={onRefreshData}
              disabled={syncing}
              className="h-7 text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
                data-icon="inline-start"
              />
              {syncing ? "Syncing..." : "Refresh Data"}
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={onOpenPriceDialog}
            className="h-7 text-xs"
          >
            <BadgeIndianRupeeIcon data-icon="inline-start" />
            Market Prices
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={onOpenEditDialog}
            className="h-7 text-xs"
          >
            <Edit2 data-icon="inline-start" />
            Edit IPO
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={onToggleArchive}
            className="h-7 text-xs"
          >
            {ipo.archived ? (
              <>
                <ArchiveRestore data-icon="inline-start" />
                Restore
              </>
            ) : (
              <>
                <Archive data-icon="inline-start" />
                Archive
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={onOpenDeleteDialog}
            className="h-7 text-xs"
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main IPO Header Hero Card */}
      <Card className="rounded-none border border-border/70 bg-card">
        <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">
                  {ipo.name}
                </h1>
                <Badge
                  variant={ipo.type === "sme" ? "secondary" : "outline"}
                  className="px-1.5 py-0 font-mono text-[10px] uppercase"
                >
                  {ipo.type}
                </Badge>
                <Badge
                  variant={statusInfo.variant}
                  className="px-1.5 py-0 text-[10px] font-normal"
                >
                  {statusInfo.label}
                </Badge>
                {ipo.provider && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 px-1.5 py-0 font-mono text-[10px] text-primary uppercase"
                  >
                    {ipo.provider}
                  </Badge>
                )}
                {ipo.registrar && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 px-1.5 py-0 font-mono text-[10px] text-primary"
                  >
                    Registrar: {ipo.registrar}
                  </Badge>
                )}
                {ipo.archived && (
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 font-mono text-[10px]"
                  >
                    Archived
                  </Badge>
                )}
              </div>
              {ipo.companyName && (
                <p className="font-mono text-xs text-muted-foreground">
                  {ipo.companyName}
                  {ipo.lastSyncedAt && (
                    <span
                      className="ml-2 text-[11px] text-muted-foreground/80"
                      title={`Last synced: ${formatDate(ipo.lastSyncedAt)}`}
                    >
                      • Auto-refreshed ({formatSyncFreshness(ipo.lastSyncedAt)})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Price Highlights */}
            <div className="flex flex-wrap items-center gap-4 sm:text-right">
              <div>
                <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                  Issue Price
                </span>
                <span className="font-mono text-lg font-bold text-foreground sm:text-xl">
                  {formatCurrency(ipo.issuePrice)}
                </span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  {ipo.lotSize} sh / lot
                </span>
              </div>

              {ipo.listingPrice && (
                <div className="border-t border-border/60 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                  <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                    Listing Price
                  </span>
                  <span className="font-mono text-lg font-bold text-success sm:text-xl">
                    {formatCurrency(ipo.listingPrice)}
                  </span>
                  <span className="block font-mono text-[11px] text-success">
                    +
                    {(
                      ((ipo.listingPrice - ipo.issuePrice) / ipo.issuePrice) *
                      100
                    ).toFixed(1)}
                    % Gain
                  </span>
                </div>
              )}

              {ipo.currentPrice && (
                <div className="border-t border-border/60 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                  <span className="block text-[10px] tracking-wider text-muted-foreground uppercase">
                    Current (CMP)
                  </span>
                  <span className="font-mono text-lg font-bold text-foreground sm:text-xl">
                    {formatCurrency(ipo.currentPrice)}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {(
                      ((ipo.currentPrice - ipo.issuePrice) / ipo.issuePrice) *
                      100
                    ).toFixed(1)}
                    % vs Issue
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-none border border-border/50 bg-muted/40 p-3 text-xs sm:grid-cols-4">
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Lot Size
              </span>
              <span className="font-mono font-semibold text-foreground">
                {ipo.lotSize} shares
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                1 Lot Mandate
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(minAmount)}
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                Price Band
              </span>
              <span className="font-mono font-semibold text-foreground">
                {ipo.priceBandMin && ipo.priceBandMax
                  ? `₹${ipo.priceBandMin} - ₹${ipo.priceBandMax}`
                  : "Fixed Price"}
              </span>
            </div>

            <div>
              <span className="block text-[11px] text-muted-foreground">
                Category
              </span>
              <span className="font-semibold text-foreground capitalize">
                {ipo.type === "mainboard" ? "Mainboard Issue" : "SME Issue"}
              </span>
            </div>
          </div>

          {/* Timeline Milestones */}
          {(ipo.openDate ||
            ipo.closeDate ||
            ipo.allotmentDate ||
            ipo.listingDate) && (
            <div className="rounded-none border border-border/40 bg-muted/20 p-3">
              <span className="mb-2 block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Timeline & Milestones
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {step.done ? (
                        <Check className="size-3 shrink-0 text-success" />
                      ) : (
                        <Calendar className="size-3 shrink-0" />
                      )}
                      <span>{step.label}</span>
                    </div>
                    <span className="pl-4.5 font-mono text-[11px] font-semibold text-foreground">
                      {formatDate(step.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ipo.notes && (
            <p className="rounded-none border border-border/40 bg-muted/30 p-2.5 text-xs text-muted-foreground">
              <strong className="text-foreground">Notes: </strong>
              {ipo.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
