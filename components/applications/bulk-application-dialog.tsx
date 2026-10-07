"use client"

import { useState, useMemo } from "react"
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Layers,
  Eye,
  EyeOff,
  Info,
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
import { sortAccounts } from "@/lib/firebase/accounts"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { formatCurrency, formatBankAccount } from "@/lib/utils/ipo"
import { cn } from "@/lib/utils"
import {
  CATEGORY_CONFIG,
  ALL_CATEGORIES,
  getCategoryMinLots,
  validateCategoryLots,
} from "@/lib/calculations/categories"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  Application,
  ApplicationCategory,
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
  category: ApplicationCategory
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
  const [defaultCategory, setDefaultCategory] =
    useState<ApplicationCategory>("retail")
  const [defaultBankId, setDefaultBankId] = useState<string>(
    bankAccounts.find((b) => !b.archived)?.id || ""
  )
  const [defaultLots, setDefaultLots] = useState<number>(1)
  const [accountConfigs, setAccountConfigs] = useState<
    Record<string, AccountConfig>
  >({})
  const [sortColumn, setSortColumn] = useState<
    "account" | "bank" | "category" | "lots" | "amount" | null
  >(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSort = (
    col: "account" | "bank" | "category" | "lots" | "amount"
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

  const appliedAccountIds = new Set(
    existingApplications.map((a) => a.accountId)
  )

  const activeAccounts = useMemo(
    () => sortAccounts(accounts.filter((a) => !a.archived)),
    [accounts]
  )
  const myAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type === "my"),
    [activeAccounts]
  )
  const otherAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type === "other"),
    [activeAccounts]
  )
  const activeBankAccounts = bankAccounts.filter((b) => !b.archived)

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  )
  const bankAccountMap = useMemo(
    () => new Map(bankAccounts.map((b) => [b.id, b])),
    [bankAccounts]
  )

  // Track potential ASBA limit breaches for bank accounts in this application batch
  const bankAsbaBreaches = useMemo(() => {
    const breaches: Array<{
      bank: BankAccount
      currentBlocked: number
      newBlocked: number
      totalAfter: number
      limit: number
      exceededAmount: number
    }> = []

    const newAmountByBank = new Map<string, number>()
    for (const id of selectedAccountIds) {
      const cfg = accountConfigs[id]
      const lots = cfg?.lots || 1
      const bankId = cfg?.bankAccountId || defaultBankId
      if (!bankId) continue
      const amount = calculateAmountApplied(lots, ipo.lotSize, ipo.issuePrice)
      newAmountByBank.set(bankId, (newAmountByBank.get(bankId) || 0) + amount)
    }

    const existingPendingByBank = new Map<string, number>()
    for (const app of existingApplications) {
      if (app.status === "pending" && app.bankAccountId) {
        existingPendingByBank.set(
          app.bankAccountId,
          (existingPendingByBank.get(app.bankAccountId) || 0) +
            (app.amountApplied || 0)
        )
      }
    }

    newAmountByBank.forEach((newAmt, bankId) => {
      const bank = bankAccountMap.get(bankId)
      if (!bank || !bank.asbaLimit || bank.asbaLimit <= 0) return
      const currentBlocked = existingPendingByBank.get(bankId) || 0
      const totalAfter = currentBlocked + newAmt
      if (totalAfter > bank.asbaLimit) {
        breaches.push({
          bank,
          currentBlocked,
          newBlocked: newAmt,
          totalAfter,
          limit: bank.asbaLimit,
          exceededAmount: totalAfter - bank.asbaLimit,
        })
      }
    })

    return breaches
  }, [
    selectedAccountIds,
    accountConfigs,
    defaultBankId,
    existingApplications,
    bankAccountMap,
    ipo.lotSize,
    ipo.issuePrice,
  ])

  const [hideAppliedAccounts, setHideAppliedAccounts] = useState(false)
  const [showDuplicatePanConfirm, setShowDuplicatePanConfirm] = useState(false)

  // Normalize PAN helper (uppercase, trimmed)
  const normalizePan = (pan?: string) => pan?.trim().toUpperCase() || ""

  // Map of normalized PAN -> Account for all accounts that have ALREADY applied for this IPO
  const appliedPanMap = useMemo(() => {
    const map = new Map<string, ApplicationAccount>()
    for (const app of existingApplications) {
      const acc = accountMap.get(app.accountId)
      const pan = normalizePan(acc?.pan)
      if (pan && acc) {
        map.set(pan, acc)
      }
    }
    return map
  }, [existingApplications, accountMap])

  // Map of normalized PAN -> Account[] for accounts currently SELECTED in this dialog batch
  const selectedPansMap = useMemo(() => {
    const map = new Map<string, ApplicationAccount[]>()
    for (const accId of selectedAccountIds) {
      const acc = accountMap.get(accId)
      const pan = normalizePan(acc?.pan)
      if (pan && acc) {
        const list = map.get(pan) || []
        list.push(acc)
        map.set(pan, list)
      }
    }
    return map
  }, [selectedAccountIds, accountMap])

  // Intra-batch duplicate PAN groups (where 2 or more selected accounts share the same PAN)
  const intraBatchDuplicatePans = useMemo(() => {
    const duplicates: Array<{ pan: string; accounts: ApplicationAccount[] }> = []
    selectedPansMap.forEach((accs, pan) => {
      if (accs.length > 1) {
        duplicates.push({ pan, accounts: accs })
      }
    })
    return duplicates
  }, [selectedPansMap])

  // Selected accounts that share a PAN with an account that ALREADY applied
  const selectedPanConflictsWithApplied = useMemo(() => {
    const conflicts: Array<{
      selectedAccount: ApplicationAccount
      appliedAccount: ApplicationAccount
      pan: string
    }> = []

    for (const accId of selectedAccountIds) {
      const acc = accountMap.get(accId)
      const pan = normalizePan(acc?.pan)
      if (pan && acc && appliedPanMap.has(pan)) {
        const appliedAcc = appliedPanMap.get(pan)!
        if (appliedAcc.id !== acc.id) {
          conflicts.push({
            selectedAccount: acc,
            appliedAccount: appliedAcc,
            pan,
          })
        }
      }
    }
    return conflicts
  }, [selectedAccountIds, accountMap, appliedPanMap])

  // Set of account IDs in current selection that are involved in duplicate PAN issues
  const problematicAccountIds = useMemo(() => {
    const ids = new Set<string>()
    for (const item of intraBatchDuplicatePans) {
      for (const acc of item.accounts) {
        ids.add(acc.id)
      }
    }
    for (const item of selectedPanConflictsWithApplied) {
      ids.add(item.selectedAccount.id)
    }
    return ids
  }, [intraBatchDuplicatePans, selectedPanConflictsWithApplied])

  const hasDuplicatePanIssues =
    intraBatchDuplicatePans.length > 0 ||
    selectedPanConflictsWithApplied.length > 0

  const allAccountsAlreadyApplied =
    activeAccounts.length > 0 &&
    activeAccounts.every((a) => appliedAccountIds.has(a.id))

  // Helper to check if an unapplied account shares PAN with an already applied account
  const getPanAppliedWarning = (account: ApplicationAccount) => {
    const pan = normalizePan(account.pan)
    if (!pan) return null
    if (appliedPanMap.has(pan)) {
      const appliedAcc = appliedPanMap.get(pan)!
      if (appliedAcc.id !== account.id) {
        return {
          pan,
          appliedAccountName: appliedAcc.name,
        }
      }
    }
    return null
  }

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
            category: defaultCategory,
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
              category: defaultCategory,
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
              category: defaultCategory,
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
            category: defaultCategory,
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

  const applyGlobalCategory = (cat: ApplicationCategory) => {
    setDefaultCategory(cat)
    const recommendedLots = getCategoryMinLots(cat, ipo.lotSize, ipo.issuePrice)
    setDefaultLots(recommendedLots)

    setAccountConfigs((prev) => {
      const updated: Record<string, AccountConfig> = {}
      for (const id of selectedAccountIds) {
        updated[id] = {
          accountId: id,
          bankAccountId: prev[id]?.bankAccountId || defaultBankId,
          lots: recommendedLots,
          category: cat,
        }
      }
      return updated
    })
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
          category: prev[id]?.category || defaultCategory,
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
          category: prev[id]?.category || defaultCategory,
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
        category: prev[accountId]?.category || defaultCategory,
      },
    }))
  }

  const updateIndividualCategory = (
    accountId: string,
    cat: ApplicationCategory
  ) => {
    const minLots = getCategoryMinLots(cat, ipo.lotSize, ipo.issuePrice)
    setAccountConfigs((prev) => {
      const currentLots = prev[accountId]?.lots || defaultLots
      return {
        ...prev,
        [accountId]: {
          accountId,
          bankAccountId: prev[accountId]?.bankAccountId || defaultBankId,
          lots: Math.max(currentLots, minLots),
          category: cat,
        },
      }
    })
  }

  const updateIndividualLots = (accountId: string, lots: number) => {
    const safeLots = Math.max(1, lots)
    setAccountConfigs((prev) => ({
      ...prev,
      [accountId]: {
        accountId,
        bankAccountId: prev[accountId]?.bankAccountId || defaultBankId,
        lots: safeLots,
        category: prev[accountId]?.category || defaultCategory,
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

  const executeSubmission = async () => {
    setError(null)
    setLoading(true)

    try {
      if (selectedAccountIds.length === 0) {
        throw new Error("No accounts selected")
      }

      // Filter out any accounts that already have applications (race condition / double-submit guard)
      const sanitizedAccountIds = selectedAccountIds.filter(
        (id) => !appliedAccountIds.has(id)
      )

      if (sanitizedAccountIds.length === 0) {
        throw new Error("All selected accounts have already applied for this IPO.")
      }

      for (const id of sanitizedAccountIds) {
        const cfg = accountConfigs[id]
        if (!cfg?.bankAccountId && !defaultBankId) {
          throw new Error("Please select a bank account for all applications.")
        }
      }

      const applicationsToCreate = sanitizedAccountIds.map((accountId) => {
        const cfg = accountConfigs[accountId]
        const lots = cfg?.lots || 1
        const bankAccountId = cfg?.bankAccountId || defaultBankId
        const category = cfg?.category || defaultCategory

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
          category,
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
      setShowDuplicatePanConfirm(false)
    }
  }

  const handleSubmit = async () => {
    if (hasDuplicatePanIssues) {
      setShowDuplicatePanConfirm(true)
      return
    }
    await executeSubmission()
  }

  const totalLots = selectedAccountIds.reduce(
    (sum, id) => sum + (accountConfigs[id]?.lots || defaultLots),
    0
  )
  const totalAmount = totalLots * ipo.lotSize * ipo.issuePrice

  const sortedSelectedAccountIds = useMemo(() => {
    if (!sortColumn) {
      return [...selectedAccountIds].sort((idA, idB) => {
        const accA = accountMap.get(idA)
        const accB = accountMap.get(idB)
        const ai = accA?.sortIndex ?? Number.MAX_SAFE_INTEGER
        const bi = accB?.sortIndex ?? Number.MAX_SAFE_INTEGER
        if (ai !== bi) return ai - bi
        const at = accA?.createdAt?.toMillis?.() ?? 0
        const bt = accB?.createdAt?.toMillis?.() ?? 0
        return at - bt
      })
    }

    const list = [...selectedAccountIds]
    list.sort((idA, idB) => {
      const accA = accountMap.get(idA)
      const accB = accountMap.get(idB)
      const cfgA = accountConfigs[idA]
      const cfgB = accountConfigs[idB]

      let res = 0
      if (sortColumn === "account") {
        res = (accA?.name || "").localeCompare(accB?.name || "")
      } else if (sortColumn === "bank") {
        const bankA = bankAccountMap.get(cfgA?.bankAccountId || defaultBankId)
        const bankB = bankAccountMap.get(cfgB?.bankAccountId || defaultBankId)
        res = (bankA?.bankName || "").localeCompare(bankB?.bankName || "")
      } else if (sortColumn === "category") {
        const catA = cfgA?.category || defaultCategory
        const catB = cfgB?.category || defaultCategory
        res = catA.localeCompare(catB)
      } else if (sortColumn === "lots") {
        const lotsA = cfgA?.lots || defaultLots
        const lotsB = cfgB?.lots || defaultLots
        res = lotsA - lotsB
      } else if (sortColumn === "amount") {
        const lotsA = cfgA?.lots || defaultLots
        const lotsB = cfgB?.lots || defaultLots
        res = lotsA - lotsB
      }

      return sortDirection === "asc" ? res : -res
    })
    return list
  }, [
    selectedAccountIds,
    sortColumn,
    sortDirection,
    accountMap,
    accountConfigs,
    bankAccountMap,
    defaultBankId,
    defaultLots,
    defaultCategory,
  ])

  const minShniLots = getCategoryMinLots("shni", ipo.lotSize, ipo.issuePrice)
  const minBhniLots = getCategoryMinLots("bhni", ipo.lotSize, ipo.issuePrice)
  const oneLotAmount = ipo.lotSize * ipo.issuePrice

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader className="border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-primary/10 text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Record Applications — {ipo.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {step === 1
                  ? "Select investor accounts, bidding category, and funding banks"
                  : "Review application lots, verify ASBA limits, and submit"}
              </DialogDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-none font-mono text-xs">
            Step {step} of 2
          </Badge>
        </div>
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
              {/* All Accounts Already Applied Notice */}
              {allAccountsAlreadyApplied && (
                <Alert className="rounded-none border-primary/50 bg-primary/5 text-xs">
                  <Info className="size-4 text-primary" />
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>
                      <strong>All Accounts Applied:</strong> Every active
                      account in your portfolio already has an application recorded for this IPO.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={onCancel}
                      className="rounded-none text-xs"
                    >
                      Close
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Applied Accounts Status Bar */}
              {appliedAccountIds.size > 0 && !allAccountsAlreadyApplied && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-border/70 bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {appliedAccountIds.size} of {activeAccounts.length}
                    </span>
                    <span>accounts have already applied for this IPO</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setHideAppliedAccounts(!hideAppliedAccounts)}
                    className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {hideAppliedAccounts ? (
                      <>
                        <Eye className="size-3" />
                        <span>Show applied ({appliedAccountIds.size})</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3" />
                        <span>Hide applied ({appliedAccountIds.size})</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Duplicate PAN Warning Alert */}
              {hasDuplicatePanIssues && (
                <Alert className="rounded-none border-amber-500/50 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="flex flex-col gap-1">
                    <span className="font-bold">
                      Duplicate PAN Detected — Potential Exchange Disqualification:
                    </span>
                    <div className="flex flex-col gap-0.5 text-[11px] leading-relaxed">
                      {intraBatchDuplicatePans.map((d) => (
                        <span key={d.pan}>
                          • Accounts{" "}
                          <strong>
                            {d.accounts.map((a) => a.name).join(" & ")}
                          </strong>{" "}
                          share PAN <span className="font-mono font-bold">{d.pan}</span>.
                        </span>
                      ))}
                      {selectedPanConflictsWithApplied.map((c) => (
                        <span key={c.selectedAccount.id}>
                          • Account <strong>{c.selectedAccount.name}</strong> shares PAN{" "}
                          <span className="font-mono font-bold">{c.pan}</span> with already-applied{" "}
                          <strong>{c.appliedAccount.name}</strong>.
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                      In Indian IPOs, registrars automatically reject duplicate applications
                      submitted with identical PAN numbers for the same IPO.
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Category & Quick Actions Bar */}
              <div className="flex flex-col gap-2 rounded-none border bg-muted/30 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span>Default Quota:</span>
                    <Select
                      value={defaultCategory}
                      onValueChange={(val) =>
                        val && applyGlobalCategory(val as ApplicationCategory)
                      }
                    >
                      <SelectTrigger className="h-7 w-40 bg-background text-xs">
                        <SelectValue>
                          {CATEGORY_CONFIG[defaultCategory].label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            <div className="flex w-full items-center justify-between gap-2">
                              <span>{CATEGORY_CONFIG[cat].label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                ({CATEGORY_CONFIG[cat].amountLimitText})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {defaultLots} lot{defaultLots > 1 ? "s" : ""} •{" "}
                    {formatCurrency(defaultLots * oneLotAmount)} / app
                  </span>
                </div>
              </div>

              {/* Selection Toolbar */}
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
                    My Accounts (
                    {hideAppliedAccounts
                      ? `${myAccounts.filter((a) => !appliedAccountIds.has(a.id)).length} of ${myAccounts.length}`
                      : myAccounts.length}
                    )
                  </span>
                  {myAccounts.filter((a) => !appliedAccountIds.has(a.id)).length === 0 &&
                  hideAppliedAccounts ? (
                    <div className="py-2 text-[11px] text-muted-foreground italic">
                      All {myAccounts.length} self accounts have already applied for this IPO.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(hideAppliedAccounts
                        ? myAccounts.filter((a) => !appliedAccountIds.has(a.id))
                        : myAccounts
                      ).map((account) => {
                        const alreadyApplied = appliedAccountIds.has(account.id)
                        const isSelected = selectedAccountIds.includes(account.id)
                        const panWarning = !alreadyApplied ? getPanAppliedWarning(account) : null
                        const isDuplicatePanSelected =
                          isSelected && problematicAccountIds.has(account.id)

                        return (
                          <label
                            key={account.id}
                            className={cn(
                              "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all",
                              alreadyApplied &&
                                "cursor-not-allowed border-dashed bg-muted/20 opacity-50",
                              !alreadyApplied &&
                                isDuplicatePanSelected &&
                                "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500",
                              !alreadyApplied &&
                                !isDuplicatePanSelected &&
                                isSelected &&
                                "border-primary bg-primary/5 ring-1 ring-primary",
                              !alreadyApplied &&
                                !isSelected &&
                                panWarning &&
                                "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70",
                              !alreadyApplied &&
                                !isSelected &&
                                !panWarning &&
                                "border-border hover:bg-muted/40"
                            )}
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
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="block truncate text-xs font-semibold text-foreground"
                                    title={account.name}
                                  >
                                    {account.name}
                                  </span>
                                  {account.sortIndex !== undefined && (
                                    <span className="font-mono text-[9px] text-muted-foreground">
                                      #{account.sortIndex + 1}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="block truncate text-[10px] text-muted-foreground">
                                    Self Account
                                  </span>
                                  {account.pan && (
                                    <span className="font-mono text-[9px] text-muted-foreground/80">
                                      • PAN: {account.pan}
                                    </span>
                                  )}
                                </div>
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
                            {!alreadyApplied && isDuplicatePanSelected && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] gap-1"
                              >
                                <AlertTriangle className="size-2.5" />
                                <span>Dup PAN</span>
                              </Badge>
                            )}
                            {!alreadyApplied && !isDuplicatePanSelected && panWarning && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px]"
                                title={`Shares PAN ${account.pan} with ${panWarning.appliedAccountName} (already applied)`}
                              >
                                ⚠️ PAN Applied
                              </Badge>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Other Accounts */}
              {otherAccounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="block text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    Other Accounts (
                    {hideAppliedAccounts
                      ? `${otherAccounts.filter((a) => !appliedAccountIds.has(a.id)).length} of ${otherAccounts.length}`
                      : otherAccounts.length}
                    )
                  </span>
                  {otherAccounts.filter((a) => !appliedAccountIds.has(a.id)).length === 0 &&
                  hideAppliedAccounts ? (
                    <div className="py-2 text-[11px] text-muted-foreground italic">
                      All {otherAccounts.length} partner accounts have already applied for this IPO.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(hideAppliedAccounts
                        ? otherAccounts.filter((a) => !appliedAccountIds.has(a.id))
                        : otherAccounts
                      ).map((account) => {
                        const alreadyApplied = appliedAccountIds.has(account.id)
                        const isSelected = selectedAccountIds.includes(account.id)
                        const panWarning = !alreadyApplied ? getPanAppliedWarning(account) : null
                        const isDuplicatePanSelected =
                          isSelected && problematicAccountIds.has(account.id)

                        return (
                          <label
                            key={account.id}
                            className={cn(
                              "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-none border p-2.5 text-xs transition-all",
                              alreadyApplied &&
                                "cursor-not-allowed border-dashed bg-muted/20 opacity-50",
                              !alreadyApplied &&
                                isDuplicatePanSelected &&
                                "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500",
                              !alreadyApplied &&
                                !isDuplicatePanSelected &&
                                isSelected &&
                                "border-primary bg-primary/5 ring-1 ring-primary",
                              !alreadyApplied &&
                                !isSelected &&
                                panWarning &&
                                "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70",
                              !alreadyApplied &&
                                !isSelected &&
                                !panWarning &&
                                "border-border hover:bg-muted/40"
                            )}
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
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="block truncate text-xs font-semibold text-foreground"
                                    title={account.name}
                                  >
                                    {account.name}
                                  </span>
                                  {account.sortIndex !== undefined && (
                                    <span className="font-mono text-[9px] text-muted-foreground">
                                      #{account.sortIndex + 1}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="block truncate text-[10px] text-muted-foreground">
                                    {account.profitSharePercent}% profit share
                                  </span>
                                  {account.pan && (
                                    <span className="font-mono text-[9px] text-muted-foreground/80">
                                      • PAN: {account.pan}
                                    </span>
                                  )}
                                </div>
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
                            {!alreadyApplied && isDuplicatePanSelected && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] gap-1"
                              >
                                <AlertTriangle className="size-2.5" />
                                <span>Dup PAN</span>
                              </Badge>
                            )}
                            {!alreadyApplied && !isDuplicatePanSelected && panWarning && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px]"
                                title={`Shares PAN ${account.pan} with ${panWarning.appliedAccountName} (already applied)`}
                              >
                                ⚠️ PAN Applied
                              </Badge>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              size="sm"
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleProceedToStep2}
              disabled={selectedAccountIds.length === 0}
              size="sm"
              className="rounded-none text-xs"
            >
              Next: Assign Banks, Quota & Lots
              <ArrowRight data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </div>
      )}

      {/* STEP 2: Configure & Review */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Global Defaults Bar */}
          <div className="grid grid-cols-1 gap-3 rounded-none border bg-muted/40 p-3 text-xs sm:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label className="block truncate text-[11px] font-semibold text-muted-foreground">
                Apply Quota to All
              </label>
              <Select
                value={defaultCategory}
                onValueChange={(val) =>
                  val && applyGlobalCategory(val as ApplicationCategory)
                }
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue>
                    {CATEGORY_CONFIG[defaultCategory].label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].label} (
                      {CATEGORY_CONFIG[cat].amountLimitText})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label className="block truncate text-[11px] font-semibold text-muted-foreground">
                Apply Bank to All
              </label>
              <Select
                value={defaultBankId}
                onValueChange={(val) => val && applyGlobalBank(val)}
              >
                <SelectTrigger className="h-8 w-full bg-background text-xs">
                  <SelectValue placeholder="Select bank">
                    {(val) => {
                      const b = activeBankAccounts.find((acc) => acc.id === val)
                      return b ? formatBankAccount(b) : "Select bank"
                    }}
                  </SelectValue>
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
                  aria-label="Decrease default lots"
                >
                  <Minus className="size-3" />
                </button>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={defaultLots}
                  onChange={(e) => applyGlobalLots(Number(e.target.value))}
                  aria-label="Default lots"
                  className="h-6 [appearance:textfield] border-0 p-0 text-center text-xs font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => applyGlobalLots(defaultLots + 1)}
                  className="px-2 py-1 text-muted-foreground hover:text-foreground"
                  aria-label="Increase default lots"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-muted-foreground">
              Quick Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-6 px-2 text-[10px]"
              onClick={() => applyGlobalCategory("retail")}
            >
              1-Lot Retail ({formatCurrency(oneLotAmount)})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-6 px-2 text-[10px]"
              onClick={() => applyGlobalCategory("shni")}
            >
              Min sHNI ({minShniLots} lots •{" "}
              {formatCurrency(minShniLots * oneLotAmount)})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-6 px-2 text-[10px]"
              onClick={() => applyGlobalCategory("bhni")}
            >
              Min bHNI ({minBhniLots} lots •{" "}
              {formatCurrency(minBhniLots * oneLotAmount)})
            </Button>
          </div>

          {/* ASBA Limit Warning for Current Batch */}
          {bankAsbaBreaches.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-none border border-destructive/60 bg-destructive/10 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  ASBA Capital Limit Warning: Selected bank account(s) will
                  exceed balance limit
                </span>
              </div>
              <div className="flex flex-col gap-1 pl-5 text-[11px] text-foreground">
                {bankAsbaBreaches.map((b) => (
                  <div
                    key={b.bank.id}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span className="font-semibold">
                      {formatBankAccount(b.bank)}:
                    </span>
                    <span>
                      Total blocked will become{" "}
                      <span className="font-mono font-bold text-destructive">
                        {formatCurrency(b.totalAfter)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">vs limit</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(b.limit)}
                    </span>
                    <Badge
                      variant="destructive"
                      className="px-1 py-0 font-mono text-[9px]"
                    >
                      Exceeds by {formatCurrency(b.exceededAmount)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate PAN Warning for Current Batch */}
          {hasDuplicatePanIssues && (
            <div className="flex flex-col gap-1.5 rounded-none border border-amber-500/60 bg-amber-500/10 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  Duplicate PAN Warning: Identical PANs detected across applications
                </span>
              </div>
              <div className="flex flex-col gap-1 pl-5 text-[11px] text-foreground">
                {intraBatchDuplicatePans.map((d) => (
                  <div key={d.pan}>
                    • <strong>{d.accounts.map((a) => a.name).join(" and ")}</strong> share PAN{" "}
                    <span className="font-mono font-bold">{d.pan}</span>
                  </div>
                ))}
                {selectedPanConflictsWithApplied.map((c) => (
                  <div key={c.selectedAccount.id}>
                    • <strong>{c.selectedAccount.name}</strong> shares PAN{" "}
                    <span className="font-mono font-bold">{c.pan}</span> with already-applied{" "}
                    <strong>{c.appliedAccount.name}</strong>
                  </div>
                ))}
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  Registrars and stock exchanges automatically disqualify duplicate applications submitted with matching PANs.
                </span>
              </div>
            </div>
          )}

          {/* Detailed Applications Table */}
          <div className="max-h-[300px] min-w-0 overflow-x-auto overflow-y-auto rounded-none border border-border/80">
            <Table className="min-w-[700px]">
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
                  <TableHead className="h-9 min-w-[180px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                    <button
                      type="button"
                      onClick={() => toggleSort("bank")}
                      className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                    >
                      Bank Account
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
                  <TableHead className="h-9 w-[120px] text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                    <button
                      type="button"
                      onClick={() => toggleSort("category")}
                      className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                    >
                      Quota
                      {sortColumn === "category" ? (
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
                  <TableHead className="h-9 w-[80px] text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                    <button
                      type="button"
                      onClick={() => toggleSort("lots")}
                      className="mx-auto inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground"
                    >
                      Lots
                      {sortColumn === "lots" ? (
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
                  <TableHead className="h-9 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                    Shares
                  </TableHead>
                  <TableHead className="h-9 text-right text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none">
                    <button
                      type="button"
                      onClick={() => toggleSort("amount")}
                      className="ml-auto inline-flex flex-row-reverse items-center gap-1 font-semibold transition-colors hover:text-foreground"
                    >
                      Amount
                      {sortColumn === "amount" ? (
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
                {sortedSelectedAccountIds.map((accountId) => {
                  const account = accountMap.get(accountId)
                  const cfg = accountConfigs[accountId]
                  const lots = cfg?.lots || defaultLots
                  const bankId = cfg?.bankAccountId || defaultBankId
                  const cat = cfg?.category || defaultCategory
                  const shares = calculateSharesApplied(lots, ipo.lotSize)
                  const amount = calculateAmountApplied(
                    lots,
                    ipo.lotSize,
                    ipo.issuePrice
                  )
                  const validation = validateCategoryLots(
                    cat,
                    lots,
                    ipo.lotSize,
                    ipo.issuePrice
                  )

                  return (
                    <TableRow key={accountId}>
                      <TableCell className="text-xs font-medium">
                        <div className="flex max-w-[210px] min-w-0 items-center gap-1.5 flex-wrap">
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
                          {problematicAccountIds.has(accountId) && (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] gap-1 px-1 py-0"
                              title={
                                account?.pan
                                  ? `Duplicate PAN detected: ${account.pan}`
                                  : "Duplicate PAN detected"
                              }
                            >
                              <AlertTriangle className="size-2.5" />
                              <span>Dup PAN</span>
                            </Badge>
                          )}
                        </div>
                        {account?.pan && (
                          <span className="block font-mono text-[9px] text-muted-foreground">
                            PAN: {account.pan}
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Select
                          value={bankId}
                          onValueChange={(val) =>
                            val && updateIndividualBank(accountId, val)
                          }
                        >
                          <SelectTrigger className="h-7 w-full truncate bg-background text-xs">
                            <SelectValue placeholder="Select bank">
                              {(val) => {
                                const b = activeBankAccounts.find(
                                  (acc) => acc.id === val
                                )
                                return b ? formatBankAccount(b) : "Select bank"
                              }}
                            </SelectValue>
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
                        <Select
                          value={cat}
                          onValueChange={(val) =>
                            val &&
                            updateIndividualCategory(
                              accountId,
                              val as ApplicationCategory
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-28 truncate bg-background text-xs">
                            <SelectValue>
                              <Badge
                                variant={CATEGORY_CONFIG[cat].badgeVariant}
                                className="px-1 py-0 font-mono text-[9px]"
                              >
                                {CATEGORY_CONFIG[cat].shortLabel}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {CATEGORY_CONFIG[c].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col items-center">
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
                            aria-label={`Lots for ${account?.name || "account"}`}
                            className="h-7 w-16 px-1.5 text-center text-xs font-bold"
                          />
                          {!validation.isValid && (
                            <span
                              className="max-w-[80px] truncate text-[9px] font-medium text-destructive"
                              title={validation.warning}
                            >
                              ⚠️ Out of range
                            </span>
                          )}
                        </div>
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

          <DialogFooter className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={loading}
              size="sm"
              className="rounded-none text-xs"
            >
              <ArrowLeft data-icon="inline-start" />
              Back to Accounts
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
              className="rounded-none text-xs"
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

      {/* Duplicate PAN Submission Confirmation Modal */}
      <AlertDialog
        open={showDuplicatePanConfirm}
        onOpenChange={setShowDuplicatePanConfirm}
      >
        <AlertDialogContent className="rounded-none sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" />
              </div>
              <AlertDialogTitle className="text-base font-bold">
                Duplicate PAN Warning
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground pt-2">
              Multiple applications in this batch share identical PAN numbers:
              <div className="my-2.5 flex flex-col gap-1 rounded-none border border-amber-500/30 bg-amber-500/5 p-2 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                {intraBatchDuplicatePans.map((d) => (
                  <div key={d.pan}>
                    • <strong>{d.accounts.map((a) => a.name).join(", ")}</strong> share PAN <strong>{d.pan}</strong>
                  </div>
                ))}
                {selectedPanConflictsWithApplied.map((c) => (
                  <div key={c.selectedAccount.id}>
                    • <strong>{c.selectedAccount.name}</strong> shares PAN <strong>{c.pan}</strong> with already-applied <strong>{c.appliedAccount.name}</strong>
                  </div>
                ))}
              </div>
              In Indian IPOs, SEBI regulations mandate that duplicate bids under
              the same PAN will be rejected by the exchange registrar. Are you
              sure you want to proceed anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-border/60 pt-3">
            <AlertDialogCancel
              disabled={loading}
              onClick={() => setShowDuplicatePanConfirm(false)}
              className="rounded-none text-xs"
            >
              Back to Selection
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={executeSubmission}
              className="rounded-none bg-amber-600 text-white hover:bg-amber-700 text-xs"
            >
              {loading && <Spinner className="size-3" />}
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
