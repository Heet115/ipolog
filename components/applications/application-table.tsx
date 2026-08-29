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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
import { deleteApplication } from "@/lib/firebase/applications"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
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
      return (
        accName.includes(q) ||
        bName.includes(q) ||
        bNick.includes(q) ||
        bLast4.includes(q) ||
        app.notes?.toLowerCase().includes(q)
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
        title: "Failed to remove application",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "allotted":
        return (
          <Badge
            variant="success"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Allotted
          </Badge>
        )
      case "not_allotted":
        return (
          <Badge
            variant="secondary"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Not Allotted
          </Badge>
        )
      case "sold":
        return (
          <Badge variant="info" className="px-1.5 py-0 text-[10px] font-normal">
            Sold
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            Pending
          </Badge>
        )
    }
  }

  const totalLots = applications.reduce((sum, a) => sum + a.lotsApplied, 0)
  const totalAmount = applications.reduce((sum, a) => sum + a.amountApplied, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar: Search & Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search account, bank, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Status Filters ToggleGroup */}
        <ToggleGroup
          value={[statusFilter]}
          onValueChange={(val) => {
            if (val && val[0]) setStatusFilter(val[0])
          }}
          className="flex flex-wrap"
        >
          <ToggleGroupItem value="all" className="h-7 px-2.5 text-xs">
            All ({applications.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="pending" className="h-7 px-2.5 text-xs">
            Pending ({applications.filter((a) => a.status === "pending").length}
            )
          </ToggleGroupItem>
          <ToggleGroupItem value="allotted" className="h-7 px-2.5 text-xs">
            Allotted (
            {applications.filter((a) => a.status === "allotted").length})
          </ToggleGroupItem>
          <ToggleGroupItem value="not_allotted" className="h-7 px-2.5 text-xs">
            Not Allotted (
            {applications.filter((a) => a.status === "not_allotted").length})
          </ToggleGroupItem>
          <ToggleGroupItem value="sold" className="h-7 px-2.5 text-xs">
            Sold ({applications.filter((a) => a.status === "sold").length})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filteredApps.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers />
            </EmptyMedia>
            <EmptyTitle>No matching applications</EmptyTitle>
            <EmptyDescription>
              {search || statusFilter !== "all"
                ? "Try clearing your filters"
                : "Click 'Add Applications' above to record applications"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-none border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Account</TableHead>
                <TableHead className="text-xs">Bank Account</TableHead>
                <TableHead className="w-[70px] text-center text-xs">
                  Lots
                </TableHead>
                <TableHead className="text-right text-xs">Shares</TableHead>
                <TableHead className="text-right text-xs">
                  Applied / Cost
                </TableHead>
                <TableHead className="text-right text-xs">
                  Profit (You)
                </TableHead>
                <TableHead className="w-[100px] text-center text-xs">
                  Status
                </TableHead>
                <TableHead className="hidden text-xs md:table-cell">
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
                    <TableCell className="text-xs font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{account?.name || "Unknown Account"}</span>
                        {account && (
                          <Badge
                            variant={
                              account.type === "my" ? "secondary" : "default"
                            }
                            className="px-1 py-0 text-[9px] font-normal"
                          >
                            {account.type === "my"
                              ? "My"
                              : `${account.profitSharePercent}%`}
                          </Badge>
                        )}
                      </div>
                      {app.notes && (
                        <span className="line-clamp-1 block text-[10px] text-muted-foreground">
                          {app.notes}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {bank ? formatBankAccount(bank) : "—"}
                    </TableCell>

                    <TableCell className="text-center text-xs font-medium">
                      <span>{app.lotsApplied}</span>
                      {(app.status === "allotted" || app.status === "sold") &&
                        app.allottedLots !== undefined && (
                          <span className="block text-[10px] text-success">
                            ({app.allottedLots} alltd)
                          </span>
                        )}
                    </TableCell>

                    <TableCell className="text-right text-xs text-muted-foreground">
                      <span>{app.sharesApplied}</span>
                      {(app.status === "allotted" || app.status === "sold") &&
                        app.allottedShares !== undefined && (
                          <span className="block text-[10px] font-medium text-success">
                            {app.allottedShares} alltd
                          </span>
                        )}
                    </TableCell>

                    <TableCell className="text-right text-xs font-medium text-foreground">
                      <span>{formatCurrency(app.amountApplied)}</span>
                      {app.status === "sold" && app.salePrice && (
                        <span className="block text-[10px] text-muted-foreground">
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
                                ? "text-success"
                                : profit.realizedYourProfit < 0
                                  ? "text-destructive"
                                  : "text-foreground"
                            }`}
                          >
                            {formatCurrency(profit.realizedYourProfit)}
                          </span>
                          {account?.type === "other" &&
                            profit.realizedProfitShared > 0 && (
                              <span className="block text-[9px] text-warning-foreground">
                                (+{formatCurrency(profit.realizedProfitShared)}{" "}
                                shr)
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      {getStatusBadge(app.status)}
                    </TableCell>

                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
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
                          <MoreVertical />
                          <span className="sr-only">Actions</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuGroup>
                            {(app.status === "allotted" ||
                              app.status === "sold") && (
                              <DropdownMenuItem
                                onClick={() => onRecordSale(app)}
                              >
                                <TrendingUp
                                  data-icon="inline-start"
                                  className="text-success"
                                />
                                {app.status === "sold"
                                  ? "Edit Sale"
                                  : "Record Sale"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onEdit(app)}>
                              <Edit2 data-icon="inline-start" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setAppToDelete(app)}
                            >
                              <Trash2 data-icon="inline-start" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Table Summary Footer */}
          <div className="flex items-center justify-between border-t border-border/50 bg-muted/40 px-4 py-2.5 text-xs">
            <span className="font-medium text-muted-foreground">
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
