import type { Application, Ipo, ApplicationAccount } from "@/types"

/**
 * Central financial calculations for IPO Tracker.
 * All calculations adhere strictly to Section 7, 8, 14, 15, 16, 17, 18, 19, and 20 of the product specification.
 */

/**
 * Calculates total shares applied for given lots and lot size.
 */
export function calculateSharesApplied(lots: number, lotSize: number): number {
  if (!lots || lots < 0 || !lotSize || lotSize < 0) return 0
  return lots * lotSize
}

/**
 * Calculates total application amount blocked / applied.
 */
export function calculateAmountApplied(
  lots: number,
  lotSize: number,
  issuePrice: number
): number {
  if (!lots || lots < 0 || !lotSize || lotSize < 0 || !issuePrice || issuePrice < 0) {
    return 0
  }
  return lots * lotSize * issuePrice
}

/**
 * Calculates invested amount for allotted shares at issue price.
 */
export function calculateInvestment(
  allottedShares: number,
  issuePrice: number
): number {
  if (!allottedShares || allottedShares < 0 || !issuePrice || issuePrice < 0) {
    return 0
  }
  return allottedShares * issuePrice
}

/**
 * Calculates sale value for sold shares.
 */
export function calculateSaleValue(
  sharesSold: number,
  salePrice: number
): number {
  if (!sharesSold || sharesSold < 0 || !salePrice || salePrice < 0) {
    return 0
  }
  return sharesSold * salePrice
}

/**
 * Calculates realized gross profit for sold shares.
 */
export function calculateRealizedGrossProfit(
  sharesSold: number,
  salePrice: number,
  issuePrice: number
): number {
  if (!sharesSold || sharesSold < 0) return 0
  const saleVal = calculateSaleValue(sharesSold, salePrice)
  const costVal = sharesSold * issuePrice
  return saleVal - costVal
}

/**
 * Calculates profit shared with Other Accounts based on profit only.
 * Profit share is strictly ₹0 if gross profit is negative or zero (loss/break-even).
 */
export function calculateProfitShared(
  grossProfit: number,
  profitSharePercent: number
): number {
  if (!grossProfit || grossProfit <= 0 || !profitSharePercent || profitSharePercent <= 0) {
    return 0
  }
  return grossProfit * (profitSharePercent / 100)
}

/**
 * Calculates the user's final net profit after deducting shared profit.
 */
export function calculateYourProfit(
  grossProfit: number,
  profitSharePercent: number
): number {
  if (!grossProfit) return 0
  const shared = calculateProfitShared(grossProfit, profitSharePercent)
  return grossProfit - shared
}

export interface ApplicationProfitResult {
  realizedGrossProfit: number
  realizedProfitShared: number
  realizedYourProfit: number
  unrealizedGrossProfit: number
  unrealizedProfitShared: number
  unrealizedYourProfit: number
  hasRealized: boolean
  hasUnrealized: boolean
}

/**
 * Calculates realized and unrealized profit for an individual application.
 */
export function calculateApplicationProfit(
  application: Application,
  ipo: Ipo,
  account?: ApplicationAccount
): ApplicationProfitResult {
  const profitSharePercent =
    account?.type === "my" ? 0 : (account?.profitSharePercent ?? 0)

  let realizedGrossProfit = 0
  let realizedProfitShared = 0
  let realizedYourProfit = 0
  let hasRealized = false

  // 1. Realized Profit
  if (
    application.status === "sold" &&
    application.sharesSold !== undefined &&
    application.sharesSold > 0 &&
    application.salePrice !== undefined
  ) {
    hasRealized = true
    realizedGrossProfit = calculateRealizedGrossProfit(
      application.sharesSold,
      application.salePrice,
      ipo.issuePrice
    )
    realizedProfitShared = calculateProfitShared(
      realizedGrossProfit,
      profitSharePercent
    )
    realizedYourProfit = realizedGrossProfit - realizedProfitShared
  }

  // 2. Unrealized Profit for remaining unsold shares
  let unrealizedGrossProfit = 0
  let unrealizedProfitShared = 0
  let unrealizedYourProfit = 0
  let hasUnrealized = false

  const totalAllottedShares = application.allottedShares || 0
  const sharesSold = application.sharesSold || 0
  const unsoldShares = Math.max(0, totalAllottedShares - sharesSold)

  const benchmarkPrice =
    application.currentPrice ||
    ipo.currentPrice ||
    application.listingPrice ||
    ipo.listingPrice

  if (
    unsoldShares > 0 &&
    benchmarkPrice !== undefined &&
    benchmarkPrice > 0 &&
    (application.status === "allotted" || application.status === "sold")
  ) {
    hasUnrealized = true
    unrealizedGrossProfit = (benchmarkPrice - ipo.issuePrice) * unsoldShares
    unrealizedProfitShared = calculateProfitShared(
      unrealizedGrossProfit,
      profitSharePercent
    )
    unrealizedYourProfit = unrealizedGrossProfit - unrealizedProfitShared
  }

  return {
    realizedGrossProfit,
    realizedProfitShared,
    realizedYourProfit,
    unrealizedGrossProfit,
    unrealizedProfitShared,
    unrealizedYourProfit,
    hasRealized,
    hasUnrealized,
  }
}

