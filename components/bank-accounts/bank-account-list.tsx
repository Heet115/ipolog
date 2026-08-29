"use client"

import { useState } from "react"
import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Landmark,
  Search,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { toast } from "@/components/ui/toast"
import {
  archiveBankAccount,
  deleteBankAccount,
} from "@/lib/firebase/bank-accounts"
import {
  calculateBankMoneySummary,
  type BankMoneySummary,
} from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { BankAccount, Application, Ipo } from "@/types"

interface BankAccountListProps {
  bankAccounts: BankAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onEdit: (bankAccount: BankAccount) => void
  onRefresh: () => void
}

export function BankAccountList({
  bankAccounts,
  applications,
  ipos,
  userId,
  onEdit,
  onRefresh,
}: BankAccountListProps) {
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [bankToDelete, setBankToDelete] = useState<BankAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const ipoMap = new Map(ipos.map((i) => [i.id, i]))

  // Filter bank accounts
  const filteredAccounts = bankAccounts.filter((bank) => {
    if (!showArchived && bank.archived) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        bank.bankName.toLowerCase().includes(q) ||
        (bank.nickname && bank.nickname.toLowerCase().includes(q)) ||
        (bank.last4 && bank.last4.includes(q)) ||
        (bank.notes && bank.notes.toLowerCase().includes(q))
      )
    }
    return true
  })

  const archivedCount = bankAccounts.filter((bank) => bank.archived).length

  const handleToggleArchive = async (bank: BankAccount) => {
    try {
      await archiveBankAccount(userId, bank.id, !bank.archived)
      toast.add({
        title: bank.archived
          ? "Bank account restored"
          : "Bank account archived",
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update bank account archive state",
        type: "error",
      })
    }
  }

  const handleDelete = async () => {
    if (!bankToDelete) return
    setDeleting(true)
    try {
      await deleteBankAccount(userId, bankToDelete.id)
      toast.add({
        title: "Bank account deleted",
        type: "success",
      })
      setBankToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete bank account",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  // Precalculate summaries
  const bankSummaryMap = new Map<string, BankMoneySummary>()
  for (const b of filteredAccounts) {
    bankSummaryMap.set(b.id, calculateBankMoneySummary(b.id, applications, ipoMap))
  }

  const tableColumns: DataTableColumn<BankAccount>[] = [
    {
      id: "bank",
      header: "Bank Name / Nickname",
      sortable: true,
      sortFn: (a, b) => (a.nickname || a.bankName).localeCompare(b.nickname || b.bankName),
      cell: (bank) => (
        <div className="flex items-center gap-2 min-w-0 max-w-[220px]">
          <Landmark className="size-3.5 text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <span
              className="font-bold text-foreground truncate block text-xs"
              title={bank.bankName}
            >
              {bank.bankName}
            </span>
            {bank.nickname && (
              <span className="text-[10px] text-muted-foreground truncate">
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
          className="text-xs text-muted-foreground truncate max-w-[150px] block"
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
              <DropdownMenuItem onClick={() => handleToggleArchive(bank)}>
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
                onClick={() => setBankToDelete(bank)}
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
    <div className="flex flex-col gap-6">
      {/* Controls Bar: Search, Archive Toggle & View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bank name, nickname, last 4 digits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-background pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowArchived(!showArchived)}
              className="h-8 text-xs"
            >
              {showArchived
                ? "Hide Archived"
                : `Show Archived (${archivedCount})`}
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-none border border-border bg-background p-0.5 h-8">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2 py-1 text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === "table"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <TableIcon className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {filteredAccounts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Landmark className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No bank accounts match your search</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different search term"
                : "Add bank accounts to easily assign funding accounts to applications"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "table" ? (
        <DataTable
          data={filteredAccounts}
          columns={tableColumns}
          keyExtractor={(b) => b.id}
          pageSize={12}
          bordered={true}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map((bank) => {
            const summary = calculateBankMoneySummary(
              bank.id,
              applications,
              ipoMap
            )

            return (
              <BankAccountCard
                key={bank.id}
                bank={bank}
                summary={summary}
                onEdit={() => onEdit(bank)}
                onToggleArchive={() => handleToggleArchive(bank)}
                onDelete={() => setBankToDelete(bank)}
              />
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(bankToDelete)}
        onOpenChange={(open) => !open && setBankToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>
                {bankToDelete?.nickname || bankToDelete?.bankName}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Bank Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function BankAccountCard({
  bank,
  summary,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  bank: BankAccount
  summary: BankMoneySummary
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  return (
    <Card
      className={`rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs flex flex-col justify-between ${
        bank.archived ? "opacity-60 bg-muted/20" : "bg-card"
      }`}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        {/* Header: Bank Name + Nickname + Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Landmark className="size-3.5 text-muted-foreground shrink-0" />
              <h3 className="font-heading text-sm font-bold text-foreground truncate">
                {bank.bankName}
              </h3>
              {bank.archived && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono shrink-0">
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {bank.nickname && (
                <span className="font-medium text-foreground truncate max-w-[120px]">
                  {bank.nickname}
                </span>
              )}
              {bank.last4 && (
                <span className="font-mono text-[11px]">
                  ••{bank.last4}
                </span>
              )}
              {summary.totalApplicationsCount > 0 && (
                <span className="font-mono text-[10px]">
                  • {summary.totalApplicationsCount} apps
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 -mr-1.5 -mt-1.5 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Bank
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
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
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 data-icon="inline-start" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Money Metrics Strip */}
        <div className="grid grid-cols-2 gap-2 border-y border-border/50 py-2.5 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Blocked (Active)
            </span>
            <span className="font-bold text-foreground font-mono">
              {formatCurrency(summary.blockedAmount)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Invested (Allotted)
            </span>
            <span className="font-bold text-foreground font-mono">
              {formatCurrency(summary.investedAmount)}
            </span>
          </div>
        </div>

        {/* Total Capital Committed */}
        <div className="flex items-center justify-between rounded-none border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs">
          <span className="text-[11px] text-muted-foreground font-medium">
            Total Active Funds:
          </span>
          <span className="font-bold font-mono text-foreground">
            {formatCurrency(
              summary.blockedAmount + summary.investedAmount
            )}
          </span>
        </div>

        {/* Notes (if any) */}
        {bank.notes && (
          <p className="text-[11px] text-muted-foreground italic truncate">
            {bank.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
