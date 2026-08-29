"use client"

import { useState } from "react"
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
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

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

  const [loading, setLoading] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const clamped = Math.max(1, Math.min(lots, maxLots))

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

        const isAllotted = state.status === "allotted"
        const finalLots = isAllotted ? state.allottedLots : 0
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader className="pb-1">
        <div className="flex items-center justify-between">
          <DialogTitle>Update Allotment — {ipo.name}</DialogTitle>
          <Badge variant="outline" className="text-xs uppercase">
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

          <div className="flex items-center gap-3 text-right">
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
              <span className="font-semibold text-foreground">
                {successRate.toFixed(0)}% Success
              </span>
            </div>
            <Progress value={successRate} className="h-1.5 w-full bg-muted" />
          </div>
        )}

        {/* 1-Click Fast Presets */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">
            Quick Actions:
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleAllAllotted}
            className="text-xs"
          >
            <PartyPopper data-icon="inline-start" />
            All Allotted
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleAllNotAllotted}
            className="text-xs"
          >
            <XCircle data-icon="inline-start" />
            All Not Allotted
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setConfirmResetOpen(true)}
            className="text-xs"
          >
            <RotateCcw data-icon="inline-start" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Account Allotment Cards List */}
      <div className="flex max-h-[380px] flex-col gap-2.5 overflow-y-auto pr-1">
        {applications.map((app) => {
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

          const currentInvested = isAllotted
            ? state.allottedLots * ipo.lotSize * ipo.issuePrice
            : 0

          return (
            <div
              key={app.id}
              className={`flex flex-col gap-2.5 rounded-none border p-3 transition-all ${
                isAllotted
                  ? "border-success/30 bg-success/5"
                  : isNotAllotted
                    ? "border-muted bg-muted/20 opacity-80"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* Account & Bank Details */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span
                      className="block max-w-[200px] truncate text-xs font-bold text-foreground sm:max-w-xs"
                      title={account?.name || "Account"}
                    >
                      {account?.name || "Account"}
                    </span>
                    <Badge
                      variant={account?.type === "my" ? "secondary" : "default"}
                      className="shrink-0 px-1 py-0 text-[9px] font-normal"
                    >
                      {account?.type === "my"
                        ? "My"
                        : `${account?.profitSharePercent}%`}
                    </Badge>
                    {bank && (
                      <span className="flex max-w-[180px] items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <Landmark className="size-3 shrink-0" />{" "}
                        {formatBankAccount(bank)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Applied: {app.lotsApplied} lots ({app.sharesApplied} sh /{" "}
                    {formatCurrency(app.amountApplied)})
                  </span>
                </div>

                {/* 3-Way Status Selector */}
                {isSold ? (
                  <Badge variant="info" className="text-xs">
                    Sold ({app.sharesSold} shares)
                  </Badge>
                ) : (
                  <div className="flex items-center rounded-none border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setStatus(app.id, "allotted")}
                      className={`px-2.5 py-1 text-xs font-semibold transition-all ${
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
                      className={`px-2.5 py-1 text-xs font-semibold transition-all ${
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
                      className={`px-2.5 py-1 text-xs font-semibold transition-all ${
                        isPending
                          ? "border bg-background text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Pending
                    </button>
                  </div>
                )}
              </div>

              {/* Allotment Adjuster for Allotted Status */}
              {isAllotted && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      Allotted Lots:
                    </span>
                    <div className="flex items-center rounded-none border bg-background">
                      <button
                        type="button"
                        disabled={state.allottedLots <= 1}
                        onClick={() =>
                          setAllottedLots(app.id, state.allottedLots - 1)
                        }
                        className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <Minus className="size-3" />
                      </button>
                      <Input
                        type="number"
                        min={1}
                        max={app.lotsApplied}
                        value={state.allottedLots}
                        onChange={(e) =>
                          setAllottedLots(
                            app.id,
                            parseInt(e.target.value, 10) || 1
                          )
                        }
                        className="h-7 w-12 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        disabled={state.allottedLots >= app.lotsApplied}
                        onClick={() =>
                          setAllottedLots(app.id, state.allottedLots + 1)
                        }
                        className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      ={" "}
                      <strong>{state.allottedLots * ipo.lotSize} shares</strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-success">
                      Invested: {formatCurrency(currentInvested)}
                    </span>
                    {app.amountApplied > currentInvested && (
                      <span className="block text-[10px] font-medium text-warning-foreground">
                        Refund:{" "}
                        {formatCurrency(app.amountApplied - currentInvested)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