export interface IpoProfitSummary {
  totalRealizedGrossProfit: number
  totalRealizedProfitShared: number
  totalRealizedYourProfit: number
  totalUnrealizedGrossProfit: number
  totalUnrealizedProfitShared: number
  totalUnrealizedYourProfit: number
  totalNetYourProfit: number
  hasAnyProfit: boolean
}

/**
 * Derives aggregate profit metrics for an IPO across all its applications.
 */
export function calculateIpoProfitSummary(
  applications: Application[],
  ipo: Ipo,
  accountsMap: Map<string, ApplicationAccount>
): IpoProfitSummary {
  let totalRealizedGrossProfit = 0
  let totalRealizedProfitShared = 0
  let totalRealizedYourProfit = 0

  let totalUnrealizedGrossProfit = 0
  let totalUnrealizedProfitShared = 0
  let totalUnrealizedYourProfit = 0

  let hasAnyProfit = false

  for (const app of applications) {
    const account = accountsMap.get(app.accountId)
    const profit = calculateApplicationProfit(app, ipo, account)

    if (profit.hasRealized) {
      hasAnyProfit = true
      totalRealizedGrossProfit += profit.realizedGrossProfit
      totalRealizedProfitShared += profit.realizedProfitShared
      totalRealizedYourProfit += profit.realizedYourProfit
    }

    if (profit.hasUnrealized) {
      hasAnyProfit = true
      totalUnrealizedGrossProfit += profit.unrealizedGrossProfit
      totalUnrealizedProfitShared += profit.unrealizedProfitShared
      totalUnrealizedYourProfit += profit.unrealizedYourProfit
    }
  }

  const totalNetYourProfit =
    totalRealizedYourProfit + totalUnrealizedYourProfit

  return {
    totalRealizedGrossProfit,
    totalRealizedProfitShared,
    totalRealizedYourProfit,
    totalUnrealizedGrossProfit,
    totalUnrealizedProfitShared,
    totalUnrealizedYourProfit,
    totalNetYourProfit,
    hasAnyProfit,
  }
}

export interface IpoMoneySummary {
  totalApplied: number
  blockedAmount: number
  investedAmount: number
  refundExpected: number
  totalLotsApplied: number
  totalSharesApplied: number
  totalAllottedShares: number
  applicationsCount: number
  pendingCount: number
  allottedCount: number
  notAllottedCount: number
  soldCount: number
}

/**
 * Derives comprehensive money and count summary for an IPO based on its applications.
 */
export function calculateIpoMoneySummary(
  applications: Application[],
  issuePrice: number
): IpoMoneySummary {
  let totalApplied = 0
  let blockedAmount = 0
  let investedAmount = 0
  let refundExpected = 0
  let totalLotsApplied = 0
  let totalSharesApplied = 0
  let totalAllottedShares = 0

  let pendingCount = 0
  let allottedCount = 0
  let notAllottedCount = 0
  let soldCount = 0

  for (const app of applications) {
    totalApplied += app.amountApplied || 0
    totalLotsApplied += app.lotsApplied || 0
    totalSharesApplied += app.sharesApplied || 0

    if (app.status === "pending") {
      pendingCount++
      blockedAmount += app.amountApplied || 0
    } else if (app.status === "allotted") {
      allottedCount++
      const shares = app.allottedShares ?? 0
      totalAllottedShares += shares
      investedAmount += calculateInvestment(shares, issuePrice)
    } else if (app.status === "not_allotted") {
      notAllottedCount++
      refundExpected += app.amountApplied || 0
    } else if (app.status === "sold") {
      soldCount++
      const shares = app.allottedShares ?? 0
      totalAllottedShares += shares
      investedAmount += calculateInvestment(shares, issuePrice)
    }
  }

  return {
    totalApplied,
    blockedAmount,
    investedAmount,
    refundExpected,
    totalLotsApplied,
    totalSharesApplied,
    totalAllottedShares,
    applicationsCount: applications.length,
    pendingCount,
    allottedCount,
    notAllottedCount,
    soldCount,
  }
}

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

export interface AccountMoneySummary {
  totalApplications: number
  pendingCount: number
  allottedCount: number
  notAllottedCount: number
  soldCount: number
  totalApplied: number
  totalInvested: number
  totalRealizedGrossProfit: number
  totalRealizedProfitShared: number
  totalRealizedYourProfit: number
}

/**
 * Derives application counts, monetary totals, and profit figures for an application account.
 */
