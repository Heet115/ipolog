"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Search,
  X,
  Layers,
  Landmark,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  RotateCcw,
  MessageSquare,
  CheckCheck,
} from "lucide-react"
import {
  DataTable,
  type DataTableColumn,
  type DataTableFilterPill,
} from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  updateApplicationsBankBatch,
  updateApplicationsStatusBatch,
} from "@/lib/firebase/applications"
import { calculateApplicationProfit } from "@/lib/calculations/financials"
import { formatCurrency, formatDate } from "@/lib/utils/ipo"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
import { EditApplicationDialog } from "@/components/applications/edit-application-dialog"
import { RecordSaleDialog } from "@/components/applications/record-sale-dialog"
import { SettlementDialog } from "@/components/applications/settlement-dialog"
import { getBankDisplayName } from "@/lib/utils/bank-helpers"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
  ApplicationCategory,
} from "@/types"

interface MasterApplicationLedgerProps {
  ipos: Ipo[]
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  userId: string
  onRefresh: () => void
}

export function MasterApplicationLedger({
  ipos,
  applications,
  accounts,
  bankAccounts,
  userId,
  onRefresh,
}: MasterApplicationLedgerProps) {
  // Filters state
  const [selectedIpoId, setSelectedIpoId] = useState<string>("all")
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
  const [selectedBankId, setSelectedBankId] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [targetBankId, setTargetBankId] = useState<string>("")
  const [updatingBank, setUpdatingBank] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Single row action dialog states
  const [appToDelete, setAppToDelete] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [appToEdit, setAppToEdit] = useState<Application | null>(null)
  const [appToSell, setAppToSell] = useState<Application | null>(null)
  const [appToSettle, setAppToSettle] = useState<Application | null>(null)

  // Maps for fast lookups
  const ipoMap = useMemo(() => new Map(ipos.map((i) => [i.id, i])), [ipos])
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

  // Calculate counts for filters
  const ipoApplicationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const app of applications) {
      counts.set(app.ipoId, (counts.get(app.ipoId) || 0) + 1)
    }
    return counts
  }, [applications])

  // Real-time status counts across current filters (excluding status)
  const statusCounts = useMemo(() => {
    let baseApps = applications
    if (selectedIpoId !== "all") {
      baseApps = baseApps.filter((a) => a.ipoId === selectedIpoId)
    }
    if (selectedAccountId !== "all") {
      baseApps = baseApps.filter((a) => a.accountId === selectedAccountId)
    }
    if (selectedBankId !== "all") {
      baseApps = baseApps.filter((a) => a.bankAccountId === selectedBankId)
    }
    if (selectedCategory !== "all") {
      baseApps = baseApps.filter((a) => {
        const cat = a.category || inferCategoryFromAmount(a.amountApplied)
        return cat === selectedCategory
      })
    }

    const counts = {
      all: baseApps.length,
      pending: 0,
      allotted: 0,
      not_allotted: 0,
      sold: 0,
    }

    for (const app of baseApps) {
      if (app.status in counts) {
        counts[app.status as keyof typeof counts]++
      }
    }
    return counts
  }, [
    applications,
    selectedIpoId,
    selectedAccountId,
    selectedBankId,
    selectedCategory,
  ])

  // Filter applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // IPO filter
      if (selectedIpoId !== "all" && app.ipoId !== selectedIpoId) return false

      // Account filter
      if (selectedAccountId !== "all" && app.accountId !== selectedAccountId)
        return false

      // Bank filter
      if (selectedBankId !== "all" && app.bankAccountId !== selectedBankId)
        return false

      // Category filter
      if (selectedCategory !== "all") {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        if (cat !== selectedCategory) return false
      }

      // Status filter
      if (statusFilter !== "all" && app.status !== statusFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)
        const bank = bankMap.get(app.bankAccountId)

        const matchIpo = ipo?.name.toLowerCase().includes(query)
        const matchAccount = account?.name.toLowerCase().includes(query)
        const matchBank =
          bank?.bankName.toLowerCase().includes(query) ||
          bank?.nickname?.toLowerCase().includes(query) ||
          bank?.last4?.includes(query)
        const matchPan = account?.pan?.toLowerCase().includes(query)
        const matchNotes = app.notes?.toLowerCase().includes(query)

        if (
          !matchIpo &&
          !matchAccount &&
          !matchBank &&
          !matchPan &&
          !matchNotes
        ) {
          return false
        }
      }

      return true
    })
  }, [
    applications,
    selectedIpoId,
    selectedAccountId,
    selectedBankId,
    selectedCategory,
    statusFilter,
    searchQuery,
    ipoMap,
    accountMap,
    bankMap,
  ])

  // Portfolio-wide summary metrics calculated across current filtered view
  const metrics = useMemo(() => {
    let totalLots = 0
    let totalAmount = 0
    let allottedCount = 0
    let decidedCount = 0
    let realizedGrossProfit = 0
    let realizedYourProfit = 0
    let pendingCount = 0

    for (const app of filteredApplications) {
      totalLots += app.lotsApplied || 0
      totalAmount += app.amountApplied || 0

      if (app.status === "pending") {
        pendingCount++
      } else if (app.status === "allotted" || app.status === "sold") {
        allottedCount++
        decidedCount++
      } else if (app.status === "not_allotted") {
        decidedCount++
      }

      const ipo = ipoMap.get(app.ipoId)
      const account = accountMap.get(app.accountId)
      if (ipo && account) {
        const p = calculateApplicationProfit(app, ipo, account)
        if (p.hasRealized) {
          realizedGrossProfit += p.realizedGrossProfit
          realizedYourProfit += p.realizedYourProfit
        }
      }
    }

    const winRate = decidedCount > 0 ? (allottedCount / decidedCount) * 100 : 0

    return {
      totalApplications: filteredApplications.length,
      totalLots,
      totalAmount,
      allottedCount,
      decidedCount,
      winRate,
      realizedGrossProfit,
      realizedYourProfit,
      pendingCount,
    }
  }, [filteredApplications, ipoMap, accountMap])

  // Selected applications calculation for bulk action bar
  const selectedApps = useMemo(
    () => applications.filter((a) => selectedIds.includes(a.id)),
    [applications, selectedIds]
  )
  const selectedLots = useMemo(
    () => selectedApps.reduce((sum, a) => sum + (a.lotsApplied || 0), 0),
    [selectedApps]
  )
  const selectedAmount = useMemo(
    () => selectedApps.reduce((sum, a) => sum + (a.amountApplied || 0), 0),
    [selectedApps]
  )

  const isAnyFilterActive =
    selectedIpoId !== "all" ||
    selectedAccountId !== "all" ||
    selectedBankId !== "all" ||
    selectedCategory !== "all" ||
    statusFilter !== "all" ||
    Boolean(searchQuery.trim())

  const handleResetFilters = () => {
    setSelectedIpoId("all")
    setSelectedAccountId("all")
    setSelectedBankId("all")
    setSelectedCategory("all")
    setStatusFilter("all")
    setSearchQuery("")
  }

  // Bulk actions handlers
  const handleBulkStatusChange = async (status: ApplicationStatus) => {
    if (selectedIds.length === 0) return
    setUpdatingStatus(true)
    try {
      const updates = selectedApps.map((app) => ({
        applicationId: app.id,
        status,
        allottedLots: status === "allotted" ? app.lotsApplied : undefined,
        allottedShares: status === "allotted" ? app.sharesApplied : undefined,
      }))
      await updateApplicationsStatusBatch(userId, updates)
      toast.add({
        title: "Status updated",
        description: `Successfully updated ${selectedIds.length} application${
          selectedIds.length === 1 ? "" : "s"
        } to ${status.replace("_", " ").toUpperCase()}.`,
        type: "success",
      })
      setSelectedIds([])
      onRefresh()
    } catch (err) {
      console.error("Bulk status update failed:", err)
      toast.add({
        title: "Update failed",
        description: "Failed to update application statuses. Please try again.",
        type: "error",
      })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleBulkChangeBank = async () => {
    if (selectedIds.length === 0 || !targetBankId) return
    setUpdatingBank(true)
    try {
      await updateApplicationsBankBatch(userId, selectedIds, targetBankId)
      const targetBank = bankMap.get(targetBankId)
      toast.add({
        title: "Bank accounts updated",
        description: `Successfully switched ${selectedIds.length} application${
          selectedIds.length === 1 ? "" : "s"
        } to ${targetBank ? getBankDisplayName(targetBank) : "selected bank"}.`,
        type: "success",
      })
      setBankDialogOpen(false)
      setSelectedIds([])
      onRefresh()
    } catch (err) {
      console.error("Bulk change bank failed:", err)
      toast.add({
        title: "Update failed",
        description: "Failed to update bank accounts. Please try again.",
        type: "error",
      })
    } finally {
      setUpdatingBank(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      await deleteApplicationsBatch(userId, selectedIds)
      toast.add({
        title: "Applications removed",
        description: `Permanently removed ${selectedIds.length} application record${
          selectedIds.length === 1 ? "" : "s"
        }.`,
        type: "success",
      })
      setBulkDeleteOpen(false)
      setSelectedIds([])
      onRefresh()
    } catch (err) {
      console.error("Bulk delete failed:", err)
      toast.add({
        title: "Delete failed",
        description: "Failed to delete applications. Please try again.",
        type: "error",
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  // Single application delete
  const handleDeleteSingle = async () => {
    if (!appToDelete) return
    setDeleting(true)
    try {
      await deleteApplication(userId, appToDelete.id)
      toast.add({
        title: "Application removed",
        description: "Application record was deleted successfully.",
        type: "success",
      })
      setAppToDelete(null)
      setSelectedIds((prev) => prev.filter((id) => id !== appToDelete.id))
      onRefresh()
    } catch (err) {
      console.error("Delete failed:", err)
      toast.add({
        title: "Delete failed",
        description: "Failed to delete application. Please try again.",
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  // Status Filter Pills
  const filterPills: DataTableFilterPill[] = [
    {
      id: "all",
      label: "All",
      count: statusCounts.all,
      active: statusFilter === "all",
      onToggle: () => setStatusFilter("all"),
    },
    {
      id: "pending",
      label: "Pending",
      count: statusCounts.pending,
      active: statusFilter === "pending",
      onToggle: () =>
        setStatusFilter((prev) => (prev === "pending" ? "all" : "pending")),
    },
    {
      id: "allotted",
      label: "Allotted",
      count: statusCounts.allotted,
      active: statusFilter === "allotted",
      onToggle: () =>
        setStatusFilter((prev) => (prev === "allotted" ? "all" : "allotted")),
    },
    {
      id: "not_allotted",
      label: "Not Allotted",
      count: statusCounts.not_allotted,
      active: statusFilter === "not_allotted",
      onToggle: () =>
        setStatusFilter((prev) =>
          prev === "not_allotted" ? "all" : "not_allotted"
        ),
    },
    {
      id: "sold",
      label: "Sold",
      count: statusCounts.sold,
      active: statusFilter === "sold",
      onToggle: () =>
        setStatusFilter((prev) => (prev === "sold" ? "all" : "sold")),
    },
  ]

  // Table Columns
  const columns: DataTableColumn<Application>[] = [
    {
      id: "ipo",
      header: "IPO",
      sortable: true,
      sortFn: (a, b) => {
        const ipoA = ipoMap.get(a.ipoId)?.name || ""
        const ipoB = ipoMap.get(b.ipoId)?.name || ""
        return ipoA.localeCompare(ipoB)
      },
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        if (!ipo) {
          return (
            <span className="font-mono text-xs text-muted-foreground">
              Unknown IPO
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/ipos/${ipo.id}`}
                className="group flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary hover:underline"
              >
                <span className="max-w-[140px] truncate text-xs sm:max-w-[200px]">
                  {ipo.name}
                </span>
                <ExternalLink className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Badge
                variant={ipo.type === "sme" ? "secondary" : "outline"}
                className="rounded-none px-1 py-0 font-mono text-[9px] font-bold uppercase"
              >
                {ipo.type === "sme" ? "SME" : "Main"}
              </Badge>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {ipo.issuePrice ? `₹${ipo.issuePrice}` : "—"} • Lot:{" "}
              {ipo.lotSize || 0}
            </span>
          </div>
        )
      },
    },
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
        if (!account) {
          return (
            <span className="font-mono text-xs text-muted-foreground">
              Unknown
            </span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-[130px] truncate text-xs font-medium text-foreground">
              {account.name}
            </span>
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={`rounded-none px-1 py-0 font-mono text-[9px] ${
                  account.type === "my"
                    ? "border-primary/40 text-primary"
                    : "border-warning/50 text-warning"
                }`}
              >
                {account.type === "my"
                  ? "MY"
                  : `PARTNER (${account.profitSharePercent}%)`}
              </Badge>
            </div>
          </div>
        )
      },
    },
    {
      id: "bank",
      header: "Bank Account",
      sortable: true,
      sortFn: (a, b) => {
        const bankA = bankMap.get(a.bankAccountId)?.bankName || ""
        const bankB = bankMap.get(b.bankAccountId)?.bankName || ""
        return bankA.localeCompare(bankB)
      },
      cell: (app) => {
        const bank = bankMap.get(app.bankAccountId)
        if (!bank) {
          return (
            <span className="font-mono text-xs text-muted-foreground">—</span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-[130px] truncate font-mono text-xs font-semibold text-foreground">
              {bank.nickname || bank.bankName}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {bank.last4 ? `••••${bank.last4}` : bank.bankName}
            </span>
          </div>
        )
      },
    },
    {
      id: "category",
      header: "Category",
      cell: (app) => {
        const cat = app.category || inferCategoryFromAmount(app.amountApplied)
        const config = CATEGORY_CONFIG[cat]
        return (
          <Badge
            variant="outline"
            className="rounded-none border-border/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase"
          >
            {config?.shortLabel || cat}
          </Badge>
        )
      },
    },
    {
      id: "lots",
      header: "Lots / Capital",
      sortable: true,
      sortFn: (a, b) => (a.amountApplied || 0) - (b.amountApplied || 0),
      cell: (app) => {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-bold text-foreground">
              {formatCurrency(app.amountApplied)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {app.lotsApplied} {app.lotsApplied === 1 ? "lot" : "lots"} (
              {app.sharesApplied} sh)
            </span>
          </div>
        )
      },
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
      cell: (app) => {
        const config: Record<
          ApplicationStatus,
          {
            label: string
            icon: typeof Clock
            badgeClass: string
          }
        > = {
          pending: {
            label: "PENDING",
            icon: Clock,
            badgeClass:
              "border-warning/40 bg-warning/10 text-warning dark:border-warning/30",
          },
          allotted: {
            label: "ALLOTTED",
            icon: CheckCircle2,
            badgeClass:
              "border-success/40 bg-success/10 text-success dark:border-success/30",
          },
          not_allotted: {
            label: "NOT ALLOTTED",
            icon: XCircle,
            badgeClass:
              "border-border bg-muted/30 text-muted-foreground dark:border-border/60",
          },
          sold: {
            label: "SOLD",
            icon: TrendingUp,
            badgeClass:
              "border-primary/40 bg-primary/10 text-primary dark:border-primary/30",
          },
        }

        const curr = config[app.status] || config.pending
        const Icon = curr.icon

        return (
          <Badge
            variant="outline"
            className={`flex w-fit items-center gap-1.5 rounded-none px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${curr.badgeClass}`}
          >
            <Icon className="size-3" />
            <span>{curr.label}</span>
          </Badge>
        )
      },
    },
    {
      id: "return",
      header: "Return / Profit",
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)

        if (!ipo || !account) {
          return (
            <span className="font-mono text-[11px] text-muted-foreground">
              —
            </span>
          )
        }

        const profit = calculateApplicationProfit(app, ipo, account)

        if (profit.hasRealized) {
          const isProfitable = profit.realizedYourProfit >= 0
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`font-mono text-xs font-bold ${
                  isProfitable ? "text-success" : "text-destructive"
                }`}
              >
                {isProfitable ? "+" : ""}
                {formatCurrency(profit.realizedYourProfit)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Net (Gross: {formatCurrency(profit.realizedGrossProfit)})
              </span>
            </div>
          )
        }

        if (app.status === "allotted") {
          return (
            <span className="font-mono text-[10px] text-muted-foreground">
              {app.allottedLots} lot{app.allottedLots === 1 ? "" : "s"} held
            </span>
          )
        }

        if (app.status === "not_allotted") {
          return (
            <span className="font-mono text-[10px] text-muted-foreground">
              Refunded
            </span>
          )
        }

        return (
          <span className="font-mono text-[10px] text-muted-foreground">
            Awaiting
          </span>
        )
      },
    },
    {
      id: "date",
      header: "Date",
      sortable: true,
      sortFn: (a, b) => {
        const timeA =
          a.applicationDate?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0
        const timeB =
          b.applicationDate?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0
        return timeA - timeB
      },
      cell: (app) => (
        <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
          {formatDate(app.applicationDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (app) => {
        const ipo = ipoMap.get(app.ipoId)
        const account = accountMap.get(app.accountId)
        const isPartner = account?.type === "other"

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-7 items-center justify-center rounded-none border border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                aria-label="Application Actions"
              >
                <MoreVertical className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 rounded-none text-xs"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setAppToEdit(app)}
                    className="gap-2"
                  >
                    <Edit2 className="size-3.5" />
                    Edit Application
                  </DropdownMenuItem>

                  {(app.status === "allotted" || app.status === "sold") &&
                    ipo && (
                      <DropdownMenuItem
                        onClick={() => setAppToSell(app)}
                        className="gap-2"
                      >
                        <TrendingUp className="size-3.5" />
                        {app.status === "sold" ? "Update Sale" : "Record Sale"}
                      </DropdownMenuItem>
                    )}

                  {isPartner &&
                    (app.status === "sold" || app.status === "allotted") &&
                    ipo && (
                      <DropdownMenuItem
                        onClick={() => setAppToSettle(app)}
                        className="gap-2"
                      >
                        <MessageSquare className="size-3.5" />
                        Settlement & WhatsApp
                      </DropdownMenuItem>
                    )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setAppToDelete(app)}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete Application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* 5-Card Portfolio Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Total Applications
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {metrics.totalApplications}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({metrics.totalLots} lots)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Total Capital Blocked
            </span>
            <span className="font-mono text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalAmount)}
            </span>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Win Rate (Allotment)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {metrics.decidedCount > 0
                  ? `${metrics.winRate.toFixed(1)}%`
                  : "—"}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({metrics.allottedCount}/{metrics.decidedCount})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border border-border/70 bg-card p-3 shadow-none">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Realized Net Profit
            </span>
            <span
              className={`font-mono text-xl font-bold ${
                metrics.realizedYourProfit >= 0
                  ? "text-success"
                  : "text-destructive"
              }`}
            >
              {metrics.realizedYourProfit >= 0 ? "+" : ""}
              {formatCurrency(metrics.realizedYourProfit)}
            </span>
          </CardContent>
        </Card>

        <Card className="col-span-2 rounded-none border border-border/70 bg-card p-3 shadow-none sm:col-span-1">
          <CardContent className="flex flex-col gap-1 p-0">
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Pending Allotment
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xl font-bold text-foreground">
                {metrics.pendingCount}
              </span>
              {metrics.pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className="rounded-none border-warning/40 px-1 py-0 font-mono text-[9px] text-warning"
                >
                  IN PROGRESS
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Controls Toolbar */}
      <Card className="rounded-none border border-border/70 bg-card shadow-none">
        <CardContent className="flex flex-col gap-3.5 p-3.5">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search IPO, account, bank, PAN, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-none bg-background pr-8 pl-8 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              {isAnyFilterActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 gap-1 rounded-none text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* 4-Dropdown Selectors Filter Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* IPO Filter */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-ipo"
                className="text-[10px] font-semibold text-muted-foreground uppercase"
              >
                IPO
              </label>
              <Select
                value={selectedIpoId}
                onValueChange={(val) => val && setSelectedIpoId(val)}
              >
                <SelectTrigger
                  id="filter-ipo"
                  className="h-8 w-full truncate rounded-none bg-background text-xs"
                >
                  <SelectValue placeholder="All IPOs">
                    {(val) => {
                      if (!val || val === "all") return "All IPOs"
                      const ipo = ipoMap.get(val)
                      return ipo ? ipo.name : "All IPOs"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-none">
                  <SelectItem value="all" label="All IPOs">
                    All IPOs ({applications.length})
                  </SelectItem>
                  {ipos.map((ipo) => (
                    <SelectItem key={ipo.id} value={ipo.id} label={ipo.name}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{ipo.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {ipoApplicationCounts.get(ipo.id) || 0}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account Filter */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-account"
                className="text-[10px] font-semibold text-muted-foreground uppercase"
              >
                Account
              </label>
              <Select
                value={selectedAccountId}
                onValueChange={(val) => val && setSelectedAccountId(val)}
              >
                <SelectTrigger
                  id="filter-account"
                  className="h-8 w-full truncate rounded-none bg-background text-xs"
                >
                  <SelectValue placeholder="All Accounts">
                    {(val) => {
                      if (!val || val === "all") return "All Accounts"
                      const acc = accountMap.get(val)
                      return acc ? acc.name : "All Accounts"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-none">
                  <SelectItem value="all" label="All Accounts">
                    All Accounts ({accounts.length})
                  </SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} label={acc.name}>
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="truncate">{acc.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {acc.type === "my"
                            ? "My"
                            : `${acc.profitSharePercent}%`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Filter */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-bank"
                className="text-[10px] font-semibold text-muted-foreground uppercase"
              >
                Bank Account
              </label>
              <Select
                value={selectedBankId}
                onValueChange={(val) => val && setSelectedBankId(val)}
              >
                <SelectTrigger
                  id="filter-bank"
                  className="h-8 w-full truncate rounded-none bg-background text-xs"
                >
                  <SelectValue placeholder="All Banks">
                    {(val) => {
                      if (!val || val === "all") return "All Banks"
                      const bank = bankMap.get(val)
                      return bank ? getBankDisplayName(bank) : "All Banks"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-none">
                  <SelectItem value="all" label="All Banks">
                    All Banks ({bankAccounts.length})
                  </SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem
                      key={b.id}
                      value={b.id}
                      label={getBankDisplayName(b)}
                    >
                      {getBankDisplayName(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="filter-category"
                className="text-[10px] font-semibold text-muted-foreground uppercase"
              >
                Quota Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => val && setSelectedCategory(val)}
              >
                <SelectTrigger
                  id="filter-category"
                  className="h-8 w-full truncate rounded-none bg-background text-xs"
                >
                  <SelectValue placeholder="All Categories">
                    {(val) => {
                      if (!val || val === "all") return "All Categories"
                      return (
                        CATEGORY_CONFIG[val as ApplicationCategory]?.label ||
                        val
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all" label="All Categories">
                    All Categories
                  </SelectItem>
                  <SelectItem value="retail" label="Retail (< ₹2L)">
                    Retail (&lt; ₹2L)
                  </SelectItem>
                  <SelectItem value="shni" label="Small HNI (₹2L - ₹10L)">
                    Small HNI (₹2L - ₹10L)
                  </SelectItem>
                  <SelectItem value="bhni" label="Big HNI (> ₹10L)">
                    Big HNI (&gt; ₹10L)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cross-IPO DataTable */}
      <DataTable
        data={filteredApplications}
        columns={columns}
        keyExtractor={(app) => app.id}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        filterPills={filterPills}
        pageSize={15}
        emptyTitle="No applications found"
        emptyDescription={
          isAnyFilterActive
            ? "No application records match your current filter criteria."
            : "You have not recorded any applications yet. Go to My IPOs to import an IPO and submit applications."
        }
        emptyIcon={<Layers className="size-8 text-muted-foreground" />}
        emptyAction={
          isAnyFilterActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="rounded-none text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-none text-xs"
              nativeButton={false}
              render={<Link href="/ipos" />}
            >
              Go to My IPOs
            </Button>
          )
        }
        footer={
          filteredApplications.length > 0 ? (
            <div className="flex flex-col items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 text-xs sm:flex-row">
              <span className="font-medium text-muted-foreground">
                Showing {filteredApplications.length} of {applications.length}{" "}
                applications ({metrics.totalLots} Lots)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Capital:</span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(metrics.totalAmount)}
                </span>
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Sticky Floating Bulk Actions Bar */}
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

          <div className="h-6 w-px bg-border" />

          {/* Quick Status Changers */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 items-center gap-1.5 rounded-none border border-border bg-background px-2.5 text-xs font-semibold hover:bg-muted/40"
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Spinner className="size-3.5" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              <span>Status</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 rounded-none text-xs"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("allotted")}
                  className="gap-2 text-success"
                >
                  <CheckCircle2 className="size-3.5" />
                  Mark Allotted
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("not_allotted")}
                  className="gap-2 text-muted-foreground"
                >
                  <XCircle className="size-3.5" />
                  Mark Not Allotted
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkStatusChange("pending")}
                  className="gap-2 text-warning"
                >
                  <RotateCcw className="size-3.5" />
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
            className="h-8 gap-1.5 rounded-none text-xs font-semibold"
          >
            <Landmark className="size-3.5" />
            <span className="hidden sm:inline">Change</span> Bank
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => setBulkDeleteOpen(true)}
            className="h-8 gap-1.5 rounded-none border-destructive/40 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Delete ({selectedIds.length})
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedIds([])}
            title="Deselect all"
            aria-label="Deselect all"
            className="size-8 rounded-none text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete {selectedIds.length} Application
                  {selectedIds.length === 1 ? "" : "s"}?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This will permanently delete the selected application records
                  spanning {selectedLots} lots and{" "}
                  <strong>{formatCurrency(selectedAmount)}</strong> in blocked
                  capital across your portfolio.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
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
                `Permanently Delete (${selectedIds.length})`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Change Bank Modal Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
                <Landmark className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Change Bank Account
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Reassign the source ASBA bank account for{" "}
                  <strong>
                    {selectedIds.length} application
                    {selectedIds.length === 1 ? "" : "s"}
                  </strong>
                  .
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3">
            <div className="grid grid-cols-2 gap-2 border border-border/60 bg-muted/30 p-2.5 text-xs">
              <div>
                <span className="block text-[10px] text-muted-foreground uppercase">
                  Selected Applications
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
                  className="h-9 w-full rounded-none bg-background text-xs"
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
                <SelectContent className="rounded-none">
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

      {/* Single Delete Confirmation Alert Dialog */}
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
                  </strong>{" "}
                  in{" "}
                  <strong>
                    {ipoMap.get(appToDelete?.ipoId || "")?.name || "this IPO"}
                  </strong>
                  ?
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
              onClick={handleDeleteSingle}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              {deleting ? "Removing..." : "Remove Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Application Dialog */}
      {appToEdit && ipoMap.get(appToEdit.ipoId) && (
        <EditApplicationDialog
          open={Boolean(appToEdit)}
          onOpenChange={(open) => !open && setAppToEdit(null)}
          userId={userId}
          ipo={ipoMap.get(appToEdit.ipoId)!}
          application={appToEdit}
          account={accountMap.get(appToEdit.accountId)!}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setAppToEdit(null)
            onRefresh()
          }}
        />
      )}

      {/* Record Sale Dialog */}
      {appToSell && ipoMap.get(appToSell.ipoId) && (
        <RecordSaleDialog
          open={Boolean(appToSell)}
          onOpenChange={(open) => !open && setAppToSell(null)}
          userId={userId}
          ipo={ipoMap.get(appToSell.ipoId)!}
          application={appToSell}
          account={accountMap.get(appToSell.accountId)!}
          onOpenSettlement={() => {
            const currentApp = appToSell
            setAppToSell(null)
            setAppToSettle(currentApp)
          }}
          onSuccess={() => {
            setAppToSell(null)
            onRefresh()
          }}
        />
      )}

      {/* Settlement Dialog */}
      {appToSettle && ipoMap.get(appToSettle.ipoId) && (
        <SettlementDialog
          open={Boolean(appToSettle)}
          onOpenChange={(open) => !open && setAppToSettle(null)}
          application={appToSettle}
          ipo={ipoMap.get(appToSettle.ipoId)!}
          account={accountMap.get(appToSettle.accountId)!}
          bankAccounts={bankAccounts}
          onSuccess={() => {
            setAppToSettle(null)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
