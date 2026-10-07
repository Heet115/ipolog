"use client"

import Link from "next/link"
import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  ExternalLink,
  Layers,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getIpoStatus, formatCurrency, formatDate } from "@/lib/utils/ipo"
import type { Ipo } from "@/types"

export interface IpoCardProps {
  ipo: Ipo
  appCount: number
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}

export function IpoCard({
  ipo,
  appCount,
  onEdit,
  onToggleArchive,
  onDelete,
}: IpoCardProps) {
  const { label, variant } = getIpoStatus(ipo)
  const lotAmount = ipo.lotSize * ipo.issuePrice

  const hasCmp = Boolean(ipo.currentPrice || ipo.listingPrice)
  const cmp = ipo.currentPrice || ipo.listingPrice || 0
  const gainPerShare = cmp - ipo.issuePrice
  const gainPercent =
    ipo.issuePrice > 0 ? (gainPerShare / ipo.issuePrice) * 100 : 0
  const gainPerLot = gainPerShare * ipo.lotSize

  return (
    <Card
      className={`relative flex flex-col justify-between rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs ${
        ipo.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex flex-col gap-4 p-4.5">
        {/* Top Bar: Badges & Dropdown Action Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant={variant} className="px-1.5 py-0 text-[10px]">
              {label}
            </Badge>
            <Badge
              variant={ipo.type === "sme" ? "default" : "secondary"}
              className="px-1.5 py-0 font-mono text-[9px] uppercase"
            >
              {ipo.type}
            </Badge>
            {appCount > 0 && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-1.5 py-0 text-[10px]"
              >
                <Layers className="size-2.5" />
                {appCount} {appCount === 1 ? "App" : "Apps"}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-mt-1.5 -mr-1.5 size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href={`/ipos/${ipo.id}`} />}>
                  <ExternalLink data-icon="inline-start" />
                  View Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit IPO
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
                  {ipo.archived ? (
                    <>
                      <ArchiveRestore data-icon="inline-start" />
                      Restore IPO
                    </>
                  ) : (
                    <>
                      <Archive data-icon="inline-start" />
                      Archive IPO
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 data-icon="inline-start" />
                  Delete IPO
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title & Company Name */}
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/ipos/${ipo.id}`}
            className="group flex items-center gap-1.5"
          >
            <h3 className="truncate font-heading text-sm font-bold tracking-tight text-foreground transition-colors group-hover:underline">
              {ipo.name}
            </h3>
          </Link>
          {ipo.companyName && (
            <p className="truncate text-xs text-muted-foreground">
              {ipo.companyName}
            </p>
          )}
        </div>

        {/* Issue Metrics Strip */}
        <div className="grid grid-cols-2 gap-2 border-y border-border/50 py-2.5 text-xs">
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Issue Price
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(ipo.issuePrice)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground">
              1 Lot ({ipo.lotSize} shares)
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(lotAmount)}
            </span>
          </div>
        </div>

        {/* CMP / Listing Gain Block */}
        {hasCmp && (
          <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                {ipo.currentPrice ? "CMP" : "Listing"}:
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(cmp)}
              </span>
            </div>
            <div className="text-right font-mono">
              <span
                className={`text-xs font-bold ${
                  gainPercent >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {gainPercent >= 0 ? "+" : ""}
                {gainPercent.toFixed(1)}%
              </span>
              <span className="block text-[10px] text-muted-foreground">
                ({gainPerLot >= 0 ? "+" : ""}
                {formatCurrency(gainPerLot)}/lot)
              </span>
            </div>
          </div>
        )}

        {/* Bottom Footer: Dates & Workspace Action */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>
              {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)}
            </span>
          </div>

          <Button
            size="xs"
            variant="outline"
            className="h-7 rounded-none text-xs"
            nativeButton={false}
            render={<Link href={`/ipos/${ipo.id}`} />}
          >
            Workspace
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
