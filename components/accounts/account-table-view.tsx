"use client"

import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  CheckCheck,
  ChevronsUp,
  ChevronsDown,
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
import { formatCurrency } from "@/lib/utils/ipo"
import type { AccountMoneySummary } from "@/lib/calculations/financials"
import type { ApplicationAccount } from "@/types"

interface AccountTableViewProps {
  accounts: ApplicationAccount[]
  hasMultipleActiveAccounts: boolean
  accountSummaryMap: Map<string, AccountMoneySummary>
  onEdit: (account: ApplicationAccount) => void
  onToggleArchive: (account: ApplicationAccount) => void
  onDelete: (account: ApplicationAccount) => void
  onSettleAll: (account: ApplicationAccount) => void
  onQuickMove: (account: ApplicationAccount, target: "top" | "bottom") => void
}

export function AccountTableView({
  accounts,
  hasMultipleActiveAccounts,
  accountSummaryMap,
  onEdit,
  onToggleArchive,
  onDelete,
  onSettleAll,
  onQuickMove,
}: AccountTableViewProps) {
  const columns: DataTableColumn<ApplicationAccount>[] = [
    {
      id: "order",
      header: "#",
      align: "center",
      className: "w-12",
      sortable: true,
      sortFn: (a, b) => {
        const ai = a.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bi = b.sortIndex ?? Number.MAX_SAFE_INTEGER
        return ai - bi
      },
      cell: (account) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {account.sortIndex !== undefined ? `#${account.sortIndex + 1}` : "—"}
        </span>
      ),
    },
    {
      id: "name",
      header: "Account Name",
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      cell: (account) => (
        <div className="flex max-w-[200px] min-w-0 items-center gap-1.5">
          <span
            className="block truncate text-xs font-bold text-foreground"
            title={account.name}
          >
            {account.name}
          </span>
          <Badge
            variant={account.type === "my" ? "secondary" : "default"}
            className="shrink-0 px-1 py-0 text-[9px] font-normal"
          >
            {account.type === "my" ? "My" : `${account.profitSharePercent}%`}
          </Badge>
        </div>
      ),
    },
    {
      id: "type",
      header: "Ownership",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.type.localeCompare(b.type),
      cell: (account) => (
        <span className="text-xs text-muted-foreground">
          {account.type === "my"
            ? "Personal (100%)"
            : `Shared (${account.profitSharePercent}%)`}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Mobile",
      cell: (account) => (
        <span className="font-mono text-xs text-muted-foreground">
          {account.phoneNumber || "—"}
        </span>
      ),
    },
    {
      id: "totalApplied",
      header: "Total Applied",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = accountSummaryMap.get(a.id)?.totalApplied || 0
        const sumB = accountSummaryMap.get(b.id)?.totalApplied || 0
        return sumA - sumB
      },
      cell: (account) => {
        const summary = accountSummaryMap.get(account.id)
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatCurrency(summary?.totalApplied || 0)}
          </span>
        )
      },
    },
    {
      id: "invested",
      header: "Invested Capital",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = accountSummaryMap.get(a.id)?.totalInvested || 0
        const sumB = accountSummaryMap.get(b.id)?.totalInvested || 0
        return sumA - sumB
      },
      cell: (account) => {
        const summary = accountSummaryMap.get(account.id)
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatCurrency(summary?.totalInvested || 0)}
          </span>
        )
      },
    },
    {
      id: "netProfit",
      header: "Net Profit (You)",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = accountSummaryMap.get(a.id)?.totalRealizedYourProfit || 0
        const sumB = accountSummaryMap.get(b.id)?.totalRealizedYourProfit || 0
        return sumA - sumB
      },
      cell: (account) => {
        const summary = accountSummaryMap.get(account.id)
        const yourProfit = summary?.totalRealizedYourProfit || 0
        const isPos = yourProfit > 0
        return (
          <span
            className={`font-mono text-xs font-bold ${
              isPos
                ? "text-success"
                : yourProfit < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {formatCurrency(yourProfit)}
          </span>
        )
      },
    },
    {
      id: "shared",
      header: "Profit Shared",
      align: "right",
      cell: (account) => {
        const isMy = account.type === "my"
        if (isMy) {
          return (
            <span className="text-[11px] text-muted-foreground">
              N/A (Personal)
            </span>
          )
        }

        const summary = accountSummaryMap.get(account.id)
        const shared = summary?.totalRealizedProfitShared || 0

        return (
          <span
            className={`font-mono text-xs ${
              shared > 0
                ? "font-semibold text-warning-foreground"
                : "text-muted-foreground"
            }`}
          >
            {formatCurrency(shared)}
          </span>
        )
      },
    },
    {
      id: "receivables",
      header: "Pending Receivables",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = accountSummaryMap.get(a.id)?.pendingReceivables || 0
        const sumB = accountSummaryMap.get(b.id)?.pendingReceivables || 0
        return sumA - sumB
      },
      cell: (account) => {
        if (account.type === "my") {
          return <span className="text-xs text-muted-foreground">—</span>
        }

        const summary = accountSummaryMap.get(account.id)
        const pending = summary?.pendingReceivables || 0

        if (pending <= 0) {
          return (
            <Badge
              variant="outline"
              className="px-1 py-0 font-mono text-[10px] font-normal text-muted-foreground"
            >
              All Settled
            </Badge>
          )
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-mono text-xs font-bold text-warning-foreground">
              {formatCurrency(pending)}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6 text-muted-foreground hover:bg-success/10 hover:text-success"
              title={`Mark all ${summary?.unsettledSoldApplicationsCount} settled`}
              onClick={() => onSettleAll(account)}
            >
              <CheckCheck className="size-3 text-success" />
              <span className="sr-only">Settle All</span>
            </Button>
          </div>
        )
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: (account) => (
        <span
          className="block max-w-[150px] truncate text-xs text-muted-foreground"
          title={account.notes}
        >
          {account.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (account) => (
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
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit2 data-icon="inline-start" />
                Edit Account
              </DropdownMenuItem>
              {account.type === "other" &&
                (accountSummaryMap.get(account.id)?.pendingReceivables || 0) >
                  0 && (
                  <DropdownMenuItem onClick={() => onSettleAll(account)}>
                    <CheckCheck
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Settle All (
                    {
                      accountSummaryMap.get(account.id)
                        ?.unsettledSoldApplicationsCount
                    }
                    )
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem onClick={() => onToggleArchive(account)}>
                {account.archived ? (
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
              </DropdownMenuItem>
              {!account.archived && hasMultipleActiveAccounts && (
                <>
                  <DropdownMenuItem onClick={() => onQuickMove(account, "top")}>
                    <ChevronsUp data-icon="inline-start" />
                    Move to Top
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onQuickMove(account, "bottom")}
                  >
                    <ChevronsDown data-icon="inline-start" />
                    Move to Bottom
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(account)}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataTable
      data={accounts}
      columns={columns}
      keyExtractor={(acc) => acc.id}
      pageSize={12}
      bordered={true}
    />
  )
}