export function calculateAccountMoneySummary(
  accountId: string,
  applications: Application[],
  ipoMap: Map<string, Ipo>,
  account?: ApplicationAccount
): AccountMoneySummary {
  let totalApplications = 0
  let pendingCount = 0
  let allottedCount = 0
  let notAllottedCount = 0
  let soldCount = 0
  let totalApplied = 0
  let totalInvested = 0

  let totalRealizedGrossProfit = 0
  let totalRealizedProfitShared = 0
  let totalRealizedYourProfit = 0

  for (const app of applications) {
    if (app.accountId !== accountId) continue

    totalApplications++
    totalApplied += app.amountApplied || 0

    const ipo = ipoMap.get(app.ipoId)
    const issuePrice = ipo?.issuePrice || 0

    if (app.status === "pending") {
      pendingCount++
    } else if (app.status === "allotted") {
      allottedCount++
      const shares = app.allottedShares ?? 0
      totalInvested += calculateInvestment(shares, issuePrice)
    } else if (app.status === "not_allotted") {
      notAllottedCount++
    } else if (app.status === "sold") {
      soldCount++
      const shares = app.allottedShares ?? 0
      totalInvested += calculateInvestment(shares, issuePrice)

      if (ipo) {
        const profit = calculateApplicationProfit(app, ipo, account)
        totalRealizedGrossProfit += profit.realizedGrossProfit
        totalRealizedProfitShared += profit.realizedProfitShared
        totalRealizedYourProfit += profit.realizedYourProfit
      }
    }
  }

  return {
    totalApplications,
    pendingCount,
    allottedCount,
    notAllottedCount,
    soldCount,
    totalApplied,
    totalInvested,
    totalRealizedGrossProfit,
    totalRealizedProfitShared,
    totalRealizedYourProfit,
  }
}

export interface DashboardMetrics {
  totalBlocked: number
  totalInvested: number
  totalYourRealizedProfit: number
  totalProfitShared: number
  totalGrossRealizedProfit: number
  totalUnrealizedProfit: number
  totalNetProfit: number
  totalApplied: number
  totalRefundExpected: number

  totalApplications: number
  pendingApplications: number
  allottedApplications: number
  notAllottedApplications: number
  soldApplications: number

  totalIpos: number
  activeIposCount: number
  mainboardCount: number
  smeCount: number
}

/**
 * Calculates global executive dashboard metrics from all user data.
 */
export function calculateDashboardMetrics(
  ipos: Ipo[],
  applications: Application[],
  accounts: ApplicationAccount[]
): DashboardMetrics {
  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  let totalBlocked = 0
  let totalInvested = 0
  let totalYourRealizedProfit = 0
  let totalProfitShared = 0
  let totalGrossRealizedProfit = 0
  let totalUnrealizedProfit = 0
  let totalApplied = 0
  let totalRefundExpected = 0

  let pendingApplications = 0
  let allottedApplications = 0
  let notAllottedApplications = 0
  let soldApplications = 0

  for (const app of applications) {
    totalApplied += app.amountApplied || 0
    const ipo = ipoMap.get(app.ipoId)
    const account = accountMap.get(app.accountId)
    const issuePrice = ipo?.issuePrice || 0

    if (app.status === "pending") {
      pendingApplications++
      totalBlocked += app.amountApplied || 0
    } else if (app.status === "allotted") {
      allottedApplications++
      const shares = app.allottedShares ?? 0
      totalInvested += calculateInvestment(shares, issuePrice)

      if (ipo) {
        const profit = calculateApplicationProfit(app, ipo, account)
        if (profit.hasUnrealized) {
          totalUnrealizedProfit += profit.unrealizedYourProfit
        }
      }
    } else if (app.status === "not_allotted") {
      notAllottedApplications++
      totalRefundExpected += app.amountApplied || 0
    } else if (app.status === "sold") {
      soldApplications++
      const shares = app.allottedShares ?? 0
      totalInvested += calculateInvestment(shares, issuePrice)

      if (ipo) {
        const profit = calculateApplicationProfit(app, ipo, account)
        if (profit.hasRealized) {
          totalGrossRealizedProfit += profit.realizedGrossProfit
          totalProfitShared += profit.realizedProfitShared
          totalYourRealizedProfit += profit.realizedYourProfit
        }
        if (profit.hasUnrealized) {
          totalUnrealizedProfit += profit.unrealizedYourProfit
        }
      }
    }
  }

  const now = Date.now()
  let activeIposCount = 0
  let mainboardCount = 0
  let smeCount = 0

  for (const ipo of ipos) {
    if (ipo.type === "sme") {
      smeCount++
    } else {
      mainboardCount++
    }

    if (!ipo.archived) {
      const listingTime = ipo.listingDate?.toMillis?.() ?? null
      if (!listingTime || now < listingTime) {
        activeIposCount++
      }
    }
  }

  return {
    totalBlocked,
    totalInvested,
    totalYourRealizedProfit,
    totalProfitShared,
    totalGrossRealizedProfit,
    totalUnrealizedProfit,
    totalNetProfit: totalYourRealizedProfit + totalUnrealizedProfit,
    totalApplied,
    totalRefundExpected,

    totalApplications: applications.length,
    pendingApplications,
    allottedApplications,
    notAllottedApplications,
    soldApplications,

    totalIpos: ipos.length,
    activeIposCount,
    mainboardCount,
    smeCount,
  }
}
