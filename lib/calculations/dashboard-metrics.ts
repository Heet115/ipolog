import type { Application, Ipo, ApplicationAccount } from "@/types"
import { calculateInvestment } from "./shared"
import { calculateApplicationProfit } from "./ipo-calculations"

export interface DashboardMetrics {
  totalBlocked: number
  totalInvested: number // Active holdings cost basis (currently invested)
  activeInvested: number // Explicit alias for active holdings cost
  lifetimeInvested: number // Cumulative capital deployed across all lifetime allotments
  activeHoldingsCount: number // Applications currently holding unsold shares
  totalYourRealizedProfit: number
  totalProfitShared: number
  totalGrossRealizedProfit: number
  totalUnrealizedProfit: number
  totalNetProfit: number
  totalApplied: number

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
  let activeInvested = 0
  let lifetimeInvested = 0
  let activeHoldingsCount = 0
  let totalYourRealizedProfit = 0
  let totalProfitShared = 0
  let totalGrossRealizedProfit = 0
  let totalUnrealizedProfit = 0
  let totalApplied = 0

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
      const shares =
        app.allottedShares ??
        (app.allottedLots !== undefined && ipo
          ? app.allottedLots * ipo.lotSize
          : app.sharesApplied ?? 0)
      const sharesSold = app.sharesSold ?? 0
      const unsoldShares = Math.max(0, shares - sharesSold)

      activeInvested += calculateInvestment(unsoldShares, issuePrice)
      lifetimeInvested += calculateInvestment(shares, issuePrice)
      if (unsoldShares > 0) {
        activeHoldingsCount++
      }

      if (ipo) {
        const profit = calculateApplicationProfit(app, ipo, account)
        if (profit.hasUnrealized) {
          totalUnrealizedProfit += profit.unrealizedYourProfit
        }
      }
    } else if (app.status === "not_allotted") {
      notAllottedApplications++
    } else if (app.status === "sold") {
      soldApplications++
      const shares =
        app.allottedShares ??
        (app.allottedLots !== undefined && ipo
          ? app.allottedLots * ipo.lotSize
          : app.sharesSold ?? 0)
      const sharesSold = app.sharesSold ?? shares
      const unsoldShares = Math.max(0, shares - sharesSold)

      activeInvested += calculateInvestment(unsoldShares, issuePrice)
      lifetimeInvested += calculateInvestment(shares, issuePrice)
      if (unsoldShares > 0) {
        activeHoldingsCount++
      }

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
    totalInvested: activeInvested,
    activeInvested,
    lifetimeInvested,
    activeHoldingsCount,
    totalYourRealizedProfit,
    totalProfitShared,
    totalGrossRealizedProfit,
    totalUnrealizedProfit,
    totalNetProfit: totalYourRealizedProfit + totalUnrealizedProfit,
    totalApplied,

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
