"use client"

import { useState } from "react"
import {
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  Layers,
  Calendar,
  TrendingUp,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { deleteApplication } from "@/lib/firebase/applications"
import {
  calculateApplicationProfit,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount, formatDate } from "@/lib/utils/ipo"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

interface ApplicationTableProps {
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  ipo: Ipo
  userId: string
  onEdit: (application: Application) => void
  onRecordSale: (application: Application) => void
  onRefresh: () => void
}

export function ApplicationTable({
  applications,
  accounts,
  bankAccounts,
  ipo,
  userId,
  onEdit,
  onRecordSale,
  onRefresh,
}: ApplicationTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [appToDelete, setAppToDelete] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Map for fast lookups
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const account = accountMap.get(app.accountId)
    const bank = bankMap.get(app.bankAccountId)

    if (statusFilter !== "all" && app.status !== statusFilter) {
      return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const accName = account?.name?.toLowerCase() || ""
      const bName = bank?.bankName?.toLowerCase() || ""
      const bNick = bank?.nickname?.toLowerCase() || ""
      const bLast4 = bank?.last4 || ""
      const notes = app.notes?.toLowerCase() || ""

      return (
        accName.includes(q) ||
        bName.includes(q) ||
        bNick.includes(q) ||
        bLast4.includes(q) ||
        notes.includes(q)
      )
    }

    return true
  })

  const handleDelete = async () => {
    if (!appToDelete) return
    setDeleting(true)

    try {
      await deleteApplication(userId, appToDelete.id)
      toast.add({
        title: "Application removed",
        type: "success",
      })
      setAppToDelete(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to delete application",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
            Pending
          </Badge>
        )
      case "allotted":
        return (
          <Badge variant="default" className="text-[10px] py-0 px-1.5 font-normal bg-emerald-600 dark:bg-emerald-500">
            Allotted
          </Badge>
        )
      case "not_allotted":
        return (
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
            Not Allotted
          </Badge>
        )
      case "sold":
        return (
          <Badge variant="default" className="text-[10px] py-0 px-1.5 font-normal bg-blue-600 dark:bg-blue-500">
            Sold
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Summary figures
  const totalAmount = applications.reduce((sum, a) => sum + a.amountApplied, 0)
  const totalLots = applications.reduce((sum, a) => sum + a.lotsApplied, 0)

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search application account, bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "all", label: `All (${applications.length})` },
            {
              key: "pending",
              label: `Pending (${applications.filter((a) => a.status === "pending").length})`,
            },
            {
              key: "allotted",
              label: `Allotted (${applications.filter((a) => a.status === "allotted").length})`,
            },
            {
              key: "not_allotted",
              label: `Not Allotted (${applications.filter((a) => a.status === "not_allotted").length})`,
            },
            {
              key: "sold",
              label: `Sold (${applications.filter((a) => a.status === "sold").length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border rounded-md border-dashed">
          <Layers className="size-6 text-muted-foreground/50 mb-1" />
          <p className="text-xs font-medium text-foreground">
            No matching applications found
          </p>
          <p className="text-[11px] text-muted-foreground">
            {search || statusFilter !== "all"
              ? "Try clearing your filters"
              : "Click 'Add Applications' above to record applications"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Account</TableHead>
                <TableHead className="text-xs">Bank Account</TableHead>
                <TableHead className="text-xs text-center w-[70px]">
                  Lots
                </TableHead>
                <TableHead className="text-xs text-right">Shares</TableHead>
                <TableHead className="text-xs text-right">Applied / Cost</TableHead>
                <TableHead className="text-xs text-right">Profit (You)</TableHead>
                <TableHead className="text-xs text-center w-[100px]">
                  Status
                </TableHead>
                <TableHead className="text-xs hidden md:table-cell">
                  Date
                </TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApps.map((app) => {
                const account = accountMap.get(app.accountId)
                const bank = bankMap.get(app.bankAccountId)
                const profit = calculateApplicationProfit(app, ipo, account)

                return (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{account?.name || "Unknown Account"}</span>
                        {account && (
                          <Badge
                            variant={
                              account.type === "my" ? "secondary" : "default"
                            }
                            className="text-[9px] py-0 px-1 font-normal"
                          >
                            {account.type === "my"
                              ? "My"
                              : `${account.profitSharePercent}%`}
                          </Badge>
                        )}
                      </div>
                      {app.notes && (
                        <span className="text-[10px] text-muted-foreground block line-clamp-1">
                          {app.notes}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {bank ? formatBankAccount(bank) : "—"}
                    </TableCell>

                    <TableCell className="text-center font-medium text-xs">
                      <span>{app.lotsApplied}</span>
                      {(app.status === "allotted" || app.status === "sold") &&
                        app.allottedLots !== undefined && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                            ({app.allottedLots} alltd)
                          </span>
                        )}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground">
                      <span>{app.sharesApplied}</span>
                      {(app.status === "allotted" || app.status === "sold") &&
                        app.allottedShares !== undefined && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                            {app.allottedShares} alltd
                          </span>
                        )}
                    </TableCell>

                    <TableCell className="text-right font-medium text-xs text-foreground">
                      <span>{formatCurrency(app.amountApplied)}</span>
                      {app.status === "sold" && app.salePrice && (
                        <span className="text-[10px] text-muted-foreground block">
                          Sold @ ₹{app.salePrice}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      {profit.hasRealized ? (
                        <div>
                          <span
                            className={`font-bold ${
                              profit.realizedYourProfit > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : profit.realizedYourProfit < 0
                                  ? "text-destructive"
                                  : "text-foreground"
                            }`}
                          >
                            {formatCurrency(profit.realizedYourProfit)}
                          </span>
                          {account?.type === "other" &&
                            profit.realizedProfitShared > 0 && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 block">
                                (+{formatCurrency(profit.realizedProfitShared)} shr)
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {getStatusBadge(app.status)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(app.applicationDate)}
                      </span>
                    </TableCell>

                    <TableCell>
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
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {(app.status === "allotted" ||
                            app.status === "sold") && (
                            <DropdownMenuItem onClick={() => onRecordSale(app)}>
                              <TrendingUp className="mr-2 size-3.5 text-emerald-600 dark:text-emerald-400" />
                              {app.status === "sold" ? "Edit Sale" : "Record Sale"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(app)}>
                            <Edit2 className="mr-2 size-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setAppToDelete(app)}
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Table Summary Footer */}
          <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground font-medium">
              Total: {applications.length} Applications ({totalLots} Lots)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Applied:</span>
              <span className="font-bold text-foreground">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(appToDelete)}
        onOpenChange={(open) => !open && setAppToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this application for{" "}
              <strong>
                {accountMap.get(appToDelete?.accountId || "")?.name ||
                  "this account"}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Removing..." : "Remove Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
