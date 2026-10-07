"use client"

import Link from "next/link"
import {
  ExternalLink,
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { formatCurrency, formatDate } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

export interface LedgerColumnsOptions {
  ipoMap: Map<string, Ipo>
  accountMap: Map<string, ApplicationAccount>
  bankMap: Map<string, BankAccount>
  onEdit: (app: Application) => void
  onSell: (app: Application) => void
  onSettle: (app: Application) => void
  onDeleteRequest: (app: Application) => void
}

export function getLedgerColumns({
  ipoMap,
  accountMap,
  bankMap,
  onEdit,
  onSell,
  onSettle,
  onDeleteRequest,
}: LedgerColumnsOptions): DataTableColumn<Application>[] {
  return [
    {
      id: "ipo",
      header: "IPO",
      sortable: true,
      sortFn: (a, b) => {
        const ipoA = ipoMap.get(a.ipoId)?.name || ""
        const ipoB = ipoMap.get(b.ipoId)?.name || ""
        return ipoA.localeCompare(ipoB)
      },
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        if (!ipo) {
          return (
            <span className="font-mono text-xs text-muted-foreground">
              Unknown IPO
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/ipos/${ipo.id}`}
                className="group flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary hover:underline"
              >
                <span className="max-w-[140px] truncate text-xs sm:max-w-[200px]">
                  {ipo.name}
                </span>
                <ExternalLink className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Badge
                variant={ipo.type === "sme" ? "secondary" : "outline"}
                className="rounded-none px-1 py-0 font-mono text-[9px] font-bold uppercase"
              >
                {ipo.type === "sme" ? "SME" : "Main"}
              </Badge>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {ipo.issuePrice ? `₹${ipo.issuePrice}` : "—"} • Lot:{" "}
              {ipo.lotSize || 0}
            </span>
          </div>
        )
      },
    },
    {
      id: "account",
      header: "Account",
      sortable: true,
      sortFn: (a, b) => {
        const nameA = accountMap.get(a.accountId)?.name || ""
        const nameB = accountMap.get(b.accountId)?.name || ""
        return nameA.localeCompare(nameB)
      },
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        if (!account) {
          return (
            <span className="font-mono text-xs text-muted-foreground">
              Unknown
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-[130px] truncate text-xs font-medium text-foreground">
              {account.name}
            </span>
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`rounded-none px-1 py-0 font-mono text-[9px] ${
                  account.type === "my"
                    ? "border-primary/40 text-primary"
                    : "border-warning/50 text-warning"
                }`}
              >
                {account.type === "my"
                  ? "MY"
                  : `PARTNER (${account.profitSharePercent}%)`}
              </Badge>
            </div>
          </div>
        )
      },
    },
    {
      id: "bank",
      header: "Bank Account",
      sortable: true,
      sortFn: (a, b) => {
        const bankA = bankMap.get(a.bankAccountId)?.bankName || ""
        const bankB = bankMap.get(b.bankAccountId)?.bankName || ""
        return bankA.localeCompare(bankB)
      },
      cell: (app) => {
        const bank = bankMap.get(app.bankAccountId)
        if (!bank) {
          return (
            <span className="font-mono text-xs text-muted-foreground">—</span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-[130px] truncate font-mono text-xs font-semibold text-foreground">
              {bank.nickname || bank.bankName}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {bank.last4 ? `••••${bank.last4}` : bank.bankName}
            </span>
          </div>
        )
      },
    },
    {
      id: "category",
      header: "Category",
      cell: (app) => {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        const config = CATEGORY_CONFIG[cat]
        return (
          <Badge
            variant="outline"
            className="rounded-none border-border/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase"
          >
            {config?.shortLabel || cat}
          </Badge>
        )
      },
    },
    {
      id: "lots",
      header: "Lots / Capital",
      sortable: true,
      sortFn: (a, b) => (a.amountApplied || 0) - (b.amountApplied || 0),
      cell: (app) => {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(app.amountApplied)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {app.lotsApplied} {app.lotsApplied === 1 ? "lot" : "lots"} (
              {app.sharesApplied} sh)
            </span>
          </div>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
      cell: (app) => {
        const config: Record<
          ApplicationStatus,
          {
            label: string
            icon: typeof Clock
            badgeClass: string
          }
        > = {
          pending: {
            label: "PENDING",
            icon: Clock,
            badgeClass:
              "border-warning/40 bg-warning/10 text-warning dark:border-warning/30",
          },
          allotted: {
            label: "ALLOTTED",
            icon: CheckCircle2,
            badgeClass:
              "border-success/40 bg-success/10 text-success dark:border-success/30",
          },
          not_allotted: {
            label: "NOT ALLOTTED",
            icon: XCircle,
            badgeClass:
              "border-border bg-muted/30 text-muted-foreground dark:border-border/60",
          },
          sold: {
            label: "SOLD",
            icon: TrendingUp,
            badgeClass:
              "border-primary/40 bg-primary/10 text-primary dark:border-primary/30",
          },
        }

        const curr = config[app.status] || config.pending
        const Icon = curr.icon

        return (
          <Badge
            variant="outline"
            className={`flex w-fit items-center gap-1.5 rounded-none px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${curr.badgeClass}`}
          >
            <Icon className="size-3" />
            <span>{curr.label}</span>
          </Badge>
        )
      },
    },
    {
      id: "return",
      header: "Return / Profit",
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)

        if (!ipo || !account) {
          return (
            <span className="font-mono text-[11px] text-muted-foreground">
              —
            </span>
          )
        }

        const profit = calculateApplicationProfit(app, ipo, account)

        if (profit.hasRealized) {
          const isProfitable = profit.realizedYourProfit >= 0
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`font-mono text-xs font-bold ${
                  isProfitable ? "text-success" : "text-destructive"
                }`}
              >
                {isProfitable ? "+" : ""}
                {formatCurrency(profit.realizedYourProfit)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Net (Gross: {formatCurrency(profit.realizedGrossProfit)})
              </span>
            </div>
          )
        }

        if (app.status === "allotted") {
          return (
            <span className="font-mono text-[10px] text-muted-foreground">
              {app.allottedLots} lot{app.allottedLots === 1 ? "" : "s"} held
            </span>
          )
        }

        if (app.status === "not_allotted") {
          return (
            <span className="font-mono text-[10px] text-muted-foreground">
              Refunded
            </span>
          )
        }

        return (
          <span className="font-mono text-[10px] text-muted-foreground">
            Awaiting
          </span>
        )
      },
    },
    {
      id: "date",
      header: "Date",
      sortable: true,
      sortFn: (a, b) => {
        const timeA =
          a.applicationDate?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0
        const timeB =
          b.applicationDate?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0
        return timeA - timeB
      },
      cell: (app) => (
        <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          {formatDate(app.applicationDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)
        const isPartner = account?.type === "other"

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-7 items-center justify-center rounded-none border border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                aria-label="Application Actions"
              >
                <MoreVertical className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-none text-xs"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => onEdit(app)}
                    className="gap-2"
                  >
                    <Edit2 className="size-3.5" />
                    Edit Application
                  </DropdownMenuItem>

                  {(app.status === "allotted" || app.status === "sold") &&
                    ipo && (
                      <DropdownMenuItem
                        onClick={() => onSell(app)}
                        className="gap-2"
                      >
                        <TrendingUp className="size-3.5" />
                        {app.status === "sold" ? "Update Sale" : "Record Sale"}
                      </DropdownMenuItem>
                    )}

                  {isPartner &&
                    (app.status === "sold" || app.status === "allotted") &&
                    ipo && (
                      <DropdownMenuItem
                        onClick={() => onSettle(app)}
                        className="gap-2"
                      >
                        <MessageSquare className="size-3.5" />
                        Settlement & WhatsApp
                      </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDeleteRequest(app)}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete Application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]
}
