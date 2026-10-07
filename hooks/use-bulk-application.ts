"use client"

import { useState, useMemo, useCallback } from "react"
import { toast } from "@/components/ui/toast"
import { createApplicationsBatch } from "@/lib/firebase/applications"
import { sortAccounts } from "@/lib/firebase/accounts"
import {
  calculateSharesApplied,
  calculateAmountApplied,
} from "@/lib/calculations/financials"
import { getCategoryMinLots } from "@/lib/calculations/categories"
import type {
  Ipo,
  ApplicationAccount,
  BankAccount,
  Application,
  ApplicationCategory,
} from "@/types"

export interface AccountConfig {
  accountId: string
  bankAccountId: string
  lots: number
  category: ApplicationCategory
}

export type BulkAppSortColumn =
  "account" | "bank" | "category" | "lots" | "amount" | null

interface UseBulkApplicationProps {
  userId: string
  ipo: Ipo
  existingApplications: Application[]
  accounts: ApplicationAccount[]
  bankAccounts: BankAccount[]
  onSuccess: () => void
}

export function useBulkApplication({
  userId,
  ipo,
  existingApplications,
  accounts,
  bankAccounts,
  onSuccess,
}: UseBulkApplicationProps) {
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
  const [sortColumn, setSortColumn] = useState<BulkAppSortColumn>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hideAppliedAccounts, setHideAppliedAccounts] = useState(false)
  const [showDuplicatePanConfirm, setShowDuplicatePanConfirm] = useState(false)

  const toggleSort = useCallback(
    (col: "account" | "bank" | "category" | "lots" | "amount") => {
      if (sortColumn !== col) {
        setSortColumn(col)
        setSortDirection("asc")
      } else if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortColumn(null)
      }
    },
    [sortColumn, sortDirection]
  )

  const appliedAccountIds = useMemo(
    () => new Set(existingApplications.map((a) => a.accountId)),
    [existingApplications]
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
  const activeBankAccounts = useMemo(
    () => bankAccounts.filter((b) => !b.archived),
    [bankAccounts]
  )

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

  // Normalize PAN helper (uppercase, trimmed)
  const normalizePan = useCallback(
    (pan?: string) => pan?.trim().toUpperCase() || "",
    []
  )

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
  }, [existingApplications, accountMap, normalizePan])

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
  }, [selectedAccountIds, accountMap, normalizePan])

  // Intra-batch duplicate PAN groups (where 2 or more selected accounts share the same PAN)
  const intraBatchDuplicatePans = useMemo(() => {
    const duplicates: Array<{ pan: string; accounts: ApplicationAccount[] }> =
      []
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
  }, [selectedAccountIds, accountMap, appliedPanMap, normalizePan])

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
  const getPanAppliedWarning = useCallback(
    (account: ApplicationAccount) => {
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
    },
    [appliedPanMap, normalizePan]
  )

  const toggleAccountSelection = useCallback(
    (accountId: string) => {
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
    },
    [appliedAccountIds, defaultBankId, defaultLots, defaultCategory]
  )

  const selectAllMy = useCallback(() => {
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
  }, [
    myAccounts,
    appliedAccountIds,
    defaultBankId,
    defaultLots,
    defaultCategory,
  ])

  const selectAllOther = useCallback(() => {
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
  }, [
    otherAccounts,
    appliedAccountIds,
    defaultBankId,
    defaultLots,
    defaultCategory,
  ])

  const selectAllAvailable = useCallback(() => {
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
  }, [
    activeAccounts,
    appliedAccountIds,
    defaultBankId,
    defaultLots,
    defaultCategory,
  ])

  const deselectAll = useCallback(() => {
    setSelectedAccountIds([])
    setAccountConfigs({})
  }, [])

  const applyGlobalCategory = useCallback(
    (cat: ApplicationCategory) => {
      setDefaultCategory(cat)
      const recommendedLots = getCategoryMinLots(
        cat,
        ipo.lotSize,
        ipo.issuePrice
      )
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
    },
    [ipo.lotSize, ipo.issuePrice, selectedAccountIds, defaultBankId]
  )

  const applyGlobalBank = useCallback(
    (bankId: string) => {
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
    },
    [selectedAccountIds, defaultLots, defaultCategory]
  )

  const applyGlobalLots = useCallback(
    (lots: number) => {
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
    },
    [selectedAccountIds, defaultBankId, defaultCategory]
  )

  const updateIndividualBank = useCallback(
    (accountId: string, bankId: string) => {
      setAccountConfigs((prev) => ({
        ...prev,
        [accountId]: {
          accountId,
          bankAccountId: bankId,
          lots: prev[accountId]?.lots || defaultLots,
          category: prev[accountId]?.category || defaultCategory,
        },
      }))
    },
    [defaultLots, defaultCategory]
  )

  const updateIndividualCategory = useCallback(
    (accountId: string, cat: ApplicationCategory) => {
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
    },
    [ipo.lotSize, ipo.issuePrice, defaultLots, defaultBankId]
  )

  const updateIndividualLots = useCallback(
    (accountId: string, lots: number) => {
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
    },
    [defaultBankId, defaultCategory]
  )

  const handleProceedToStep2 = useCallback(() => {
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
  }, [selectedAccountIds.length, activeBankAccounts.length])

  const executeSubmission = useCallback(async () => {
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
        throw new Error(
          "All selected accounts have already applied for this IPO."
        )
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
  }, [
    selectedAccountIds,
    appliedAccountIds,
    accountConfigs,
    defaultBankId,
    defaultCategory,
    ipo,
    userId,
    onSuccess,
  ])

  const handleSubmit = useCallback(async () => {
    if (hasDuplicatePanIssues) {
      setShowDuplicatePanConfirm(true)
      return
    }
    await executeSubmission()
  }, [hasDuplicatePanIssues, executeSubmission])

  const totalLots = useMemo(
    () =>
      selectedAccountIds.reduce(
        (sum, id) => sum + (accountConfigs[id]?.lots || defaultLots),
        0
      ),
    [selectedAccountIds, accountConfigs, defaultLots]
  )

  const totalAmount = useMemo(
    () => totalLots * ipo.lotSize * ipo.issuePrice,
    [totalLots, ipo.lotSize, ipo.issuePrice]
  )

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

  const minShniLots = useMemo(
    () => getCategoryMinLots("shni", ipo.lotSize, ipo.issuePrice),
    [ipo.lotSize, ipo.issuePrice]
  )
  const minBhniLots = useMemo(
    () => getCategoryMinLots("bhni", ipo.lotSize, ipo.issuePrice),
    [ipo.lotSize, ipo.issuePrice]
  )
  const oneLotAmount = useMemo(
    () => ipo.lotSize * ipo.issuePrice,
    [ipo.lotSize, ipo.issuePrice]
  )

  return {
    step,
    setStep,
    selectedAccountIds,
    defaultCategory,
    defaultBankId,
    defaultLots,
    accountConfigs,
    sortColumn,
    sortDirection,
    toggleSort,
    loading,
    error,
    hideAppliedAccounts,
    setHideAppliedAccounts,
    showDuplicatePanConfirm,
    setShowDuplicatePanConfirm,
    appliedAccountIds,
    activeAccounts,
    myAccounts,
    otherAccounts,
    activeBankAccounts,
    accountMap,
    bankAccountMap,
    bankAsbaBreaches,
    intraBatchDuplicatePans,
    selectedPanConflictsWithApplied,
    problematicAccountIds,
    hasDuplicatePanIssues,
    allAccountsAlreadyApplied,
    getPanAppliedWarning,
    toggleAccountSelection,
    selectAllMy,
    selectAllOther,
    selectAllAvailable,
    deselectAll,
    applyGlobalCategory,
    applyGlobalBank,
    applyGlobalLots,
    updateIndividualBank,
    updateIndividualCategory,
    updateIndividualLots,
    handleProceedToStep2,
    handleSubmit,
    executeSubmission,
    totalLots,
    totalAmount,
    sortedSelectedAccountIds,
    minShniLots,
    minBhniLots,
    oneLotAmount,
  }
}
