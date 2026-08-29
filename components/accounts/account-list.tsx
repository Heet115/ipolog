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

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar: Search & Archive Toggle */}
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

        {archivedCount > 0 && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowArchived(!showArchived)}
            className="h-8 self-start text-xs sm:self-auto"
          >
            {showArchived
              ? "Hide Archived"
              : `Show Archived (${archivedCount})`}
          </Button>
        )}
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
  return (
    <Card
      className={`group relative overflow-hidden rounded-none border border-border/70 transition-all hover:border-foreground/30 ${
        account.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex h-full flex-col justify-between gap-3.5 p-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold text-foreground">
                {account.name}
              </span>
              {account.archived && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[10px]"
                >
                  Archived
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {account.type === "my" ? (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] font-normal"
                >
                  My Account (100% to You)
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="px-1.5 py-0 text-[10px] font-normal"
                >
                  Other ({account.profitSharePercent}% Share)
                </Badge>
              )}
            </div>
          </div>

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
              <span className="sr-only">Account actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Details
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

        {/* Account Statistics Grid */}
        <div className="grid grid-cols-2 gap-2 rounded-none border border-border/50 bg-muted/40 p-2.5 text-xs">
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Invested Value
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.totalInvested)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground">
              Total Applied
            </span>
            <span className="font-mono font-semibold text-foreground">
              {formatCurrency(summary.totalApplied)}
            </span>
          </div>

          {summary.soldCount > 0 && (
            <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-1.5 text-[11px]">
              <span className="text-muted-foreground">Your Net P&L:</span>
              <span
                className={`font-mono font-bold ${
                  summary.totalRealizedYourProfit > 0
                    ? "text-success"
                    : summary.totalRealizedYourProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(summary.totalRealizedYourProfit)}
              </span>
            </div>
          )}

          {account.type === "other" &&
            summary.totalRealizedProfitShared > 0 && (
              <div className="col-span-2 flex items-center justify-between font-mono text-[10px] text-warning-foreground">
                <span>Owner Profit Share:</span>
                <span className="font-medium">
                  {formatCurrency(summary.totalRealizedProfitShared)}
                </span>
              </div>
            )}

          <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-1 text-[10px] text-muted-foreground">
            <span>{summary.totalApplications} Applications:</span>
            <span className="font-medium text-foreground">
              {summary.allottedCount} Allotted • {summary.soldCount} Sold •{" "}
              {summary.pendingCount} Pending
            </span>
          </div>
        </div>

        {account.notes && (
          <p className="line-clamp-2 rounded-none border border-border/40 bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {account.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
