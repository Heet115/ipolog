"use client"

import { useState, useCallback, useMemo } from "react"
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
  CheckCheck,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  Save,
  X,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocalStorage } from "@/hooks/use-local-storage"
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
  EmptyContent,
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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  archiveApplicationAccount,
  deleteApplicationAccount,
  updateAccountSortOrder,
  sortAccounts,
} from "@/lib/firebase/accounts"
import { updateSettlementsBatch } from "@/lib/firebase/applications"
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

export type AccountSortOption =
  | "custom"
  | "name_asc"
  | "name_desc"
  | "type_my"
  | "type_other"
  | "profit_desc"
  | "created_desc"
  | "created_asc"

export const ACCOUNT_SORT_LABELS: Record<AccountSortOption, string> = {
  custom: "Custom (Priority)",
  name_asc: "Name (A → Z)",
  name_desc: "Name (Z → A)",
  type_my: "My Accounts First",
  type_other: "Partners First",
  profit_desc: "Profit % (High → Low)",
  created_desc: "Recently Added",
  created_asc: "Oldest First",
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
  const [viewMode, setViewMode] = useLocalStorage<"grid" | "table">(
    "ipolog:account-view-mode",
    "grid"
  )
  const [sortBy, setSortBy] = useLocalStorage<AccountSortOption>(
    "ipolog:account-grid-sort",
    "custom"
  )
  const [accountToDelete, setAccountToDelete] =
    useState<ApplicationAccount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderedAccounts, setReorderedAccounts] = useState<
    ApplicationAccount[]
  >([])
  const [originalOrderIds, setOriginalOrderIds] = useState<string[]>([])
  const [savingOrder, setSavingOrder] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const ipoMap = new Map(ipos.map((i) => [i.id, i]))

  // Sort accounts based on chosen sort option (or custom order)
  const sortedAccounts = useMemo(() => {
    const list = [...accounts]
    switch (sortBy) {
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name))
      case "name_desc":
        return list.sort((a, b) => b.name.localeCompare(a.name))
      case "type_my":
        return list.sort((a, b) => {
          if (a.type !== b.type) return a.type === "my" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      case "type_other":
        return list.sort((a, b) => {
          if (a.type !== b.type) return a.type === "other" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
      case "profit_desc":
        return list.sort(
          (a, b) => (b.profitSharePercent || 0) - (a.profitSharePercent || 0)
        )
      case "created_desc":
        return list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        )
      case "created_asc":
        return list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0)
        )
      case "custom":
      default:
        return sortAccounts(list)
    }
  }, [accounts, sortBy])

  // Filter accounts
  const filteredAccounts = sortedAccounts.filter((acc) => {
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

  // Check if current reordered array differs from original snapshot
  const isDirty = useMemo(() => {
    if (reorderedAccounts.length !== originalOrderIds.length) return false
    return reorderedAccounts.some((acc, idx) => acc.id !== originalOrderIds[idx])
  }, [reorderedAccounts, originalOrderIds])

  // Enter reorder mode — snapshot active (non-archived) accounts in current order
  const enterReorderMode = useCallback(() => {
    setSortBy("custom")
    const activeInOrder = sortAccounts(accounts.filter((a) => !a.archived))
    setReorderedAccounts(activeInOrder)
    setOriginalOrderIds(activeInOrder.map((a) => a.id))
    setReorderMode(true)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [accounts, setSortBy])

  const cancelReorderMode = useCallback(() => {
    setReorderMode(false)
    setReorderedAccounts([])
    setOriginalOrderIds([])
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const moveAccount = useCallback(
    (index: number, direction: "up" | "down") => {
      setReorderedAccounts((prev) => {
        const next = [...prev]
        const targetIdx = direction === "up" ? index - 1 : index + 1
        if (targetIdx < 0 || targetIdx >= next.length) return prev
        ;[next[index], next[targetIdx]] = [next[targetIdx], next[index]]
        return next
      })
    },
    []
  )

  const moveToExtreme = useCallback(
    (index: number, position: "top" | "bottom") => {
      setReorderedAccounts((prev) => {
        if (position === "top" && index === 0) return prev
        if (position === "bottom" && index === prev.length - 1) return prev
        const item = prev[index]
        const next = prev.filter((_, i) => i !== index)
        return position === "top" ? [item, ...next] : [...next, item]
      })
    },
    []
  )

  const moveAccountToIndex = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      setReorderedAccounts((prev) => {
        const next = [...prev]
        const [movedItem] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, movedItem)
        return next
      })
    },
    []
  )

  // Presets
  const applyPresetAZ = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [])

  const applyPresetZA = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => b.name.localeCompare(a.name))
    )
  }, [])

  const applyPresetMyFirst = useCallback(() => {
    setReorderedAccounts((prev) => {
      const my = prev.filter((a) => a.type === "my")
      const other = prev.filter((a) => a.type === "other")
      return [...my, ...other]
    })
  }, [])

  const applyPresetCreationOrder = useCallback(() => {
    setReorderedAccounts((prev) =>
      [...prev].sort((a, b) => {
        const at = a.createdAt?.toMillis?.() ?? 0
        const bt = b.createdAt?.toMillis?.() ?? 0
        return at - bt
      })
    )
  }, [])

  const saveOrder = useCallback(async () => {
    setSavingOrder(true)
    try {
      const orderedIds = reorderedAccounts.map((a) => a.id)
      await updateAccountSortOrder(userId, orderedIds)
      toast.add({
        title: "Account order saved",
        description: "Your custom order will be used everywhere.",
        type: "success",
      })
      setReorderMode(false)
      setReorderedAccounts([])
      setOriginalOrderIds([])
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to save order",
        type: "error",
      })
    } finally {
      setSavingOrder(false)
    }
  }, [reorderedAccounts, userId, onRefresh])

  const resetToDefault = useCallback(async () => {
    setSavingOrder(true)
    try {
      // Reset all accounts to alphabetical by name
      const alphabetical = [...accounts]
        .filter((a) => !a.archived)
        .sort((a, b) => a.name.localeCompare(b.name))
      const orderedIds = alphabetical.map((a) => a.id)
      await updateAccountSortOrder(userId, orderedIds)
      toast.add({
        title: "Order reset to alphabetical",
        type: "success",
      })
      setReorderMode(false)
      setReorderedAccounts([])
      setOriginalOrderIds([])
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.add({
        title: "Failed to reset order",
        type: "error",
      })
    } finally {
      setSavingOrder(false)
    }
  }, [accounts, userId, onRefresh])

  // Instant 1-click move from card/table dropdown
  const handleQuickMove = useCallback(
    async (account: ApplicationAccount, target: "top" | "bottom") => {
      const active = sortAccounts(accounts.filter((a) => !a.archived))
      const index = active.findIndex((a) => a.id === account.id)
      if (index === -1) return
      if (target === "top" && index === 0) {
        toast.add({
          title: `${account.name} is already at the top`,
          type: "info",
        })
        return
      }
      if (target === "bottom" && index === active.length - 1) {
        toast.add({
          title: `${account.name} is already at the bottom`,
          type: "info",
        })
        return
      }
      const item = active[index]
      const rest = active.filter((_, i) => i !== index)
      const reordered = target === "top" ? [item, ...rest] : [...rest, item]
      const orderedIds = reordered.map((a) => a.id)

      try {
        await updateAccountSortOrder(userId, orderedIds)
        toast.add({
          title: `Moved ${account.name} to ${target}`,
          type: "success",
        })
        onRefresh()
      } catch (err) {
        console.error(err)
        toast.add({ title: "Failed to update account order", type: "error" })
      }
    },
    [accounts, userId, onRefresh]
  )

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

  const handleSettleAll = async (account: ApplicationAccount) => {
    const unsettledApps = applications.filter(
      (a) =>
        a.accountId === account.id &&
        a.status === "sold" &&
        a.settlementStatus !== "settled"
    )
    if (unsettledApps.length === 0) return

    try {
      await updateSettlementsBatch(
        userId,
        unsettledApps.map((a) => a.id),
        "settled"
      )
      toast.add({
        title: `Settled ${unsettledApps.length} application(s) for ${account.name}`,
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
      id: "order",
      header: "#",
      align: "center",
      className: "w-12",
      sortable: true,
      sortFn: (a, b) => {
        const ai = a.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bi = b.sortIndex ?? Number.MAX_SAFE_INTEGER
        return ai - bi
      },
      cell: (account) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {account.sortIndex !== undefined ? `#${account.sortIndex + 1}` : "—"}
        </span>
      ),
    },
    {
      id: "name",
      header: "Account Name",
      sortable: true,
      sortFn: (a, b) => a.name.localeCompare(b.name),
      cell: (account) => (
        <div className="flex max-w-[200px] min-w-0 items-center gap-1.5">
          <span
            className="block truncate text-xs font-bold text-foreground"
            title={account.name}
          >
            {account.name}
          </span>
          <Badge
            variant={account.type === "my" ? "secondary" : "default"}
            className="shrink-0 px-1 py-0 text-[9px] font-normal"
          >
            {account.type === "my" ? "My" : `${account.profitSharePercent}%`}
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
          {account.type === "my"
            ? "Personal (100%)"
            : `Shared (${account.profitSharePercent}%)`}
        </span>
      ),
    },
    {
      id: "phone",
      header: "Mobile",
      cell: (account) => (
        <span className="font-mono text-xs text-muted-foreground">
          {account.phoneNumber || "—"}
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
              shared > 0
                ? "font-semibold text-warning-foreground"
                : "text-muted-foreground"
            }`}
          >
            {formatCurrency(shared)}
          </span>
        )
      },
    },
    {
      id: "receivables",
      header: "Pending Receivables",
      align: "right",
      sortable: true,
      sortFn: (a, b) => {
        const sumA = accountSummaryMap.get(a.id)?.pendingReceivables || 0
        const sumB = accountSummaryMap.get(b.id)?.pendingReceivables || 0
        return sumA - sumB
      },
      cell: (account) => {
        if (account.type === "my") {
          return <span className="text-xs text-muted-foreground">—</span>
        }

        const summary = accountSummaryMap.get(account.id)
        const pending = summary?.pendingReceivables || 0

        if (pending <= 0) {
          return (
            <Badge
              variant="outline"
              className="px-1 py-0 font-mono text-[10px] font-normal text-muted-foreground"
            >
              All Settled
            </Badge>
          )
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-mono text-xs font-bold text-warning-foreground">
              {formatCurrency(pending)}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="size-6 text-muted-foreground hover:bg-success/10 hover:text-success"
              title={`Mark all ${summary?.unsettledSoldApplicationsCount} settled`}
              onClick={() => handleSettleAll(account)}
            >
              <CheckCheck className="size-3 text-success" />
              <span className="sr-only">Settle All</span>
            </Button>
          </div>
        )
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: (account) => (
        <span
          className="block max-w-[150px] truncate text-xs text-muted-foreground"
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
          <DropdownMenuContent align="end" className="w-44 text-xs">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit2 data-icon="inline-start" />
                Edit Account
              </DropdownMenuItem>
              {account.type === "other" &&
                (accountSummaryMap.get(account.id)?.pendingReceivables || 0) >
                  0 && (
                  <DropdownMenuItem onClick={() => handleSettleAll(account)}>
                    <CheckCheck
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Settle All (
                    {
                      accountSummaryMap.get(account.id)
                        ?.unsettledSoldApplicationsCount
                    }
                    )
                  </DropdownMenuItem>
                )}
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
              {!account.archived && accounts.filter((a) => !a.archived).length > 1 && (
                <>
                  <DropdownMenuItem onClick={() => handleQuickMove(account, "top")}>
                    <ChevronsUp data-icon="inline-start" />
                    Move to Top
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickMove(account, "bottom")}>
                    <ChevronsDown data-icon="inline-start" />
                    Move to Bottom
                  </DropdownMenuItem>
                </>
              )}
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
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts or PAN..."
            aria-label="Search application accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full bg-background pl-8 text-xs"
            disabled={reorderMode}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {archivedCount > 0 && !reorderMode && (
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

          {/* Reorder Button — enabled when active accounts exist, hidden in reorder mode */}
          {!reorderMode && accounts.filter((a) => !a.archived).length > 1 && (
            <Button
              variant="outline"
              size="xs"
              onClick={enterReorderMode}
              className="h-8 text-xs"
            >
              <GripVertical data-icon="inline-start" />
              Reorder
            </Button>
          )}

          {/* Grid Sort Selector — hidden during reorder */}
          {!reorderMode && (
            <div className="flex items-center shrink-0">
              <Select
                value={sortBy}
                onValueChange={(val) =>
                  val && setSortBy(val as AccountSortOption)
                }
              >
                <SelectTrigger
                  className="h-8 gap-1.5 rounded-none border border-border bg-background px-2 text-xs font-semibold"
                  aria-label="Sort Accounts"
                >
                  <ArrowUpDown className="size-3 text-muted-foreground" />
                  <SelectValue placeholder="Sort by">
                    {(val) =>
                      ACCOUNT_SORT_LABELS[val as AccountSortOption] || "Sort"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  {Object.entries(ACCOUNT_SORT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} label={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* View Mode Toggle — hidden during reorder */}
          {!reorderMode && (
            <div className="flex h-8 shrink-0 items-center rounded-none border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
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
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {reorderMode ? (
        <div className="flex flex-col gap-4 rounded-none border border-border bg-card p-4">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <GripVertical className="size-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Reorder Accounts
                </h2>
                {isDirty && (
                  <Badge
                    variant="outline"
                    className="border-warning/50 bg-warning/10 font-mono text-[10px] text-warning-foreground"
                  >
                    Unsaved changes
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Drag rows, jump by number, or use quick presets. Your custom order persists across all IPO applications.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={cancelReorderMode}
                disabled={savingOrder}
                className="h-8 text-xs"
              >
                <X data-icon="inline-start" className="size-3.5" />
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={saveOrder}
                disabled={savingOrder || !isDirty}
                className={`h-8 text-xs ${
                  isDirty ? "ring-2 ring-primary/40" : ""
                }`}
              >
                {savingOrder ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <Save data-icon="inline-start" className="size-3.5" />
                )}
                {savingOrder ? "Saving..." : "Save Order"}
              </Button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-3 text-xs">
            <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-muted-foreground">
              <ArrowUpDown className="size-3" />
              Presets:
            </span>
            <Button
              variant="outline"
              size="xs"
              onClick={applyPresetMyFirst}
              disabled={savingOrder}
              className="h-7 text-[11px]"
            >
              My Accounts First
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={applyPresetAZ}
              disabled={savingOrder}
              className="h-7 text-[11px]"
            >
              A → Z
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={applyPresetZA}
              disabled={savingOrder}
              className="h-7 text-[11px]"
            >
              Z → A
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={applyPresetCreationOrder}
              disabled={savingOrder}
              className="h-7 text-[11px]"
            >
              <RotateCcw data-icon="inline-start" className="size-3" />
              Creation Order
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={resetToDefault}
              disabled={savingOrder}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Reset to Alphabetical
            </Button>
          </div>

          {/* Draggable Reorder List */}
          <div className="flex flex-col divide-y divide-border/50 border border-border/60 bg-background">
            {reorderedAccounts.map((account, index) => {
              const isFirst = index === 0
              const isLast = index === reorderedAccounts.length - 1
              const isDragging = draggedIndex === index
              const isDragOver =
                dragOverIndex === index && draggedIndex !== index

              return (
                <div
                  key={account.id}
                  draggable={!savingOrder}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", `${index}`)
                    e.dataTransfer.effectAllowed = "move"
                    setDraggedIndex(index)
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = "move"
                    if (dragOverIndex !== index) {
                      setDragOverIndex(index)
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === index) {
                      setDragOverIndex(null)
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggedIndex !== null && draggedIndex !== index) {
                      moveAccountToIndex(draggedIndex, index)
                    }
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  }}
                  className={`flex items-center justify-between gap-3 p-2.5 transition-colors sm:p-3 ${
                    isDragging
                      ? "border-2 border-dashed border-primary bg-primary/5 opacity-40"
                      : isDragOver
                        ? "border-t-2 border-t-primary bg-primary/10"
                        : "hover:bg-muted/20"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    {/* Drag Handle */}
                    <div
                      className="flex cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      title="Drag to reorder"
                      aria-label="Drag handle"
                    >
                      <GripVertical className="size-4" />
                    </div>

                    {/* Direct Position Input / Jump */}
                    <input
                      type="number"
                      min={1}
                      max={reorderedAccounts.length}
                      defaultValue={index + 1}
                      key={`${account.id}-${index}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(
                            (e.target as HTMLInputElement).value,
                            10
                          )
                          if (
                            !isNaN(val) &&
                            val >= 1 &&
                            val <= reorderedAccounts.length
                          ) {
                            moveAccountToIndex(index, val - 1)
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (
                          !isNaN(val) &&
                          val >= 1 &&
                          val <= reorderedAccounts.length &&
                          val - 1 !== index
                        ) {
                          moveAccountToIndex(index, val - 1)
                        } else {
                          e.target.value = `${index + 1}`
                        }
                      }}
                      className="size-7 shrink-0 rounded-none border border-border/70 bg-muted/30 text-center font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                      title="Edit number and press Enter to jump to position"
                      aria-label={`Position for ${account.name}`}
                    />

                    {/* Account Details */}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-bold text-foreground">
                          {account.name}
                        </span>
                        <Badge
                          variant={account.type === "my" ? "secondary" : "default"}
                          className="px-1 py-0 text-[9px] font-normal"
                        >
                          {account.type === "my"
                            ? "My"
                            : `${account.profitSharePercent}%`}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                        {account.pan && <span>PAN: {account.pan}</span>}
                        {account.dematAccount && (
                          <span>Demat: {account.dematAccount}</span>
                        )}
                        {account.phoneNumber && (
                          <span>Ph: {account.phoneNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Movement Controls: Top, Up, Down, Bottom */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={isFirst || savingOrder}
                      onClick={() => moveToExtreme(index, "top")}
                      aria-label={`Move ${account.name} to top`}
                      title="Move to top"
                      className="size-7"
                    >
                      <ChevronsUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={isFirst || savingOrder}
                      onClick={() => moveAccount(index, "up")}
                      aria-label={`Move ${account.name} up`}
                      title="Move up"
                      className="size-7"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={isLast || savingOrder}
                      onClick={() => moveAccount(index, "down")}
                      aria-label={`Move ${account.name} down`}
                      title="Move down"
                      className="size-7"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={isLast || savingOrder}
                      onClick={() => moveToExtreme(index, "bottom")}
                      aria-label={`Move ${account.name} to bottom`}
                      title="Move to bottom"
                      className="size-7"
                    >
                      <ChevronsDown className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
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
          {search && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Clear Search
              </Button>
            </EmptyContent>
          )}
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
                      onQuickMove={(target) => handleQuickMove(account, target)}
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
                      onSettleAll={() => handleSettleAll(account)}
                      onQuickMove={(target) => handleQuickMove(account, target)}
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
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-destructive/10 text-destructive">
                <Trash2 className="size-4" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold">
                  Delete Application Account?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  Are you sure you want to permanently delete{" "}
                  <strong>{accountToDelete?.name}</strong>? This action cannot
                  be undone.
                </AlertDialogDescription>
              </div>
            </div>
            {Boolean(
              accountToDelete &&
              applications.some((a) => a.accountId === accountToDelete.id)
            ) && (
              <p className="mt-2 rounded-none border border-warning/40 bg-warning/10 p-2.5 text-xs font-medium text-warning-foreground">
                ⚠️ Warning: This account has{" "}
                {
                  applications.filter(
                    (a) => a.accountId === accountToDelete?.id
                  ).length
                }{" "}
                linked application(s). Deleting it will leave those applications
                without account metadata. We strongly recommend archiving
                instead.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </AlertDialogCancel>
            {Boolean(
              accountToDelete &&
              applications.some((a) => a.accountId === accountToDelete.id)
            ) && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-none text-xs"
                onClick={async () => {
                  if (accountToDelete) {
                    await handleToggleArchive(accountToDelete)
                    setAccountToDelete(null)
                  }
                }}
                disabled={deleting}
              >
                Archive Instead
              </Button>
            )}
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              size="sm"
              className="rounded-none text-xs"
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
  onSettleAll,
  onQuickMove,
}: {
  account: ApplicationAccount
  summary: AccountMoneySummary
  onEdit: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onSettleAll?: () => void
  onQuickMove?: (target: "top" | "bottom") => void
}) {
  const isMy = account.type === "my"

  return (
    <Card
      className={`flex flex-col justify-between rounded-none border transition-all hover:border-foreground/40 hover:shadow-xs ${
        account.archived ? "bg-muted/20 opacity-60" : "bg-card"
      }`}
    >
      <CardContent className="flex flex-col gap-3.5 p-4">
        {/* Header: Name + Badges + Dropdown */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-heading text-sm font-bold text-foreground">
                {account.name}
              </h3>
              {account.sortIndex !== undefined && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[9px] text-muted-foreground"
                  title={`Priority #${account.sortIndex + 1}`}
                >
                  #{account.sortIndex + 1}
                </Badge>
              )}
              {account.archived && (
                <Badge
                  variant="outline"
                  className="px-1 py-0 font-mono text-[9px]"
                >
                  Archived
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={isMy ? "secondary" : "default"}
                className="px-1 py-0 text-[9px] font-normal"
              >
                {isMy ? "My Account" : `Other (${account.profitSharePercent}%)`}
              </Badge>
              {summary.totalApplications > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {summary.totalApplications} apps (
                  {summary.allottedCount + summary.soldCount} allotted)
                </span>
              )}
            </div>
            {account.phoneNumber && (
              <span className="font-mono text-[11px] text-muted-foreground">
                Ph: {account.phoneNumber}
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-mt-1.5 -mr-1.5 size-7 text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreVertical className="size-3.5" />
              <span className="sr-only">Actions</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 data-icon="inline-start" />
                  Edit Account
                </DropdownMenuItem>
                {!isMy && summary.pendingReceivables > 0 && onSettleAll && (
                  <DropdownMenuItem onClick={onSettleAll}>
                    <CheckCheck
                      data-icon="inline-start"
                      className="text-success"
                    />
                    Settle All ({summary.unsettledSoldApplicationsCount})
                  </DropdownMenuItem>
                )}
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
                {!account.archived && onQuickMove && (
                  <>
                    <DropdownMenuItem onClick={() => onQuickMove("top")}>
                      <ChevronsUp data-icon="inline-start" />
                      Move to Top
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onQuickMove("bottom")}>
                      <ChevronsDown data-icon="inline-start" />
                      Move to Bottom
                    </DropdownMenuItem>
                  </>
                )}
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
            <span className="block text-[10px] text-muted-foreground">
              Total Applied
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.totalApplied)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground">
              Invested (Allotted)
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatCurrency(summary.totalInvested)}
            </span>
          </div>
        </div>

        {/* Realized Returns Panel */}
        <div className="flex flex-col gap-1 rounded-none border border-border/60 bg-muted/20 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Your Realized Net Profit:
            </span>
            <span
              className={`font-mono font-bold ${
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
            <div className="flex items-center justify-between border-t border-border/40 pt-1 font-mono text-[10px] text-muted-foreground">
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

        {/* Pending Settlement Alert & Quick Settle */}
        {!isMy && summary.pendingReceivables > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-none border border-warning/40 bg-warning/10 p-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Pending Settlement
              </span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(summary.pendingReceivables)}
              </span>
            </div>
            {onSettleAll && (
              <Button
                variant="outline"
                size="xs"
                onClick={onSettleAll}
                className="h-6 gap-1 border-warning/50 text-[10px] font-semibold hover:bg-warning/20"
              >
                <CheckCheck className="size-3 text-success" />
                Settle All ({summary.unsettledSoldApplicationsCount})
              </Button>
            )}
          </div>
        )}

        {/* Notes (if any) */}
        {account.notes && (
          <p className="truncate text-[11px] text-muted-foreground italic">
            {account.notes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
