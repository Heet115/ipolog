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
  CheckCircle2,
  Layers,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
        title: "Failed to update account archive state",
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
    <div className="space-y-6">
      {/* Controls Bar: Search & Archived Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {archivedCount > 0 && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs"
          >
            {showArchived
              ? "Hide Archived"
              : `Show Archived (${archivedCount})`}
          </Button>
        )}
      </div>

      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium text-foreground">
              No matching application accounts found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search
                ? "Try clearing your search query"
                : "Add your first application account to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* My Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                My Accounts ({myAccounts.length})
              </h2>
            </div>

            {myAccounts.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No &quot;My Accounts&quot; recorded.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          {/* Other Accounts Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Other Accounts ({otherAccounts.length})
              </h2>
            </div>

            {otherAccounts.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No &quot;Other Accounts&quot; recorded.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      className={`group relative overflow-hidden transition-all hover:border-foreground/20 ${
        account.archived ? "opacity-60 bg-muted/20" : ""
      }`}
    >
      <CardContent className="flex flex-col justify-between p-3.5 space-y-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-foreground truncate">
                {account.name}
              </span>
              {account.archived && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  Archived
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {account.type === "my" ? (
                <Badge
                  variant="secondary"
                  className="text-[10px] py-0 px-1.5 font-normal"
                >
                  My Account (0%)
                </Badge>
              ) : (
                <Badge
                  variant="default"
                  className="text-[10px] py-0 px-1.5 font-normal"
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
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Account actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleArchive}>
                {account.archived ? (
                  <>
                    <ArchiveRestore className="mr-2 size-3.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 size-3.5" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Account Statistics (Section 16 of spec) */}
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-2.5" /> Invested
            </span>
            <span className="font-semibold text-xs text-foreground">
              {formatCurrency(summary.totalInvested)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Layers className="size-2.5" /> Applied
            </span>
            <span className="font-semibold text-xs text-foreground">
              {formatCurrency(summary.totalApplied)}
            </span>
          </div>

          {summary.soldCount > 0 && (
            <div className="col-span-2 pt-1 border-t border-border/50 flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Realized Profit (You):</span>
              <span
                className={`font-bold ${
                  summary.totalRealizedYourProfit > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : summary.totalRealizedYourProfit < 0
                      ? "text-destructive"
                      : "text-foreground"
                }`}
              >
                {formatCurrency(summary.totalRealizedYourProfit)}
              </span>
            </div>
          )}

          {account.type === "other" && summary.totalRealizedProfitShared > 0 && (
            <div className="col-span-2 flex justify-between items-center text-[10px] text-amber-600 dark:text-amber-400">
              <span>Shared with Account:</span>
              <span className="font-medium">
                {formatCurrency(summary.totalRealizedProfitShared)}
              </span>
            </div>
          )}

          <div className="col-span-2 pt-1 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
            <span>
              {summary.totalApplications} Applications:
            </span>
            <span className="font-medium text-foreground">
              {summary.allottedCount} Allotted • {summary.soldCount} Sold • {summary.pendingCount} Pending
            </span>
          </div>
        </div>

        {account.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-1.5 rounded">
            {account.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
