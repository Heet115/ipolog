"use client"

import { useState } from "react"
import {
  MoreVertical,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
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
  archiveApplicationAccount,
  deleteApplicationAccount,
} from "@/lib/firebase/accounts"
import {
  calculateAccountMoneySummary,
  type AccountMoneySummary,
} from "@/lib/calculations/financials"
import { formatCurrency } from "@/lib/utils/ipo"
import type { ApplicationAccount, Application, Ipo } from "@/types"

interface AccountListProps {
  accounts: ApplicationAccount[]
  applications: Application[]
  ipos: Ipo[]
  userId: string
  onEdit: (account: ApplicationAccount) => void
  onRefresh: () => void
}

export function AccountList({
  accounts,
  applications,
  ipos,
  userId,
  onEdit,
  onRefresh,
}: AccountListProps) {
  const [search, setSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [accountToDelete, setAccountToDelete] =
    useState<ApplicationAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  const ipoMap = new Map(ipos.map((i) => [i.id, i]))

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    if (!showArchived && acc.archived) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        acc.name.toLowerCase().includes(q) ||
        (acc.notes && acc.notes.toLowerCase().includes(q))
      )
    }
    return true
  })

  const myAccounts = filteredAccounts.filter((acc) => acc.type === "my")
  const otherAccounts = filteredAccounts.filter((acc) => acc.type === "other")
  const archivedCount = accounts.filter((acc) => acc.archived).length

  const handleToggleArchive = async (account: ApplicationAccount) => {
    try {
      await archiveApplicationAccount(userId, account.id, !account.archived)
      toast.add({
        title: account.archived ? "Account restored" : "Account archived",
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update account",
        type: "error",
      })
    }
  }

  const handleDelete = async () => {
    if (!accountToDelete) return
    setDeleting(true)
    try {
      await deleteApplicationAccount(userId, accountToDelete.id)
      toast.add({
        title: "Account deleted",
        type: "success",
      })
      setAccountToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete account",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  // Precalculate summaries for fast rendering in table
  const accountSummaryMap = new Map<string, AccountMoneySummary>()
  for (const acc of filteredAccounts) {
    accountSummaryMap.set(
      acc.id,
      calculateAccountMoneySummary(acc.id, applications, ipoMap, acc)
    )
  }

  const tableColumns: DataTableColumn<ApplicationAccount>[] = [
    {
      id: "name",
      header: "Account Name",
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      cell: (account) => (
        <div className="flex items-center gap-1.5 min-w-0 max-w-[200px]">
          <span
            className="font-bold text-foreground truncate block text-xs"
            title={account.name}
          >
            {account.name}
          </span>
          <Badge
            variant={account.type === "my" ? "secondary" : "default"}
            className="text-[9px] py-0 px-1 font-normal shrink-0"
          >
            {account.type === "my"
              ? "My"
              : `${account.profitSharePercent}%`}
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
          {account.type === "my" ? "Personal (100%)" : `Shared (${account.profitSharePercent}%)`}
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
              shared > 0 ? "font-semibold text-warning-foreground" : "text-muted-foreground"
            }`}
          >
            {formatCurrency(shared)}
          </span>
        )
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: (account) => (
        <span
          className="text-xs text-muted-foreground truncate max-w-[150px] block"
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
          <DropdownMenuContent align="end" className="w-40 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit2 data-icon="inline-start" />
                Edit Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleArchive(account)}>
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
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setAccountToDelete(account)}
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
            placeholder="Search account name, notes..."
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
              <Users className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No accounts match your filter</EmptyTitle>
            <EmptyDescription>
              {search
                ? "Try a different search term"
                : "Add application accounts to start recording applications"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "table" ? (
        <DataTable
          data={filteredAccounts}
          columns={tableColumns}
          keyExtractor={(acc) => acc.id}
          pageSize={12}
          bordered={true}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* My Accounts Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                My Accounts ({myAccounts.length})
              </h2>
              <Badge
                variant="secondary"
                className="px-1 py-0 font-mono text-[10px]"
              >
                100% Profit Retention
              </Badge>
            </div>

            {myAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No personal accounts configured.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myAccounts.map((account) => {
                  const summary = calculateAccountMoneySummary(
                    account.id,
                    applications,
                    ipoMap,
                    account
                  )

                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      summary={summary}
                      onEdit={() => onEdit(account)}
                      onToggleArchive={() => handleToggleArchive(account)}
                      onDelete={() => setAccountToDelete(account)}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Other / Investor Accounts Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Other / Family Accounts ({otherAccounts.length})
              </h2>
              <Badge
                variant="outline"
                className="px-1 py-0 font-mono text-[10px]"
              >
                Profit Sharing Active
              </Badge>
            </div>

            {otherAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No family/investor accounts configured.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherAccounts.map((account) => {
                  const summary = calculateAccountMoneySummary(
                    account.id,
                    applications,
                    ipoMap,
                    account
                  )

                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      summary={summary}
                      onEdit={() => onEdit(account)}
                      onToggleArchive={() => handleToggleArchive(account)}
                      onDelete={() => setAccountToDelete(account)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(accountToDelete)}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{accountToDelete?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AccountCard({
  account,
  summary,
  onEdit,
  onToggleArchive,
  onDelete,
}: {
  account: ApplicationAccount
  summary: AccountMoneySummary
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
}) {
  const isMy = account.type === "my"

  return (
    <Card
      className={`rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs flex flex-col justify-between ${
        account.archived ? "opacity-60 bg-muted/20" : "bg-card"
      }`}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        {/* Header: Name + Badges + Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-sm font-bold text-foreground truncate">
                {account.name}
              </h3>
              {account.archived && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant={isMy ? "secondary" : "default"}
                className="text-[9px] py-0 px-1 font-normal"
              >
                {isMy ? "My Account" : `Other (${account.profitSharePercent}%)`}
              </Badge>
              {summary.totalApplications > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {summary.totalApplications} apps ({summary.allottedCount + summary.soldCount} allotted)
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
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleArchive}>
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
              Total Applied
            </span>
            <span className="font-bold text-foreground font-mono">
              {formatCurrency(summary.totalApplied)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">
              Invested (Allotted)
            </span>
            <span className="font-bold text-foreground font-mono">
              {formatCurrency(summary.totalInvested)}
            </span>
          </div>
        </div>

        {/* Realized Returns Panel */}
        <div className="flex flex-col gap-1 rounded-none border border-border/60 bg-muted/20 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Your Realized Net Profit:
            </span>
            <span
              className={`font-bold font-mono ${
                summary.totalRealizedYourProfit > 0
                  ? "text-success"
                  : summary.totalRealizedYourProfit < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {formatCurrency(summary.totalRealizedYourProfit)}
            </span>
          </div>

          {!isMy && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-1 font-mono">
              <span>Owner&apos;s Cut ({account.profitSharePercent}%):</span>
              <span
                className={
                  summary.totalRealizedProfitShared > 0
                    ? "font-semibold text-warning-foreground"
                    : "text-muted-foreground"
                }
              >
                {formatCurrency(summary.totalRealizedProfitShared)}
              </span>
            </div>
          )}
        </div>

        {/* Notes (if any) */}
        {account.notes && (
          <p className="text-[11px] text-muted-foreground italic truncate">
            {account.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
