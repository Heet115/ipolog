"use client"

import { useState, useCallback, useMemo } from "react"
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
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  deleteApplication,
  deleteApplicationsBatch,
  updateApplicationSettlement,
  updateApplicationsBankBatch,
  updateApplicationsStatusBatch,
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

function getBankDisplayName(bank: BankAccount): string {
  const parts: string[] = [bank.bankName]
  if (bank.nickname && bank.nickname !== bank.bankName) {
    parts.push(`(${bank.nickname})`)
  }
  if (bank.last4) {
    parts.push(`••••${bank.last4}`)
  }
  return parts.join(" ")
}

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

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [targetBankId, setTargetBankId] = useState<string>("")
  const [updatingBank, setUpdatingBank] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Map for fast lookups
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const bankMap = useMemo(
    () => new Map(bankAccounts.map((b) => [b.id, b])),
    [bankAccounts]
  )

  const activeBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !b.archived),
    [bankAccounts]
  )

  // Filter selected applications
  const selectedApps = useMemo(
    () => applications.filter((a) => selectedIds.includes(a.id)),
    [applications, selectedIds]
  )
  const selectedLots = useMemo(
    () => selectedApps.reduce((acc, a) => acc + a.lotsApplied, 0),
    [selectedApps]
  )
  const selectedAmount = useMemo(
    () => selectedApps.reduce((acc, a) => acc + a.amountApplied, 0),
    [selectedApps]
  )

  const handleBulkStatus = useCallback(
    async (status: ApplicationStatus) => {
      if (selectedApps.length === 0) return
      setUpdatingStatus(true)
      try {
        const updates = selectedApps.map((app) => ({
          applicationId: app.id,
          status,
          allottedLots: status === "allotted" ? app.lotsApplied : 0,
          allottedShares: status === "allotted" ? app.sharesApplied : 0,
        }))
        await updateApplicationsStatusBatch(userId, updates)
        toast.add({
          title: `Updated ${selectedApps.length} application(s)`,
          description: `Status marked as ${
            status === "allotted"
              ? "Allotted"
              : status === "not_allotted"
                ? "Not Allotted"
                : "Pending"
          }.`,
          type: "success",
        })
        setSelectedIds([])
        onRefresh()
      } catch (err) {
        console.error("Bulk status error:", err)
        toast.add({
          title: "Failed to update applications",
          type: "error",
        })
      } finally {
        setUpdatingStatus(false)
      }
    },
    [selectedApps, userId, onRefresh]
  )

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await deleteApplicationsBatch(userId, selectedIds)
      toast.add({
        title: `Deleted ${selectedIds.length} application(s)`,
        type: "success",
      })
      setSelectedIds([])
      setBulkDeleteOpen(false)
      onRefresh()
    } catch (err) {
      console.error("Bulk delete error:", err)
      toast.add({
        title: "Failed to delete applications",
        type: "error",
      })
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, userId, onRefresh])

  const handleBulkChangeBank = useCallback(async () => {
    if (selectedIds.length === 0 || !targetBankId) return
    setUpdatingBank(true)
    try {
      await updateApplicationsBankBatch(userId, selectedIds, targetBankId)
      const targetBank = bankMap.get(targetBankId)
      toast.add({
        title: `Bank account updated`,
        description: `Changed funding bank to ${targetBank?.bankName || "selected bank"} for ${selectedIds.length} application(s).`,
        type: "success",
      })
      setSelectedIds([])
      setBankDialogOpen(false)
      onRefresh()
    } catch (err) {
      console.error("Bulk bank update error:", err)
      toast.add({
        title: "Failed to update bank account",
        type: "error",
      })
    } finally {
      setUpdatingBank(false)
    }
  }, [selectedIds, targetBankId, bankMap, userId, onRefresh])

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
    const nextStatus =
      app.settlementStatus === "settled" ? "pending" : "settled"
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
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            Allotted
          </Badge>
        )
      case "not_allotted":
        return (
          <Badge
            variant="secondary"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            Not Allotted
          </Badge>
        )
      case "sold":
        return (
          <Badge
            variant="info"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase"
          >
            Sold
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge
            variant="outline"
            className="rounded-none px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
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
        const accA = accountMap.get(a.accountId)
        const accB = accountMap.get(b.accountId)
        const ai = accA?.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bi = accB?.sortIndex ?? Number.MAX_SAFE_INTEGER
        if (ai !== bi) return ai - bi
        const nameA = accA?.name || ""
        const nameB = accB?.name || ""
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
              {account?.sortIndex !== undefined && (
                <span className="font-mono text-[9px] text-muted-foreground">
                  #{account.sortIndex + 1}
                </span>
              )}
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
                  className="mt-0.5 inline-flex cursor-pointer items-center gap-1"
                  title={
                    isSettled
                      ? "Click to revert to pending"
                      : "Click to mark as settled"
                  }
                >
                  <Badge
                    variant={isSettled ? "success" : "warning"}
                    className="px-1.5 py-0 text-[9px] font-medium tracking-tight transition-opacity hover:opacity-80"
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
                className="size-7 text-muted-foreground hover:bg-success/10 hover:text-success"
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
                        className="text-success"
                      />
                      WhatsApp Settlement
                    </DropdownMenuItem>
                  )}
                  {app.status === "sold" && account?.type === "other" && (
                    <DropdownMenuItem
                      onClick={() => handleToggleSettlement(app)}
                    >
                      {app.settlementStatus === "settled" ? (
                        <>
                          <RotateCcw data-icon="inline-start" />
                          Revert to Pending
                        </>
                      ) : (
                        <>
                          <CheckCheck
                            data-icon="inline-start"
                            className="text-success"
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
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        batchActions={() => (
          <div className="flex flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={updatingStatus}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    {updatingStatus ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-success" />
                    )}
                    Mark Status
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("allotted")}
                  >
                    <CheckCircle2
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Mark Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("not_allotted")}
                  >
                    <XCircle
                      data-icon="inline-start"
                      className="text-muted-foreground"
                    />
                    Mark Not Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("pending")}
                  >
                    <Clock
                      data-icon="inline-start"
                      className="text-warning-foreground"
                    />
                    Revert to Pending
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setTargetBankId(activeBankAccounts[0]?.id || "")
                setBankDialogOpen(true)
              }}
              disabled={activeBankAccounts.length === 0}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Landmark className="size-3.5" />
              Change Bank
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setBulkDeleteOpen(true)}
              className="h-8 gap-1.5 border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete ({selectedIds.length})
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedIds([])}
              title="Clear selection"
              aria-label="Clear selection"
              className="size-8"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
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

      {/* Sticky Floating Bulk Actions Bar (for convenient access on scroll) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-none border border-border bg-background/95 px-4 py-2.5 shadow-xl backdrop-blur-md sm:gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="default"
              className="rounded-none px-2 py-0.5 font-mono text-[11px] font-bold"
            >
              {selectedIds.length}
            </Badge>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-foreground">
                {selectedIds.length} application
                {selectedIds.length > 1 ? "s" : ""} selected
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {selectedLots} lots • {formatCurrency(selectedAmount)}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-border/60" />

          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="xs"
                    disabled={updatingStatus}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    {updatingStatus ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-success-foreground" />
                    )}
                    Status
                    <ChevronDown className="size-3 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="center" className="w-48 text-xs">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("allotted")}
                  >
                    <CheckCircle2
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Mark Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("not_allotted")}
                  >
                    <XCircle
                      data-icon="inline-start"
                      className="text-muted-foreground"
                    />
                    Mark Not Allotted
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatus("pending")}
                  >
                    <Clock
                      data-icon="inline-start"
                      className="text-warning-foreground"
                    />
                    Revert to Pending
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setTargetBankId(activeBankAccounts[0]?.id || "")
                setBankDialogOpen(true)
              }}
              disabled={activeBankAccounts.length === 0}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Landmark className="size-3.5" />
              <span className="hidden sm:inline">Change</span> Bank
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setBulkDeleteOpen(true)}
              className="h-8 gap-1.5 border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedIds([])}
              title="Clear selection"
              aria-label="Clear selection"
              className="size-8"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete {selectedIds.length} Application
                  {selectedIds.length > 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This action will permanently delete the selected application
                  records.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 py-3 text-xs">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/20 p-2.5">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Lots
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedLots} Lots
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Capital Applied
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(selectedAmount)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Associated profit metrics and blocked funds calculations will be
              updated immediately.
            </p>
          </div>

          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={bulkDeleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {bulkDeleting ? (
                <>
                  <Spinner className="size-3.5" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.length} Applications`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Bank Dialog */}
      <Dialog
        open={bankDialogOpen}
        onOpenChange={(open) => !open && setBankDialogOpen(false)}
      >
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
                <Landmark className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Change Funding Bank
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update the bank account for {selectedIds.length} selected
                  application{selectedIds.length > 1 ? "s" : ""}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/20 p-2.5 text-xs">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Applications
                </span>
                <span className="font-mono font-bold text-foreground">
                  {selectedIds.length} Apps ({selectedLots} Lots)
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Total Blocked Amount
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(selectedAmount)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="target-bank"
                className="text-xs font-semibold text-foreground"
              >
                Select New Bank Account
              </label>
              <Select
                value={targetBankId}
                onValueChange={(val) => val && setTargetBankId(val)}
              >
                <SelectTrigger
                  id="target-bank"
                  className="h-9 w-full bg-background text-xs"
                >
                  <SelectValue placeholder="Choose a bank account">
                    {(val) => {
                      const bank = bankMap.get(val || targetBankId)
                      return bank
                        ? getBankDisplayName(bank)
                        : "Choose a bank account"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeBankAccounts.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      label={getBankDisplayName(b)}
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="font-medium">
                          {getBankDisplayName(b)}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ASBA Limit: {b.asbaLimit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBankDialogOpen(false)}
              disabled={updatingBank}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkChangeBank}
              disabled={updatingBank || !targetBankId}
              className="rounded-none text-xs"
            >
              {updatingBank ? (
                <>
                  <Spinner className="size-3.5" />
                  Updating...
                </>
              ) : (
                "Update Bank Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(appToDelete)}
        onOpenChange={(open) => !open && setAppToDelete(null)}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Remove Application?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to remove this application for{" "}
                  <strong>
                    {accountMap.get(appToDelete?.accountId || "")?.name ||
                      "this account"}
                  </strong>
                  ? All recorded lots and allotment data will be cleared.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {deleting ? "Removing..." : "Remove Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
