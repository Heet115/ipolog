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

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar: Search & Archive Toggle */}
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
      className={`group relative overflow-hidden rounded-none border border-border/70 transition-all hover:border-foreground/30 ${
        bank.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex h-full flex-col justify-between gap-3.5 p-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-bold text-foreground">
                {bank.nickname || bank.bankName}
              </span>
              {bank.archived && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[10px]"
                >
                  Archived
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              {bank.nickname && (
                <span className="truncate">{bank.bankName}</span>
              )}
              {bank.last4 && (
                <span>
                  {bank.nickname ? `• ••${bank.last4}` : `••${bank.last4}`}
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
                  className="size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Bank actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Details
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

        {/* Money State Summary Grid */}
        <div className="grid grid-cols-2 gap-2 rounded-none border border-border/50 bg-muted/40 p-2.5 text-xs">
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Blocked Funds
            </span>
            <span
              className={`font-mono text-xs font-bold ${
                summary.blockedAmount > 0
                  ? "text-warning-foreground"
                  : "text-foreground"
              }`}
            >
              {formatCurrency(summary.blockedAmount)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-muted-foreground">
              Invested Capital
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(summary.investedAmount)}
            </span>
          </div>

          <div className="col-span-2 flex items-center justify-between border-t border-border/50 pt-1 text-[11px]">
            <span className="text-muted-foreground">Total Processed:</span>
            <span className="font-mono font-semibold text-foreground">
              {formatCurrency(summary.totalApplied)} (
              {summary.totalApplicationsCount} apps)
            </span>
          </div>
        </div>

        {/* Related IPOs */}
        {summary.relatedIpos.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="block text-[10px] text-muted-foreground">
              Active Applications in:
            </span>
            <div className="flex flex-wrap gap-1">
              {summary.relatedIpos.slice(0, 3).map((ipo) => (
                <Badge
                  key={ipo.id}
                  variant="outline"
                  className="px-1 py-0 font-mono text-[9px] font-normal"
                >
                  {ipo.name}
                </Badge>
              ))}
              {summary.relatedIpos.length > 3 && (
                <span className="self-center text-[10px] text-muted-foreground">
                  +{summary.relatedIpos.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {bank.notes && (
          <p className="line-clamp-2 rounded-none border border-border/40 bg-muted/30 p-2 text-[11px] text-muted-foreground">
            {bank.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
