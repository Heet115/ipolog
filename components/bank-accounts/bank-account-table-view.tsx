"use client"

import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Landmark,
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
import type { BankMoneySummary } from "@/lib/calculations/financials"
import type { BankAccount } from "@/types"

interface BankAccountTableViewProps {
  bankAccounts: BankAccount[]
  bankSummaryMap: Map<string, BankMoneySummary>
  onEdit: (bank: BankAccount) => void
  onToggleArchive: (bank: BankAccount) => void
  onDelete: (bank: BankAccount) => void
}

export function BankAccountTableView({
  bankAccounts,
  bankSummaryMap,
  onEdit,
  onToggleArchive,
  onDelete,
}: BankAccountTableViewProps) {
  const columns: DataTableColumn<BankAccount>[] = [
    {
      id: "bank",
      header: "Bank Name / Nickname",
      sortable: true,
      sortFn: (a, b) =>
        (a.nickname || a.bankName).localeCompare(b.nickname || b.bankName),
      cell: (bank) => (
        <div className="flex max-w-[220px] min-w-0 items-center gap-2">
          <Landmark className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col">
            <span
              className="block truncate text-xs font-bold text-foreground"
              title={bank.bankName}
            >
              {bank.bankName}
            </span>
            {bank.nickname && (
              <span className="truncate text-[10px] text-muted-foreground">
                {bank.nickname}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "last4",
      header: "Last 4",
      align: "center",
      cell: (bank) => (
        <span className="font-mono text-xs text-muted-foreground">
          {bank.last4 ? `••${bank.last4}` : "—"}
        </span>
      ),
    },
    {
      id: "upiId",
      header: "Linked UPI",
      cell: (bank) => (
        <span className="font-mono text-xs text-foreground">
          {bank.upiId || "—"}
        </span>
      ),
    },
    {
      id: "blocked",
      header: "Blocked Capital",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = bankSummaryMap.get(a.id)?.blockedAmount || 0
        const sumB = bankSummaryMap.get(b.id)?.blockedAmount || 0
        return sumA - sumB
      },
      cell: (bank) => {
        const summary = bankSummaryMap.get(bank.id)
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatCurrency(summary?.blockedAmount || 0)}
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
        const sumA = bankSummaryMap.get(a.id)?.investedAmount || 0
        const sumB = bankSummaryMap.get(b.id)?.investedAmount || 0
        return sumA - sumB
      },
      cell: (bank) => {
        const summary = bankSummaryMap.get(bank.id)
        return (
          <span className="font-mono text-xs font-semibold text-foreground">
            {formatCurrency(summary?.investedAmount || 0)}
          </span>
        )
      },
    },
    {
      id: "total",
      header: "Total Active Funds",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA =
          (bankSummaryMap.get(a.id)?.blockedAmount || 0) +
          (bankSummaryMap.get(a.id)?.investedAmount || 0)
        const sumB =
          (bankSummaryMap.get(b.id)?.blockedAmount || 0) +
          (bankSummaryMap.get(b.id)?.investedAmount || 0)
        return sumA - sumB
      },
      cell: (bank) => {
        const summary = bankSummaryMap.get(bank.id)
        const total =
          (summary?.blockedAmount || 0) + (summary?.investedAmount || 0)
        return (
          <span className="font-mono text-xs font-bold text-foreground">
            {formatCurrency(total)}
          </span>
        )
      },
    },
    {
      id: "asbaLimit",
      header: "ASBA Limit & Status",
      align: "right",
      sortable: true,
      sortFn: (a, b) => (a.asbaLimit || 0) - (b.asbaLimit || 0),
      cell: (bank) => {
        const summary = bankSummaryMap.get(bank.id)
        const blocked = summary?.blockedAmount || 0
        if (!bank.asbaLimit) {
          return (
            <span className="font-mono text-xs text-muted-foreground">—</span>
          )
        }

        const isExceeded = blocked > bank.asbaLimit
        const isNear = !isExceeded && blocked / bank.asbaLimit >= 0.8
        const utilPercent = Math.round((blocked / bank.asbaLimit) * 100)

        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono text-xs font-semibold text-foreground">
              {formatCurrency(bank.asbaLimit)}
            </span>
            {isExceeded ? (
              <Badge
                variant="destructive"
                className="px-1.5 py-0 font-mono text-[9px]"
              >
                Exceeded by {formatCurrency(blocked - bank.asbaLimit)}
              </Badge>
            ) : isNear ? (
              <Badge
                variant="warning"
                className="px-1.5 py-0 font-mono text-[9px]"
              >
                {utilPercent}% utilized
              </Badge>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">
                {utilPercent}% utilized
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "apps",
      header: "Applications",
      align: "center",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = bankSummaryMap.get(a.id)?.totalApplicationsCount || 0
        const sumB = bankSummaryMap.get(b.id)?.totalApplicationsCount || 0
        return sumA - sumB
      },
      cell: (bank) => {
        const summary = bankSummaryMap.get(bank.id)
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {summary?.totalApplicationsCount || 0}
          </span>
        )
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: (bank) => (
        <span
          className="block max-w-[150px] truncate text-xs text-muted-foreground"
          title={bank.notes}
        >
          {bank.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (bank) => (
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
          <DropdownMenuContent align="end" className="w-40 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onEdit(bank)}>
                <Edit2 data-icon="inline-start" />
                Edit Bank
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleArchive(bank)}>
                {bank.archived ? (
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(bank)}
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
      data={bankAccounts}
      columns={columns}
      keyExtractor={(bank) => bank.id}
      pageSize={12}
      bordered={true}
    />
  )
}
