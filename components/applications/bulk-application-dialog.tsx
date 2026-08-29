"use client"

import { useState } from "react"
import { Loader2, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { createApplicationsBatch } from "@/lib/firebase/applications"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  Application,
} from "@/types"

interface BulkApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  ipo: Ipo
  existingApplications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

interface AccountConfig {
  accountId: string
  bankAccountId: string
  lots: number
}

export function BulkApplicationDialog({
  open,
  onOpenChange,
  userId,
  ipo,
  existingApplications,
  accounts,
  bankAccounts,
  onSuccess,
}: BulkApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {open && (
          <BulkApplicationForm
            userId={userId}
            ipo={ipo}
            existingApplications={existingApplications}
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

function BulkApplicationForm({
  userId,
  ipo,
  existingApplications,
  accounts,
  bankAccounts,
  onCancel,
  onSuccess,
}: {
  userId: string
  ipo: Ipo
  existingApplications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onCancel: () => void
  onSuccess: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [defaultBankId, setDefaultBankId] = useState<string>(
    bankAccounts[0]?.id || ""
  )
  const [defaultLots, setDefaultLots] = useState<number>(1)
  const [accountConfigs, setAccountConfigs] = useState<
    Record<string, AccountConfig>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Active accounts only
  const activeAccounts = accounts.filter((a) => !a.archived)
  const activeBankAccounts = bankAccounts.filter((b) => !b.archived)

  const appliedAccountIds = new Set(
    existingApplications.map((app) => app.accountId)
  )

  const myAccounts = activeAccounts.filter((a) => a.type === "my")
  const otherAccounts = activeAccounts.filter((a) => a.type === "other")

  const toggleAccountSelection = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      setSelectedAccountIds(selectedAccountIds.filter((accId) => accId !== id))
    } else {
      setSelectedAccountIds([...selectedAccountIds, id])
    }
  }

  const selectAllMy = () => {
    const available = myAccounts
      .filter((a) => !appliedAccountIds.has(a.id))
      .map((a) => a.id)
    const newSelected = Array.from(
      new Set([...selectedAccountIds, ...available])
    )
    setSelectedAccountIds(newSelected)
  }

  const selectAllOther = () => {
    const available = otherAccounts
      .filter((a) => !appliedAccountIds.has(a.id))
      .map((a) => a.id)
    const newSelected = Array.from(
      new Set([...selectedAccountIds, ...available])
    )
    setSelectedAccountIds(newSelected)
  }

  const deselectAll = () => {
    setSelectedAccountIds([])
  }

  const handleProceedToStep2 = () => {
    if (selectedAccountIds.length === 0) {
      setError("Please select at least one application account.")
      return
    }

    if (activeBankAccounts.length === 0) {
      setError("Please add at least one bank account before applying.")
      return
    }

    // Initialize configs
    const initialConfigs: Record<string, AccountConfig> = {}
    selectedAccountIds.forEach((id) => {
      initialConfigs[id] = {
        accountId: id,
        bankAccountId: accountConfigs[id]?.bankAccountId || defaultBankId || activeBankAccounts[0]?.id || "",
        lots: accountConfigs[id]?.lots || defaultLots || 1,
      }
    })

    setAccountConfigs(initialConfigs)
    setError(null)
    setStep(2)
  }

  const updateIndividualBank = (accountId: string, bankAccountId: string) => {
    setAccountConfigs((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        bankAccountId,
      },
    }))
  }

  const updateIndividualLots = (accountId: string, lots: number) => {
    setAccountConfigs((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        lots: Math.max(1, lots),
      },
    }))
  }

  const applyGlobalLots = (newLots: number) => {
    setDefaultLots(newLots)
    setAccountConfigs((prev) => {
      const updated: Record<string, AccountConfig> = {}
      Object.keys(prev).forEach((id) => {
        updated[id] = { ...prev[id], lots: Math.max(1, newLots) }
      })
      return updated
    })
  }

  const applyGlobalBank = (newBankId: string) => {
    setDefaultBankId(newBankId)
    setAccountConfigs((prev) => {
      const updated: Record<string, AccountConfig> = {}
      Object.keys(prev).forEach((id) => {
        updated[id] = { ...prev[id], bankAccountId: newBankId }
      })
      return updated
    })
  }

  const handleSaveApplications = async () => {
    setError(null)
    setLoading(true)

    try {
      const applicationsToCreate = selectedAccountIds.map((accountId) => {
        const cfg = accountConfigs[accountId]
        const lots = cfg?.lots || 1
        const bankAccountId =
          cfg?.bankAccountId || defaultBankId || activeBankAccounts[0]?.id || ""
        const sharesApplied = calculateSharesApplied(lots, ipo.lotSize)
        const amountApplied = calculateAmountApplied(
          lots,
          ipo.lotSize,
          ipo.issuePrice
        )

        return {
          ipoId: ipo.id,
          accountId,
          bankAccountId,
          lotsApplied: lots,
          sharesApplied,
          amountApplied,
        }
      })

      await createApplicationsBatch(userId, applicationsToCreate)
      toast.add({
        title: `${applicationsToCreate.length} Applications created`,
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError("Failed to create applications. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Calculate review totals
  const totalLots = selectedAccountIds.reduce(
    (sum, id) => sum + (accountConfigs[id]?.lots || 1),
    0
  )
  const totalAmount = totalLots * ipo.lotSize * ipo.issuePrice

  return (
    <div className="space-y-4">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle>Add Applications — {ipo.name}</DialogTitle>
          <span className="text-xs text-muted-foreground">
            Step {step} of 2
          </span>
        </div>
        <DialogDescription>
          {step === 1
            ? "Select the application accounts you want to apply with."
            : "Configure lot sizes and bank accounts, review, and confirm."}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Account Selection */}
      {step === 1 && (
        <div className="space-y-4">
          {activeAccounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              You haven&apos;t created any application accounts yet. Please add accounts from the Application Accounts page first.
            </div>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-xs">
                <span className="font-medium text-foreground">
                  Selected: {selectedAccountIds.length} of {activeAccounts.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={selectAllMy}
                  >
                    Select All My
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={selectAllOther}
                  >
                    Select All Other
                  </Button>
                  {selectedAccountIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={deselectAll}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* My Accounts */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  My Accounts ({myAccounts.length})
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {myAccounts.map((account) => {
                    const alreadyApplied = appliedAccountIds.has(account.id)
                    const isSelected = selectedAccountIds.includes(account.id)

                    return (
                      <label
                        key={account.id}
                        className={`flex items-center justify-between rounded-md border p-2.5 cursor-pointer text-xs transition-colors ${
                          alreadyApplied
                            ? "opacity-50 cursor-not-allowed bg-muted/20 border-dashed"
                            : isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            disabled={alreadyApplied}
                            onCheckedChange={() =>
                              !alreadyApplied &&
                              toggleAccountSelection(account.id)
                            }
                          />
                          <span className="font-medium truncate">
                            {account.name}
                          </span>
                        </div>
                        {alreadyApplied && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            Already Applied
                          </Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Other Accounts */}
              {otherAccounts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Other Accounts ({otherAccounts.length})
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {otherAccounts.map((account) => {
                      const alreadyApplied = appliedAccountIds.has(account.id)
                      const isSelected = selectedAccountIds.includes(account.id)

                      return (
                        <label
                          key={account.id}
                          className={`flex items-center justify-between rounded-md border p-2.5 cursor-pointer text-xs transition-colors ${
                            alreadyApplied
                              ? "opacity-50 cursor-not-allowed bg-muted/20 border-dashed"
                              : isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              disabled={alreadyApplied}
                              onCheckedChange={() =>
                                !alreadyApplied &&
                                toggleAccountSelection(account.id)
                              }
                            />
                            <div className="truncate">
                              <span className="font-medium block truncate">
                                {account.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {account.profitSharePercent}% profit share
                              </span>
                            </div>
                          </div>
                          {alreadyApplied && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0"
                            >
                              Already Applied
                            </Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProceedToStep2}
              disabled={selectedAccountIds.length === 0}
            >
              Next: Assign Banks & Lots
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* STEP 2: Configure & Review */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Global Defaults Bar */}
          <div className="grid grid-cols-1 gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground block">
                Apply Bank to All Selected
              </label>
              <select
                className="w-full rounded-md border bg-background px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                value={defaultBankId}
                onChange={(e) => applyGlobalBank(e.target.value)}
              >
                {activeBankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {formatBankAccount(b)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground block">
                Apply Lots to All Selected
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={defaultLots}
                onChange={(e) => applyGlobalLots(Number(e.target.value))}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {/* Detailed Applications Table */}
          <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="w-[180px]">Bank Account</TableHead>
                  <TableHead className="w-[80px]">Lots</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAccountIds.map((accountId) => {
                  const account = accounts.find((a) => a.id === accountId)
                  const cfg = accountConfigs[accountId]
                  const lots = cfg?.lots || 1
                  const bankId = cfg?.bankAccountId || defaultBankId
                  const shares = calculateSharesApplied(lots, ipo.lotSize)
                  const amount = calculateAmountApplied(
                    lots,
                    ipo.lotSize,
                    ipo.issuePrice
                  )

                  return (
                    <TableRow key={accountId}>
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

                      <TableCell>
                        <select
                          className="w-full rounded border bg-background px-1.5 py-0.5 text-xs outline-none"
                          value={bankId}
                          onChange={(e) =>
                            updateIndividualBank(accountId, e.target.value)
                          }
                        >
                          {activeBankAccounts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {formatBankAccount(b)}
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={lots}
                          onChange={(e) =>
                            updateIndividualLots(
                              accountId,
                              Number(e.target.value)
                            )
                          }
                          className="h-6 w-16 text-xs px-1.5"
                        />
                      </TableCell>

                      <TableCell className="text-right text-xs text-muted-foreground">
                        {shares}
                      </TableCell>

                      <TableCell className="text-right text-xs font-semibold text-foreground">
                        {formatCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Grand Totals Summary */}
          <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs font-medium">
            <span>
              Total: {selectedAccountIds.length} Applications ({totalLots} Lots)
            </span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              <ArrowLeft className="mr-1.5 size-3.5" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSaveApplications}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Saving {selectedAccountIds.length} applications...
                </>
              ) : (
                <>
                  <Check className="mr-1.5 size-3.5" />
                  Confirm & Save All
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  )
}
