"use client"

import { useState, useMemo } from "react"
import {
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Minus,
  PartyPopper,
  RotateCcw,
  Landmark,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import {
  updateAllotmentsBatch,
  type AllotmentUpdateItem,
} from "@/lib/firebase/applications"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import { calculateInvestment } from "@/lib/calculations/financials"
import type {
  Ipo,
  Application,
  ApplicationAccount,
  BankAccount,
  ApplicationStatus,
} from "@/types"

interface BulkAllotmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

interface RowState {
  status: ApplicationStatus
  allottedLots: number
}

export function BulkAllotmentDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  applications,
  accounts,
  bankAccounts,
  onSuccess,
}: BulkAllotmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {open && (
          <BulkAllotmentForm
            key={ipo.id}
            userId={userId}
            ipo={ipo}
            applications={applications}
            accounts={accounts}
            bankAccounts={bankAccounts}
            onClose={() => onOpenChange(false)}
            onSuccess={() => {
              onOpenChange(false)
              onSuccess()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BulkAllotmentForm({
  userId,
  ipo,
  applications,
  accounts,
  bankAccounts,
  onClose,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onClose: () => void
  onSuccess: () => void
}) {
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const bankMap = useMemo(
    () => new Map(bankAccounts.map((b) => [b.id, b])),
    [bankAccounts]
  )

  // Local state for each application's allotment status and lots
  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {}
    for (const app of applications) {
      init[app.id] = {
        status: app.status,
        allottedLots:
          app.allottedLots !== undefined
            ? app.allottedLots
            : app.status === "allotted" || app.status === "sold"
              ? app.lotsApplied
              : app.status === "not_allotted"
                ? 0
                : app.lotsApplied,
      }
    }
    return init
  })

  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<
    "account" | "bank" | "applied" | "status" | "invested" | null
  >(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSort = (
    col: "account" | "bank" | "applied" | "status" | "invested"
  ) => {
    if (sortColumn !== col) {
      setSortColumn(col)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortColumn(null)
    }
  }

  const setStatus = (appId: string, status: ApplicationStatus) => {
    setRowStates((prev) => {
      const app = applications.find((a) => a.id === appId)
      const defaultLots = app ? app.lotsApplied : 1
      const currentLots = prev[appId]?.allottedLots || defaultLots

      return {
        ...prev,
        [appId]: {
          status,
          allottedLots:
            status === "allotted"
              ? currentLots <= 0
                ? defaultLots
                : currentLots
              : status === "not_allotted"
                ? 0
                : defaultLots,
        },
      }
    })
  }

  const setAllottedLots = (appId: string, lots: number) => {
    const app = applications.find((a) => a.id === appId)
    const maxLots = app ? app.lotsApplied : 1
    const clamped = isNaN(lots) || lots <= 0 ? 0 : Math.min(lots, maxLots)

    setRowStates((prev) => ({
      ...prev,
      [appId]: {
        status: "allotted",
        allottedLots: clamped,
      },
    }))
  }

  // 1-Click Action Handlers
  const handleAllAllotted = () => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "allotted",
            allottedLots: app.lotsApplied,
          }
        }
      }
      return updated
    })
  }

  const handleAllNotAllotted = () => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "not_allotted",
            allottedLots: 0,
          }
        }
      }
      return updated
    })
  }

  const handleResetToPending = () => {
    setRowStates((prev) => {
      const updated = { ...prev }
      for (const app of applications) {
        if (app.status !== "sold") {
          updated[app.id] = {
            status: "pending",
            allottedLots: app.lotsApplied,
          }
        }
      }
      return updated
    })
  }

  // Filter & Sort Applications
  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const acc = accountMap.get(app.accountId)?.name?.toLowerCase() || ""
      const bank = bankMap.get(app.bankAccountId)
      const bName = bank?.bankName?.toLowerCase() || ""
      const bNick = bank?.nickname?.toLowerCase() || ""
      return acc.includes(q) || bName.includes(q) || bNick.includes(q)
    })
  }, [applications, search, accountMap, bankMap])

  const sortedApps = useMemo(() => {
    if (!sortColumn) return filteredApps

    const list = [...filteredApps]
    list.sort((appA, appB) => {
      const accA = accountMap.get(appA.accountId)
      const accB = accountMap.get(appB.accountId)
      const bankA = bankMap.get(appA.bankAccountId)
      const bankB = bankMap.get(appB.bankAccountId)
      const stateA = rowStates[appA.id] || {
        status: appA.status,
        allottedLots: appA.lotsApplied,
      }
      const stateB = rowStates[appB.id] || {
        status: appB.status,
        allottedLots: appB.lotsApplied,
      }

      let res = 0
      if (sortColumn === "account") {
        res = (accA?.name || "").localeCompare(accB?.name || "")
      } else if (sortColumn === "bank") {
        res = (bankA?.bankName || "").localeCompare(bankB?.bankName || "")
      } else if (sortColumn === "applied") {
        res = appA.amountApplied - appB.amountApplied
      } else if (sortColumn === "status") {
        const order: Record<string, number> = {
          allotted: 1,
          sold: 2,
          pending: 3,
          not_allotted: 4,
        }
        res = (order[stateA.status] || 9) - (order[stateB.status] || 9)
      } else if (sortColumn === "invested") {
        const invA =
          stateA.status === "allotted" || stateA.status === "sold"
            ? stateA.allottedLots * ipo.lotSize * ipo.issuePrice
            : 0
        const invB =
          stateB.status === "allotted" || stateB.status === "sold"
            ? stateB.allottedLots * ipo.lotSize * ipo.issuePrice
            : 0
        res = invA - invB
      }

      return sortDirection === "asc" ? res : -res
    })
    return list
  }, [
    filteredApps,
    sortColumn,
    sortDirection,
    accountMap,
    bankMap,
    rowStates,
    ipo.lotSize,
    ipo.issuePrice,
  ])

  // Calculate live summary stats
  let allottedCount = 0
  let notAllottedCount = 0
  let pendingCount = 0
  let soldCount = 0
  let totalInvested = 0
  let totalRefund = 0

  for (const app of applications) {
    const state = rowStates[app.id]
    const st = state ? state.status : app.status
    const lots = state ? state.allottedLots : app.allottedLots || 0

    if (st === "sold") {
      soldCount++
      const inv = calculateInvestment(lots * ipo.lotSize, ipo.issuePrice)
      totalInvested += inv
    } else if (st === "allotted") {
      allottedCount++
      const inv = calculateInvestment(lots * ipo.lotSize, ipo.issuePrice)
      totalInvested += inv
      totalRefund += Math.max(0, app.amountApplied - inv)
    } else if (st === "not_allotted") {
      notAllottedCount++
      totalRefund += app.amountApplied
    } else {
      pendingCount++
    }
  }

  const totalDecided = allottedCount + soldCount + notAllottedCount
  const successRate =
    totalDecided > 0 ? ((allottedCount + soldCount) / totalDecided) * 100 : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const itemsToUpdate: AllotmentUpdateItem[] = applications.map((app) => {
        const state = rowStates[app.id]
        if (!state) {
          return {
            applicationId: app.id,
            status: app.status,
            allottedLots: app.allottedLots,
            allottedShares: app.allottedShares,
          }
        }

        const isAllotted =
          state.status === "allotted" || state.status === "sold"
        const finalLots = isAllotted ? Math.max(1, state.allottedLots) : 0
        const finalShares = isAllotted ? finalLots * ipo.lotSize : 0

        return {
          applicationId: app.id,
          status: state.status,
          allottedLots: state.status === "pending" ? undefined : finalLots,
          allottedShares: state.status === "pending" ? undefined : finalShares,
        }
      })

      await updateAllotmentsBatch(userId, itemsToUpdate)
      toast.add({
        title: "Allotment statuses updated successfully",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to update allotment statuses. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader className="pb-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DialogTitle className="max-w-md truncate">
            Update Allotment — {ipo.name}
          </DialogTitle>
          <Badge variant="outline" className="font-mono text-xs uppercase">
            {ipo.lotSize} sh/lot • {formatCurrency(ipo.issuePrice)}
          </Badge>
        </div>
        <DialogDescription>
          Record allotment results across all {applications.length} accounts.
          Allotted shares convert to invested funds; unallotted funds are marked
          for refund.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Live Allotment Overview Card */}
      <div className="flex flex-col gap-3 rounded-none border bg-muted/30 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-semibold text-success">
              <CheckCircle2 className="size-3.5" /> {allottedCount + soldCount}{" "}
              Allotted
            </span>
            <span className="flex items-center gap-1 font-semibold text-destructive">
              <XCircle className="size-3.5" /> {notAllottedCount} Not Allotted
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5" /> {pendingCount} Pending
            </span>
          </div>

          <div className="flex items-center gap-3 text-right font-mono">
            <span className="text-xs text-muted-foreground">
              Invested:{" "}
              <strong className="text-foreground">
                {formatCurrency(totalInvested)}
              </strong>
            </span>
            <span className="text-xs text-muted-foreground">
              Refunds:{" "}
              <strong className="text-warning-foreground">
                {formatCurrency(totalRefund)}
              </strong>
            </span>
          </div>
        </div>

        {/* Allotment Rate Progress Bar */}
        {totalDecided > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Allotment Rate</span>
              <span className="font-mono font-semibold text-foreground">
                {successRate.toFixed(0)}% Success
              </span>
            </div>
            <Progress value={successRate} className="h-1.5 w-full bg-muted" />
          </div>
        )}

        {/* Quick Action Presets + Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-muted-foreground">
              Quick Actions:
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAllAllotted}
              className="h-7 text-xs"
            >
              <PartyPopper data-icon="inline-start" />
              All Allotted
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAllNotAllotted}
              className="h-7 text-xs"
            >
              <XCircle data-icon="inline-start" />
              All Not Allotted
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setConfirmResetOpen(true)}
              className="h-7 text-xs"
            >
              <RotateCcw data-icon="inline-start" />
              Reset All
            </Button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-48">
            <Search className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 bg-background pl-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Sortable Allotment Table */}
      <div className="max-h-[340px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border border-border/80">
        <Table className="min-w-[650px]">
          <TableHeader>
            <TableRow className="border-b border-border/70 bg-muted/30">
              <TableHead className="h-9 min-w-[170px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => toggleSort("account")}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Account
                  {sortColumn === "account" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>

              <TableHead className="h-9 min-w-[150px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => toggleSort("bank")}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Bank
                  {sortColumn === "bank" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>

              <TableHead className="h-9 min-w-[110px] text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => toggleSort("applied")}
                  className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Applied
                  {sortColumn === "applied" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>

              <TableHead className="h-9 min-w-[220px] text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="mx-auto inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Allotment Decision
                  {sortColumn === "status" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>

              <TableHead className="h-9 min-w-[130px] text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                <button
                  type="button"
                  onClick={() => toggleSort("invested")}
                  className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
                >
                  Invested / Lots
                  {sortColumn === "invested" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3 text-foreground" />
                    ) : (
                      <ArrowDown className="size-3 text-foreground" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                  )}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedApps.map((app) => {
              const account = accountMap.get(app.accountId)
              const bank = bankMap.get(app.bankAccountId)
              const state = rowStates[app.id] || {
                status: app.status,
                allottedLots: app.allottedLots ?? app.lotsApplied,
              }

              const isSold = app.status === "sold"
              const isAllotted = state.status === "allotted"
              const isNotAllotted = state.status === "not_allotted"
              const isPending = state.status === "pending"

              const currentInvested =
                isAllotted || isSold
                  ? state.allottedLots * ipo.lotSize * ipo.issuePrice
                  : 0

              return (
                <TableRow
                  key={app.id}
                  className={`transition-colors ${
                    isAllotted
                      ? "bg-success/5 hover:bg-success/10"
                      : isNotAllotted
                        ? "bg-muted/15 opacity-75 hover:bg-muted/25"
                        : "hover:bg-muted/30"
                  }`}
                >
                  {/* Account Name */}
                  <TableCell className="text-xs font-medium">
                    <div className="flex max-w-[200px] min-w-0 items-center gap-1.5">
                      <span
                        className="block truncate font-semibold text-foreground"
                        title={account?.name || "Account"}
                      >
                        {account?.name || "Account"}
                      </span>
                      <Badge
                        variant={
                          account?.type === "my" ? "secondary" : "default"
                        }
                        className="shrink-0 px-1 py-0 text-[9px] font-normal"
                      >
                        {account?.type === "my"
                          ? "My"
                          : `${account?.profitSharePercent}%`}
                      </Badge>
                    </div>
                  </TableCell>

                  {/* Bank Account */}
                  <TableCell className="text-xs text-muted-foreground">
                    {bank ? (
                      <div
                        className="flex max-w-[150px] items-center gap-1 truncate"
                        title={formatBankAccount(bank)}
                      >
                        <Landmark className="size-3 shrink-0" />
                        <span className="truncate">
                          {formatBankAccount(bank)}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* Applied Amount */}
                  <TableCell className="text-right font-mono text-xs">
                    <span className="block font-semibold text-foreground">
                      {formatCurrency(app.amountApplied)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {app.lotsApplied} lots ({app.sharesApplied} sh)
                    </span>
                  </TableCell>

                  {/* 3-Way Status Toggle */}
                  <TableCell className="text-center">
                    {isSold ? (
                      <Badge variant="info" className="text-xs">
                        Sold ({app.sharesSold} sh)
                      </Badge>
                    ) : (
                      <div className="inline-flex items-center rounded-none border bg-muted/40 p-0.5">
                        <button
                          type="button"
                          onClick={() => setStatus(app.id, "allotted")}
                          className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                            isAllotted
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Check className="mr-1 inline size-3" />
                          Allotted
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(app.id, "not_allotted")}
                          className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                            isNotAllotted
                              ? "text-destructive-foreground bg-destructive"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <XCircle className="mr-1 inline size-3" />
                          Not Allotted
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatus(app.id, "pending")}
                          className={`px-2 py-0.5 text-xs font-semibold transition-all ${
                            isPending
                              ? "border bg-background text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Pending
                        </button>
                      </div>
                    )}
                  </TableCell>

                  {/* Allotted Lots Stepper / Invested Calculation */}
                  <TableCell className="text-right font-mono text-xs">
                    {isAllotted ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center rounded-none border bg-background">
                          <button
                            type="button"
                            disabled={state.allottedLots <= 1}
                            onClick={() =>
                              setAllottedLots(app.id, state.allottedLots - 1)
                            }
                            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <Minus className="size-2.5" />
                          </button>
                          <Input
                            type="number"
                            min={1}
                            max={app.lotsApplied}
                            value={
                              state.allottedLots === 0 ? "" : state.allottedLots
                            }
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === "") {
                                setAllottedLots(app.id, 0)
                              } else {
                                const parsed = parseInt(val, 10)
                                setAllottedLots(
                                  app.id,
                                  isNaN(parsed) ? 0 : parsed
                                )
                              }
                            }}
                            onBlur={() => {
                              if (state.allottedLots <= 0) {
                                setAllottedLots(app.id, 1)
                              }
                            }}
                            className="h-6 w-10 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            disabled={state.allottedLots >= app.lotsApplied}
                            onClick={() =>
                              setAllottedLots(app.id, state.allottedLots + 1)
                            }
                            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <Plus className="size-2.5" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-success">
                          {formatCurrency(currentInvested)}
                        </span>
                      </div>
                    ) : isSold ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {state.allottedLots} lot
                          {state.allottedLots > 1 ? "s" : ""}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {formatCurrency(currentInvested)}
                        </span>
                      </div>
                    ) : isNotAllotted ? (
                      <span className="text-[11px] text-muted-foreground">
                        Refund: {formatCurrency(app.amountApplied)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          size="sm"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} size="sm">
          {loading && <Spinner data-icon="inline-start" />}
          {loading ? "Saving Allotments..." : "Save Allotments"}
        </Button>
      </DialogFooter>

      {/* Reset All Confirmation Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all allotments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset all accounts back to pending
              status? Any customized allotment counts will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                handleResetToPending()
                setConfirmResetOpen(false)
              }}
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
