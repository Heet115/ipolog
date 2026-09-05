"use client"

import { useState } from "react"
import {
  MoreVertical,
  Edit2,
  Trash2,
  TrendingUp,
  Layers,
  Calendar,
  Landmark,
  MessageSquare,
  CheckCheck,
  RotateCcw,
} from "lucide-react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilterPill,
} from "@/components/ui/data-table"
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
  deleteApplication,
  updateApplicationSettlement,
} from "@/lib/firebase/applications"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount, formatDate } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
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
  onWhatsAppSettlement?: (application: Application) => void
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
  onWhatsAppSettlement,
  onRefresh,
}: ApplicationTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [appToDelete, setAppToDelete] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Map for fast lookups
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

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

  const handleToggleSettlement = async (app: Application) => {
    const nextStatus = app.settlementStatus === "settled" ? "pending" : "settled"
    try {
      await updateApplicationSettlement(userId, app.id, nextStatus)
      toast.add({
        title:
          nextStatus === "settled"
            ? "Marked as Settled"
            : "Reverted to Pending Payment",
        type: "success",
      })
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to update settlement status",
        type: "error",
      })
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

  // Filter pills counts
  const pendingCount = applications.filter((a) => a.status === "pending").length
  const allottedCount = applications.filter(
    (a) => a.status === "allotted"
  ).length
  const notAllottedCount = applications.filter(
    (a) => a.status === "not_allotted"
  ).length
  const soldCount = applications.filter((a) => a.status === "sold").length
  const unsettledCount = applications.filter(
    (a) =>
      a.status === "sold" &&
      accountMap.get(a.accountId)?.type === "other" &&
      a.settlementStatus !== "settled"
  ).length

  const filterPills: DataTableFilterPill[] = [
    {
      id: "all",
      label: "All",
      count: applications.length,
      active: statusFilter === "all",
      onToggle: () => setStatusFilter("all"),
    },
    {
      id: "pending",
      label: "Pending",
      count: pendingCount,
      active: statusFilter === "pending",
      onToggle: () =>
        setStatusFilter(statusFilter === "pending" ? "all" : "pending"),
    },
    {
      id: "allotted",
      label: "Allotted",
      count: allottedCount,
      active: statusFilter === "allotted",
      onToggle: () =>
        setStatusFilter(statusFilter === "allotted" ? "all" : "allotted"),
    },
    {
      id: "not_allotted",
      label: "Not Allotted",
      count: notAllottedCount,
      active: statusFilter === "not_allotted",
      onToggle: () =>
        setStatusFilter(
          statusFilter === "not_allotted" ? "all" : "not_allotted"
        ),
    },
    {
      id: "sold",
      label: "Sold",
      count: soldCount,
      active: statusFilter === "sold",
      onToggle: () => setStatusFilter(statusFilter === "sold" ? "all" : "sold"),
    },
    ...(unsettledCount > 0
      ? [
          {
            id: "unsettled",
            label: "Unsettled",
            count: unsettledCount,
            active: statusFilter === "unsettled",
            onToggle: () =>
              setStatusFilter(
                statusFilter === "unsettled" ? "all" : "unsettled"
              ),
          },
        ]
      : []),
  ]

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === "all") return true
    if (statusFilter === "unsettled") {
      return (
        app.status === "sold" &&
        accountMap.get(app.accountId)?.type === "other" &&
        app.settlementStatus !== "settled"
      )
    }
    return app.status === statusFilter
  })

  // Aggregate stats for footer
  const totalLots = filteredApplications.reduce(
    (sum, a) => sum + a.lotsApplied,
    0
  )
  const totalAmount = filteredApplications.reduce(
    (sum, a) => sum + a.amountApplied,
    0
  )

  const columns: DataTableColumn<Application>[] = [
    {
      id: "account",
      header: "Account",
      sortable: true,
      sortFn: (a, b) => {
        const nameA = accountMap.get(a.accountId)?.name || ""
        const nameB = accountMap.get(b.accountId)?.name || ""
        return nameA.localeCompare(nameB)
      },
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        return (
          <div className="flex max-w-[220px] min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="block truncate text-xs font-bold text-foreground"
                title={account?.name || "Unknown"}
              >
                {account?.name || "Unknown"}
              </span>
              <Badge
                variant={account?.type === "my" ? "secondary" : "default"}
                className="shrink-0 px-1 py-0 text-[9px] font-normal"
              >
                {account?.type === "my"
                  ? "My"
                  : `${account?.profitSharePercent}%`}
              </Badge>
            </div>
            {app.applicationDate && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <Calendar className="size-2.5" />
                {formatDate(app.applicationDate)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: "bankAccount",
      header: "Bank Account",
      sortable: true,
      sortFn: (a, b) => {
        const bankA = bankMap.get(a.bankAccountId)?.bankName || ""
        const bankB = bankMap.get(b.bankAccountId)?.bankName || ""
        return bankA.localeCompare(bankB)
      },
      cell: (app) => {
        const bank = bankMap.get(app.bankAccountId)
        return (
          <div className="flex max-w-[180px] items-center gap-1 truncate text-xs text-muted-foreground">
            <Landmark className="size-3 shrink-0" />
            <span className="truncate">
              {bank ? formatBankAccount(bank) : "—"}
            </span>
          </div>
        )
      },
    },
    {
      id: "category",
      header: "Quota",
      align: "center",
      sortable: true,
      sortFn: (a, b) => {
        const catA = a.category || inferCategoryFromAmount(a.amountApplied)
        const catB = b.category || inferCategoryFromAmount(b.amountApplied)
        return catA.localeCompare(catB)
      },
      cell: (app) => {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        const meta = CATEGORY_CONFIG[cat]
        return (
          <Badge
            variant={meta.badgeVariant}
            className="px-1.5 py-0 font-mono text-[10px]"
            title={`${meta.label} (${meta.amountLimitText})`}
          >
            {meta.shortLabel}
          </Badge>
        )
      },
    },
    {
      id: "lots",
      header: "Lots",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.lotsApplied - b.lotsApplied,
      cell: (app) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {app.lotsApplied}
        </span>
      ),
    },
    {
      id: "shares",
      header: "Shares",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.sharesApplied - b.sharesApplied,
      cell: (app) => (
        <span className="font-mono text-xs text-muted-foreground">
          {app.sharesApplied}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortFn: (a, b) => a.amountApplied - b.amountApplied,
      cell: (app) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {formatCurrency(app.amountApplied)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
      cell: (app) => getStatusBadge(app.status),
    },
    {
      id: "allotmentReturn",
      header: "Allotment / Return",
      align: "right",
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        if (app.status === "allotted") {
          const shares =
            app.allottedShares || (app.allottedLots || 1) * ipo.lotSize
          const currPrice = ipo.currentPrice || ipo.listingPrice
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs font-semibold text-foreground">
                {shares} sh ({app.allottedLots || 1} lot)
              </span>
              {currPrice && (
                <span className="font-mono text-[10px] font-semibold text-success">
                  CMP: {formatCurrency(currPrice)}
                </span>
              )}
            </div>
          )
        }

        if (app.status === "sold") {
          const profit = calculateApplicationProfit(app, ipo, account)
          const isOtherAccount = account?.type === "other"
          const isSettled = app.settlementStatus === "settled"

          return (
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-xs font-bold text-success">
                {formatCurrency(profit.realizedYourProfit)}
              </span>
              {profit.realizedProfitShared > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Shared: {formatCurrency(profit.realizedProfitShared)}
                </span>
              )}
              {isOtherAccount && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleSettlement(app)
                  }}
                  className="mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                  title={isSettled ? "Click to revert to pending" : "Click to mark as settled"}
                >
                  <Badge
                    variant={isSettled ? "success" : "warning"}
                    className="px-1.5 py-0 text-[9px] font-medium tracking-tight hover:opacity-80 transition-opacity"
                  >
                    {isSettled ? "Settled" : "Unsettled"}
                  </Badge>
                </button>
              )}
            </div>
          )
        }

        if (app.status === "not_allotted") {
          return (
            <span className="font-mono text-[11px] text-muted-foreground">
              Refund: {formatCurrency(app.amountApplied)}
            </span>
          )
        }

        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      id: "actions",
      header: "",
      align: "right",
      sortable: false,
      cell: (app) => {
        const account = accountMap.get(app.accountId)
        const canSettle =
          (app.status === "allotted" || app.status === "sold") &&
          Boolean(onWhatsAppSettlement)

        return (
          <div className="flex items-center justify-end gap-1">
            {canSettle && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onWhatsAppSettlement?.(app)}
                className="size-7 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                title="WhatsApp Settlement Report"
              >
                <MessageSquare className="size-3.5" />
                <span className="sr-only">WhatsApp Settlement</span>
              </Button>
            )}

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
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuGroup>
                  {(app.status === "allotted" || app.status === "sold") && (
                    <DropdownMenuItem onClick={() => onRecordSale(app)}>
                      <TrendingUp data-icon="inline-start" />
                      {app.status === "sold"
                        ? "Edit Sale Details"
                        : "Record Sale"}
                    </DropdownMenuItem>
                  )}
                  {canSettle && (
                    <DropdownMenuItem
                      onClick={() => onWhatsAppSettlement?.(app)}
                    >
                      <MessageSquare
                        data-icon="inline-start"
                        className="text-emerald-500"
                      />
                      WhatsApp Settlement
                    </DropdownMenuItem>
                  )}
                  {app.status === "sold" && account?.type === "other" && (
                    <DropdownMenuItem onClick={() => handleToggleSettlement(app)}>
                      {app.settlementStatus === "settled" ? (
                        <>
                          <RotateCcw data-icon="inline-start" />
                          Revert to Pending
                        </>
                      ) : (
                        <>
                          <CheckCheck
                            data-icon="inline-start"
                            className="text-emerald-600 dark:text-emerald-400"
                          />
                          Mark as Settled
                        </>
                      )}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(app)}>
                    <Edit2 data-icon="inline-start" />
                    Edit Application
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
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <DataTable
        data={filteredApplications}
        columns={columns}
        keyExtractor={(app) => app.id}
        searchable={true}
        searchPlaceholder="Search accounts, banks, notes..."
        searchFields={[
          (app) => accountMap.get(app.accountId)?.name,
          (app) => bankMap.get(app.bankAccountId)?.bankName,
          (app) => bankMap.get(app.bankAccountId)?.nickname,
          (app) => bankMap.get(app.bankAccountId)?.last4,
          (app) => {
            const cat =
              app.category || inferCategoryFromAmount(app.amountApplied)
            return `${CATEGORY_CONFIG[cat]?.label} ${CATEGORY_CONFIG[cat]?.shortLabel}`
          },
          (app) => app.notes,
        ]}
        filterPills={filterPills}
        pageSize={15}
        emptyTitle="No applications found"
        emptyDescription="No application records match your current filter criteria."
        emptyIcon={<Layers className="size-7 text-muted-foreground" />}
        footer={
          filteredApplications.length > 0 ? (
            <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5 text-xs">
              <span className="font-medium text-muted-foreground">
                Total: {filteredApplications.length} Applications ({totalLots}{" "}
                Lots)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Applied:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          ) : undefined
        }
      />

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
