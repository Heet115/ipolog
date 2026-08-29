"use client"

import { useState } from "react"
import { ArrowRight, ArrowLeft, Check, Plus, Minus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { createApplicationsBatch } from "@/lib/firebase/applications"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import type { Ipo, ApplicationAccount, BankAccount, Application } from "@/types"

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
      <DialogContent className="max-h-[88svh] overflow-y-auto sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {open && (
          <BulkApplicationForm
            key={ipo.id}
            userId={userId}
            ipo={ipo}
            existingApplications={existingApplications}
            accounts={accounts}
            bankAccounts={bankAccounts}
            onCancel={() => onOpenChange(false)}
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
    bankAccounts.find((b) => !b.archived)?.id || ""
  )
  const [defaultLots, setDefaultLots] = useState<number>(1)
  const [accountConfigs, setAccountConfigs] = useState<
    Record<string, AccountConfig>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const appliedAccountIds = new Set(
    existingApplications.map((a) => a.accountId)
  )

  const activeAccounts = accounts.filter((a) => !a.archived)
  const myAccounts = activeAccounts.filter((a) => a.type === "my")
  const otherAccounts = activeAccounts.filter((a) => a.type === "other")
  const activeBankAccounts = bankAccounts.filter((b) => !b.archived)

  const toggleAccountSelection = (accountId: string) => {
    if (appliedAccountIds.has(accountId)) return

    setSelectedAccountIds((prev) => {
      if (prev.includes(accountId)) {
        const next = prev.filter((id) => id !== accountId)
        setAccountConfigs((cfg) => {
          const updated = { ...cfg }
          delete updated[accountId]
          return updated
        })
        return next
      } else {
        setAccountConfigs((cfg) => ({
          ...cfg,
          [accountId]: {
            accountId,
            bankAccountId: defaultBankId,
            lots: defaultLots,
          },
        }))
        return [...prev, accountId]
      }
    })
  }

  const selectAllMy = () => {
    const available = myAccounts
      .filter((a) => !appliedAccountIds.has(a.id))
      .map((a) => a.id)

    setSelectedAccountIds((prev) => {
      const merged = Array.from(new Set([...prev, ...available]))
      setAccountConfigs((cfg) => {
        const nextCfg = { ...cfg }
        for (const id of available) {
          if (!nextCfg[id]) {
            nextCfg[id] = {
              accountId: id,
              bankAccountId: defaultBankId,
              lots: defaultLots,
            }
          }
        }
        return nextCfg
      })
      return merged
    })
  }

  const selectAllOther = () => {
    const available = otherAccounts
      .filter((a) => !appliedAccountIds.has(a.id))
      .map((a) => a.id)

    setSelectedAccountIds((prev) => {
      const merged = Array.from(new Set([...prev, ...available]))
      setAccountConfigs((cfg) => {
        const nextCfg = { ...cfg }
        for (const id of available) {
          if (!nextCfg[id]) {
            nextCfg[id] = {
              accountId: id,
              bankAccountId: defaultBankId,
              lots: defaultLots,
            }
          }
        }
        return nextCfg
      })
      return merged
    })
  }

  const selectAllAvailable = () => {
    const available = activeAccounts
      .filter((a) => !appliedAccountIds.has(a.id))
      .map((a) => a.id)

    setSelectedAccountIds(available)
    setAccountConfigs((cfg) => {
      const nextCfg = { ...cfg }
      for (const id of available) {
        if (!nextCfg[id]) {
          nextCfg[id] = {
            accountId: id,
            bankAccountId: defaultBankId,
            lots: defaultLots,
          }
        }
      }
      return nextCfg
    })
  }

  const deselectAll = () => {
    setSelectedAccountIds([])
    setAccountConfigs({})
  }

  const applyGlobalBank = (bankId: string) => {
    setDefaultBankId(bankId)
    setAccountConfigs((prev) => {
      const updated: Record<string, AccountConfig> = {}
      for (const id of selectedAccountIds) {
        updated[id] = {
          accountId: id,
          bankAccountId: bankId,
          lots: prev[id]?.lots || defaultLots,
        }
      }
      return updated
    })
  }

  const applyGlobalLots = (lots: number) => {
    const safeLots = Math.max(1, lots)
    setDefaultLots(safeLots)
    setAccountConfigs((prev) => {
      const updated: Record<string, AccountConfig> = {}
      for (const id of selectedAccountIds) {
        updated[id] = {
          accountId: id,
          bankAccountId: prev[id]?.bankAccountId || defaultBankId,
          lots: safeLots,
        }
      }
      return updated
    })
  }

  const updateIndividualBank = (accountId: string, bankId: string) => {
    setAccountConfigs((prev) => ({
      ...prev,
      [accountId]: {
        accountId,
        bankAccountId: bankId,
        lots: prev[accountId]?.lots || defaultLots,
      },
    }))
  }

  const updateIndividualLots = (accountId: string, lots: number) => {
    const safeLots = Math.max(1, lots)
    setAccountConfigs((prev) => ({
      ...prev,
      [accountId]: {
        accountId,
        bankAccountId: prev[accountId]?.bankAccountId || defaultBankId,
        lots: safeLots,
      },
    }))
  }

  const handleProceedToStep2 = () => {
    if (selectedAccountIds.length === 0) {
      setError("Please select at least one account to proceed.")
      return
    }

    if (activeBankAccounts.length === 0) {
      setError(
        "No bank accounts found. Please add a bank account before recording applications."
      )
      return
    }

    setError(null)
    setStep(2)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      if (selectedAccountIds.length === 0) {
        throw new Error("No accounts selected")
      }

      for (const id of selectedAccountIds) {
        const cfg = accountConfigs[id]
        if (!cfg?.bankAccountId) {
          throw new Error("Please select a bank account for all applications.")
        }
      }

      const applicationsToCreate = selectedAccountIds.map((accountId) => {
        const cfg = accountConfigs[accountId]
        const lots = cfg?.lots || 1
        const bankAccountId = cfg?.bankAccountId || defaultBankId

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
        title: `${applicationsToCreate.length} Applications recorded successfully`,
        type: "success",
      })
      onSuccess()
    } catch (err: unknown) {
      console.error(err)
      setError(
        err instanceof Error ? err.message : "Failed to create applications."
      )
    } finally {
      setLoading(false)
    }
  }

  const totalLots = selectedAccountIds.reduce(
    (sum, id) => sum + (accountConfigs[id]?.lots || defaultLots),
    0
  )
  const totalAmount = totalLots * ipo.lotSize * ipo.issuePrice

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DialogTitle className="max-w-md truncate">
            Record Applications — {ipo.name}
          </DialogTitle>
          <Badge variant="outline" className="font-mono text-xs">
            Step {step} of 2
          </Badge>
        </div>
        <DialogDescription>
          {step === 1
            ? "Select accounts to apply with. Already applied accounts are disabled to prevent duplicates."
            : "Assign lot sizes and funding bank accounts, review live totals, and confirm."}
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* STEP 1: Account Selection */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {activeAccounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              You haven&apos;t created any application accounts yet. Please add
              accounts from the Application Accounts page first.
            </div>
          ) : (
            <>
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 text-xs">
                <span className="font-semibold text-foreground">
                  Selected: {selectedAccountIds.length} of{" "}
                  {activeAccounts.length}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={selectAllMy}
                  >
                    All My
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={selectAllOther}
                  >
                    All Other
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={selectAllAvailable}
                  >
                    Select All
                  </Button>
                  {selectedAccountIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={deselectAll}
                      className="text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* My Accounts */}
              {myAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    My Accounts ({myAccounts.length})
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {myAccounts.map((account) => {
                      const alreadyApplied = appliedAccountIds.has(account.id)
                      const isSelected = selectedAccountIds.includes(account.id)

                      return (
                        <label
                          key={account.id}
                          className={`flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all ${
                            alreadyApplied
                              ? "cursor-not-allowed border-dashed bg-muted/20 opacity-50"
                              : isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Checkbox
                              checked={isSelected}
                              disabled={alreadyApplied}
                              onCheckedChange={() =>
                                !alreadyApplied &&
                                toggleAccountSelection(account.id)
                              }
                            />
                            <span
                              className="truncate text-xs font-semibold text-foreground"
                              title={account.name}
                            >
                              {account.name}
                            </span>
                          </div>
                          {alreadyApplied && (
                            <Badge
                              variant="outline"
                              className="shrink-0 py-0 font-mono text-[10px]"
                            >
                              Applied
                            </Badge>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Other Accounts */}
              {otherAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Other Accounts ({otherAccounts.length})
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {otherAccounts.map((account) => {
                      const alreadyApplied = appliedAccountIds.has(account.id)
                      const isSelected = selectedAccountIds.includes(account.id)

                      return (
                        <label
                          key={account.id}
                          className={`flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all ${
                            alreadyApplied
                              ? "cursor-not-allowed border-dashed bg-muted/20 opacity-50"
                              : isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <Checkbox
                              checked={isSelected}
                              disabled={alreadyApplied}
                              onCheckedChange={() =>
                                !alreadyApplied &&
                                toggleAccountSelection(account.id)
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <span
                                className="block truncate text-xs font-semibold text-foreground"
                                title={account.name}
                              >
                                {account.name}
                              </span>
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {account.profitSharePercent}% profit share
                              </span>
                            </div>
                          </div>
                          {alreadyApplied && (
                            <Badge
                              variant="outline"
                              className="shrink-0 py-0 font-mono text-[10px]"
                            >
                              Applied
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

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProceedToStep2}
              disabled={selectedAccountIds.length === 0}
              size="sm"
            >
              Next: Assign Banks & Lots
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* STEP 2: Configure & Review */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Global Defaults Bar */}
          <div className="grid grid-cols-1 gap-3 rounded-none border bg-muted/40 p-3 text-xs sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label className="block truncate text-[11px] font-semibold text-muted-foreground">
                Apply Bank to All
              </label>
              <Select
                value={defaultBankId}
                onValueChange={(val) => val && applyGlobalBank(val)}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {activeBankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {formatBankAccount(b)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label className="block truncate text-[11px] font-semibold text-muted-foreground">
                Apply Lots to All
              </label>
              <div className="flex h-8 items-center rounded-none border bg-background px-1">
                <button
                  type="button"
                  disabled={defaultLots <= 1}
                  onClick={() => applyGlobalLots(defaultLots - 1)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <Minus className="size-3" />
                </button>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={defaultLots}
                  onChange={(e) => applyGlobalLots(Number(e.target.value))}
                  className="h-6 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => applyGlobalLots(defaultLots + 1)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Applications Table */}
          <div className="max-h-[300px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[180px] text-xs">
                    Account
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs">
                    Bank Account
                  </TableHead>
                  <TableHead className="w-[80px] text-xs">Lots</TableHead>
                  <TableHead className="text-right text-xs">Shares</TableHead>
                  <TableHead className="text-right text-xs">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAccountIds.map((accountId) => {
                  const account = accounts.find((a) => a.id === accountId)
                  const cfg = accountConfigs[accountId]
                  const lots = cfg?.lots || defaultLots
                  const bankId = cfg?.bankAccountId || defaultBankId
                  const shares = calculateSharesApplied(lots, ipo.lotSize)
                  const amount = calculateAmountApplied(
                    lots,
                    ipo.lotSize,
                    ipo.issuePrice
                  )

                  return (
                    <TableRow key={accountId}>
                      <TableCell className="text-xs font-medium">
                        <div className="flex max-w-[220px] min-w-0 items-center gap-1.5">
                          <span
                            className="block truncate font-semibold text-foreground"
                            title={account?.name}
                          >
                            {account?.name}
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

                      <TableCell>
                        <Select
                          value={bankId}
                          onValueChange={(val) =>
                            val && updateIndividualBank(accountId, val)
                          }
                        >
                          <SelectTrigger className="h-7 w-full truncate bg-background text-xs">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeBankAccounts.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {formatBankAccount(b)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={lots}
                          onChange={(e) =>
                            updateIndividualLots(
                              accountId,
                              Number(e.target.value)
                            )
                          }
                          className="h-7 w-16 px-1.5 text-center text-xs font-bold"
                        />
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {shares}
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                        {formatCurrency(amount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Review Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-border bg-muted/30 p-3 text-xs">
            <div className="min-w-0">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Total Mandate Commitment:
              </span>
              <span className="font-mono text-base font-bold text-foreground">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="min-w-0 text-right">
              <span className="block text-[11px] font-medium text-muted-foreground">
                Applications / Lots:
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {selectedAccountIds.length} Accounts ({totalLots} Lots •{" "}
                {totalLots * ipo.lotSize} Shares)
              </span>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={loading}
              size="sm"
            >
              <ArrowLeft data-icon="inline-start" />
              Back to Accounts
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
            >
              {loading && <Spinner data-icon="inline-start" />}
              {loading ? (
                "Recording Applications..."
              ) : (
                <>
                  <Check data-icon="inline-start" />
                  Confirm & Submit ({selectedAccountIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      )}
    </div>
  )
}
