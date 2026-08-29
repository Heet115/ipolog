"use client"

import { useState } from "react"
import { Loader2, Check, CheckCircle2, XCircle, Clock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  updateAllotmentsBatch,
  type AllotmentUpdateItem,
} from "@/lib/firebase/applications"
import {
  formatCurrency,
  formatBankAccount,
} from "@/lib/utils/ipo"
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

interface AllotmentFormState {
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Allotment — {ipo.name}</DialogTitle>
          <DialogDescription>
            Record which accounts received an allotment and which did not.
          </DialogDescription>
        </DialogHeader>

        {open && applications.length > 0 && (
          <BulkAllotmentForm
            userId={userId}
            ipo={ipo}
            applications={applications}
            accounts={accounts}
            bankAccounts={bankAccounts}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onSuccess()
              onOpenChange(false)
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
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  applications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

  // Initialize state
  const [appStates, setAppStates] = useState<
    Record<string, AllotmentFormState>
  >(() => {
    const initial: Record<string, AllotmentFormState> = {}
    applications.forEach((app) => {
      initial[app.id] = {
        status: app.status,
        allottedLots:
          app.allottedLots !== undefined && app.allottedLots > 0
            ? app.allottedLots
            : app.lotsApplied,
      }
    })
    return initial
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSetAll = (status: ApplicationStatus) => {
    setAppStates(() => {
      const updated: Record<string, AllotmentFormState> = {}
      applications.forEach((app) => {
        updated[app.id] = {
          status,
          allottedLots: app.lotsApplied,
        }
      })
      return updated
    })
  }

  const handleUpdateAppStatus = (
    appId: string,
    status: ApplicationStatus,
    appliedLots: number
  ) => {
    setAppStates((prev) => ({
      ...prev,
      [appId]: {
        status,
        allottedLots:
          status === "allotted"
            ? prev[appId]?.allottedLots || appliedLots
            : 0,
      },
    }))
  }

  const handleUpdateAppLots = (appId: string, lots: number) => {
    setAppStates((prev) => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        allottedLots: Math.max(0, lots),
      },
    }))
  }

  const handleSave = async () => {
    setError(null)
    setLoading(true)

    try {
      const updates: AllotmentUpdateItem[] = applications.map((app) => {
        const state = appStates[app.id] || {
          status: "pending",
          allottedLots: 0,
        }
        const allottedLots =
          state.status === "allotted" ? state.allottedLots : 0
        const allottedShares = allottedLots * ipo.lotSize

        return {
          applicationId: app.id,
          status: state.status,
          allottedLots,
          allottedShares,
        }
      })

      await updateAllotmentsBatch(userId, updates)
      toast.add({
        title: "Allotment results saved successfully",
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to save allotment results. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Live calculated summaries for preview
  let totalAllottedShares = 0
  let totalInvested = 0
  let totalRefund = 0
  let allottedCount = 0
  let notAllottedCount = 0
  let pendingCount = 0

  applications.forEach((app) => {
    const state = appStates[app.id]
    if (state?.status === "allotted") {
      allottedCount++
      const shares = (state.allottedLots || 0) * ipo.lotSize
      totalAllottedShares += shares
      totalInvested += calculateInvestment(shares, ipo.issuePrice)
    } else if (state?.status === "not_allotted") {
      notAllottedCount++
      totalRefund += app.amountApplied
    } else {
      pendingCount++
    }
  })

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Bulk Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
        <span className="text-muted-foreground">
          Quick actions for all {applications.length} applications:
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSetAll("allotted")}
            className="text-xs"
          >
            <CheckCircle2 className="mr-1 size-3 text-emerald-600 dark:text-emerald-400" />
            All Allotted
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSetAll("not_allotted")}
            className="text-xs"
          >
            <XCircle className="mr-1 size-3 text-muted-foreground" />
            All Not Allotted
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => handleSetAll("pending")}
            className="text-xs"
          >
            <Clock className="mr-1 size-3" />
            Reset to Pending
          </Button>
        </div>
      </div>

      {/* Applications Allotment Table */}
      <div className="rounded-md border max-h-[340px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Account</TableHead>
              <TableHead className="text-xs">Bank</TableHead>
              <TableHead className="text-xs text-center w-[70px]">
                Applied
              </TableHead>
              <TableHead className="text-xs text-center w-[180px]">
                Result
              </TableHead>
              <TableHead className="text-xs text-center w-[90px]">
                Allotted Lots
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => {
              const account = accountMap.get(app.accountId)
              const bank = bankMap.get(app.bankAccountId)
              const state = appStates[app.id] || {
                status: "pending",
                allottedLots: app.lotsApplied,
              }

              return (
                <TableRow key={app.id}>
                  <TableCell className="font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{account?.name}</span>
                      <Badge
                        variant={
                          account?.type === "my" ? "secondary" : "default"
                        }
                        className="text-[9px] py-0 px-1 font-normal"
                      >
                        {account?.type === "my"
                          ? "My"
                          : `${account?.profitSharePercent}%`}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {bank ? formatBankAccount(bank) : "—"}
                  </TableCell>

                  <TableCell className="text-center text-xs">
                    <span className="font-semibold">{app.lotsApplied}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({app.sharesApplied} sh)
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          state.status === "allotted"
                            ? "bg-emerald-600 text-white font-semibold"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() =>
                          handleUpdateAppStatus(
                            app.id,
                            "allotted",
                            app.lotsApplied
                          )
                        }
                      >
                        Allotted
                      </button>
                      <button
                        type="button"
                        className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          state.status === "not_allotted"
                            ? "bg-neutral-700 text-white font-semibold dark:bg-neutral-300 dark:text-neutral-900"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() =>
                          handleUpdateAppStatus(
                            app.id,
                            "not_allotted",
                            app.lotsApplied
                          )
                        }
                      >
                        Not Allotted
                      </button>
                      <button
                        type="button"
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                          state.status === "pending"
                            ? "bg-primary/20 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() =>
                          handleUpdateAppStatus(
                            app.id,
                            "pending",
                            app.lotsApplied
                          )
                        }
                      >
                        Pending
                      </button>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    {state.status === "allotted" ? (
                      <Input
                        type="number"
                        min="1"
                        max={app.lotsApplied}
                        value={state.allottedLots}
                        onChange={(e) =>
                          handleUpdateAppLots(
                            app.id,
                            Number(e.target.value)
                          )
                        }
                        className="h-6 w-16 text-center text-xs mx-auto"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Outcome Preview Banner */}
      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2.5 text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block">
            Allotted ({allottedCount})
          </span>
          <span className="font-bold text-foreground">
            {formatCurrency(totalInvested)}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            {totalAllottedShares} shares
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block">
            Refunds ({notAllottedCount})
          </span>
          <span className="font-bold text-foreground">
            {formatCurrency(totalRefund)}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            Expected
          </span>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground block">
            Pending ({pendingCount})
          </span>
          <span className="font-bold text-foreground">
            {pendingCount > 0 ? "Awaiting Results" : "All Processed"}
          </span>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Saving Allotment...
            </>
          ) : (
            <>
              <Check className="mr-1.5 size-3.5" />
              Save Allotment Results
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  )
}
