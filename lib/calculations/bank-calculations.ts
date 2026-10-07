import type { Application, Ipo, BankAccount } from "@/types"
import { calculateInvestment } from "./shared"

export interface BankMoneySummary {
  totalApplied: number
  blockedAmount: number
  investedAmount: number
  activeApplicationsCount: number
  totalApplicationsCount: number
  relatedIpos: Array<{ id: string; name: string }>
}

/**
 * Derives money statistics and related IPOs for a bank account.
 */
export function calculateBankMoneySummary(
  bankAccountId: string,
  applications: Application[],
  ipoMap: Map<string, Ipo>
): BankMoneySummary {
  let totalApplied = 0
  let blockedAmount = 0
  let investedAmount = 0
  let activeApplicationsCount = 0
  let totalApplicationsCount = 0

  const relatedIpoIds = new Set<string>()

  for (const app of applications) {
    if (app.bankAccountId !== bankAccountId) continue

    totalApplicationsCount++
    totalApplied += app.amountApplied || 0
    relatedIpoIds.add(app.ipoId)

    const ipo = ipoMap.get(app.ipoId)
    const issuePrice = ipo?.issuePrice || 0

    if (app.status === "pending") {
      activeApplicationsCount++
      blockedAmount += app.amountApplied || 0
    } else if (app.status === "allotted" || app.status === "sold") {
      const shares = app.allottedShares ?? 0
      investedAmount += calculateInvestment(shares, issuePrice)
    }
  }

  const relatedIpos: Array<{ id: string; name: string }> = []
  relatedIpoIds.forEach((id) => {
    const ipo = ipoMap.get(id)
    if (ipo) {
      relatedIpos.push({ id: ipo.id, name: ipo.name })
    }
  })

  return {
    totalApplied,
    blockedAmount,
    investedAmount,
    activeApplicationsCount,
    totalApplicationsCount,
    relatedIpos,
  }
}

export interface BankAsbaWarning {
  bankId: string
  bankName: string
  nickname?: string
  last4?: string
  asbaLimit: number
  blockedAmount: number
  availableLimit: number
  exceededAmount: number
  utilizationPercent: number
  isExceeded: boolean
  isNearLimit: boolean
  activeIposCount: number
  activeIpoNames: string[]
}

/**
 * Calculates ASBA capital utilization and returns warnings for bank accounts approaching or exceeding balance limits.
 */
export function checkBankAsbaLimits(
  bankAccounts: BankAccount[],
  applications: Application[],
  ipoMap: Map<string, Ipo>
): BankAsbaWarning[] {
  const warnings: BankAsbaWarning[] = []

  const bankBlockedMap = new Map<
    string,
    { blockedAmount: number; ipoIds: Set<string> }
  >()

  for (const app of applications) {
    if (app.status !== "pending" || !app.bankAccountId) continue

    const entry = bankBlockedMap.get(app.bankAccountId) || {
      blockedAmount: 0,
      ipoIds: new Set<string>(),
    }
    entry.blockedAmount += app.amountApplied || 0
    entry.ipoIds.add(app.ipoId)
    bankBlockedMap.set(app.bankAccountId, entry)
  }

  for (const bank of bankAccounts) {
    if (bank.archived || !bank.asbaLimit || bank.asbaLimit <= 0) continue

    const usage = bankBlockedMap.get(bank.id) || {
      blockedAmount: 0,
      ipoIds: new Set<string>(),
    }

    const blocked = usage.blockedAmount
    const limit = bank.asbaLimit
    const isExceeded = blocked > limit
    const utilizationPercent = Math.round((blocked / limit) * 100)
    const isNearLimit = !isExceeded && utilizationPercent >= 80

    if (isExceeded || isNearLimit) {
      const activeIpoNames: string[] = []
      usage.ipoIds.forEach((id) => {
        const ipo = ipoMap.get(id)
        if (ipo) activeIpoNames.push(ipo.name)
      })

      warnings.push({
        bankId: bank.id,
        bankName: bank.bankName,
        nickname: bank.nickname,
        last4: bank.last4,
        asbaLimit: limit,
        blockedAmount: blocked,
        availableLimit: limit - blocked,
        exceededAmount: Math.max(0, blocked - limit),
        utilizationPercent,
        isExceeded,
        isNearLimit,
        activeIposCount: usage.ipoIds.size,
        activeIpoNames,
      })
    }
  }

  return warnings.sort((a, b) => {
    if (a.isExceeded && !b.isExceeded) return -1
    if (!a.isExceeded && b.isExceeded) return 1
    return b.utilizationPercent - a.utilizationPercent
  })
}
