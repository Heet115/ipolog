import type { Application, Ipo, ApplicationAccount } from "@/types"
import {
  calculateRealizedGrossProfit,
  calculateProfitShared,
  calculateInvestment,
} from "./shared"

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

  const totalAllottedShares =
    application.allottedShares !== undefined && application.allottedShares >= 0
      ? application.allottedShares
      : application.allottedLots !== undefined && application.allottedLots >= 0
        ? application.allottedLots * ipo.lotSize
        : application.status === "allotted" || application.status === "sold"
          ? application.sharesApplied ||
            (application.lotsApplied || 1) * ipo.lotSize
          : 0
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

  const totalNetYourProfit = totalRealizedYourProfit + totalUnrealizedYourProfit

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
