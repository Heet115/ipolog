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
  Lock,
  CheckCircle2,
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
        title: bank.archived ? "Bank account restored" : "Bank account archived",
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

  return (
    <div className="space-y-6">
      {/* Search & Archived Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bank accounts..."
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
            <Landmark className="mb-3 size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium text-foreground">
              No matching bank accounts found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search
                ? "Try clearing your search query"
                : "Add your first bank account to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <strong>{bankToDelete?.bankName}</strong>
              {bankToDelete?.last4 ? ` (•${bankToDelete.last4})` : ""}? This
              action cannot be undone.
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
      className={`group relative overflow-hidden transition-all hover:border-foreground/20 ${
        bank.archived ? "opacity-60 bg-muted/20" : ""
      }`}
    >
      <CardContent className="flex flex-col justify-between p-3.5 space-y-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Landmark className="size-4" />
            </div>

            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-foreground truncate">
                  {bank.nickname || bank.bankName}
                </span>
                {bank.archived && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                    Archived
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {bank.nickname && (
                  <span className="truncate">{bank.bankName}</span>
                )}
                {bank.last4 && (
                  <span className="font-mono">
                    {bank.nickname ? `• ${bank.last4}` : `•${bank.last4}`}
                  </span>
                )}
              </div>
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
              <span className="sr-only">Bank actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="mr-2 size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleArchive}>
                {bank.archived ? (
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

        {/* Money State Summary (Section 15 of spec) */}
        <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-2.5 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="size-2.5" /> Blocked Money
            </span>
            <span
              className={`font-semibold text-xs ${
                summary.blockedAmount > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {formatCurrency(summary.blockedAmount)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-2.5" /> Invested
            </span>
            <span className="font-semibold text-xs text-foreground">
              {formatCurrency(summary.investedAmount)}
            </span>
          </div>

          <div className="col-span-2 pt-1 border-t border-border/50 flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Total Applied:</span>
            <span className="font-medium text-foreground">
              {formatCurrency(summary.totalApplied)} ({summary.totalApplicationsCount} apps)
            </span>
          </div>
        </div>

        {/* Related IPOs */}
        {summary.relatedIpos.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] text-muted-foreground block">
              Related IPOs ({summary.relatedIpos.length})
            </span>
            <div className="flex flex-wrap gap-1">
              {summary.relatedIpos.slice(0, 3).map((ipo) => (
                <Badge
                  key={ipo.id}
                  variant="outline"
                  className="text-[9px] py-0 px-1 font-normal"
                >
                  {ipo.name}
                </Badge>
              ))}
              {summary.relatedIpos.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{summary.relatedIpos.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {bank.notes && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-1.5 rounded">
            {bank.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
