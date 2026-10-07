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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { getIpoStatus, formatCurrency, formatDate } from "@/lib/utils/ipo"
import type { Ipo } from "@/types"

interface IpoTableViewProps {
  ipos: Ipo[]
  appCountMap: Map<string, number>
  onEdit: (ipo: Ipo) => void
  onToggleArchive: (ipo: Ipo) => void
  onDelete: (ipo: Ipo) => void
}

export function IpoTableView({
  ipos,
  appCountMap,
  onEdit,
  onToggleArchive,
  onDelete,
}: IpoTableViewProps) {
  const columns: DataTableColumn<Ipo>[] = [
    {
      id: "name",
      header: "IPO / Company",
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      cell: (ipo) => (
        <div className="flex max-w-[240px] min-w-0 flex-col gap-0.5">
          <Link
            href={`/ipos/${ipo.id}`}
            className="block truncate text-xs font-bold text-foreground hover:underline"
            title={ipo.name}
          >
            {ipo.name}
          </Link>
          {ipo.companyName && (
            <span
              className="truncate text-[10px] text-muted-foreground"
              title={ipo.companyName}
            >
              {ipo.companyName}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.type.localeCompare(b.type),
      cell: (ipo) => (
        <Badge
          variant={ipo.type === "sme" ? "default" : "secondary"}
          className="px-1.5 py-0 font-mono text-[9px] uppercase"
        >
          {ipo.type}
        </Badge>
      ),
    },
    {
      id: "price",
      header: "Price",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.issuePrice - b.issuePrice,
      cell: (ipo) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatCurrency(ipo.issuePrice)}
        </span>
      ),
    },
    {
      id: "lot",
      header: "Lot / 1-Lot Mandate",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.lotSize * a.issuePrice - b.lotSize * b.issuePrice,
      cell: (ipo) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatCurrency(ipo.lotSize * ipo.issuePrice)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {ipo.lotSize} shares
          </span>
        </div>
      ),
    },
    {
      id: "dates",
      header: "Issue Dates",
      cell: (ipo) => (
        <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Calendar className="size-3 shrink-0" />
          <span>
            {formatDate(ipo.openDate)} – {formatDate(ipo.closeDate)}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      cell: (ipo) => {
        const { label, variant } = getIpoStatus(ipo)
        return (
          <Badge variant={variant} className="px-1.5 py-0 text-[10px]">
            {label}
          </Badge>
        )
      },
    },
    {
      id: "apps",
      header: "Apps",
      align: "center",
      sortable: true,
      sortFn: (a, b) =>
        (appCountMap.get(a.id) || 0) - (appCountMap.get(b.id) || 0),
      cell: (ipo) => {
        const count = appCountMap.get(ipo.id) || 0
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            {count}
          </span>
        )
      },
    },
    {
      id: "cmp",
      header: "Market / Gain",
      align: "right",
      cell: (ipo) => {
        const cmp = ipo.currentPrice || ipo.listingPrice
        if (!cmp)
          return <span className="text-xs text-muted-foreground">—</span>
        const gainPct = ((cmp - ipo.issuePrice) / ipo.issuePrice) * 100
        const isPos = gainPct >= 0
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(cmp)}
            </span>
            <span
              className={`font-mono text-[10px] font-semibold ${
                isPos ? "text-success" : "text-destructive"
              }`}
            >
              {isPos ? "+" : ""}
              {gainPct.toFixed(1)}%
            </span>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (ipo) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 text-muted-foreground hover:text-foreground"
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
              <DropdownMenuItem onClick={() => onEdit(ipo)}>
                <Edit2 data-icon="inline-start" />
                Edit IPO
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(ipo)}>
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(ipo)}
              >
                <Trash2 data-icon="inline-start" />
                Delete IPO
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      data={ipos}
      columns={columns}
      keyExtractor={(ipo) => ipo.id}
      pageSize={12}
      bordered={true}
    />
  )
}
