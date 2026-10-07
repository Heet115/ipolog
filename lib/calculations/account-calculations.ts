import type { Timestamp } from "firebase/firestore"
import type { Application, Ipo, ApplicationAccount } from "@/types"
import { calculateInvestment } from "./shared"
import { calculateApplicationProfit } from "./ipo-calculations"

export interface AccountReceivableItem {
  applicationId: string
  ipoId: string
  ipoName: string
  accountId: string
  accountName: string
  allottedShares: number
  allottedLots: number
  issuePrice: number
  salePrice: number
  saleProceeds: number
  investedAmount: number
  grossProfit: number
  ownerProfitShare: number
  yourProfitShare: number
  amountToSendUser: number
  settlementStatus: "pending" | "settled"
  settledAt?: Timestamp | null
  application?: Application
}

export interface PartnerAccountReceivables {
  account: ApplicationAccount
  pendingAmount: number
  pendingProfit: number
  settledAmount: number
  unsettledCount: number
  settledCount: number
  applications: AccountReceivableItem[]
}

export interface ReceivablesSummary {
  totalPendingReceivables: number
  totalPendingProfit: number
  totalSettledReceivables: number
  totalSettledProfit: number
  pendingCount: number
  settledCount: number
  pendingAccountsCount: number
  items: AccountReceivableItem[]
  byAccount: Map<string, PartnerAccountReceivables>
}

/**
 * Calculates pending and settled receivables across all sold applications for Other Accounts.
 */
export function calculateReceivablesSummary(
  applications: Application[],
  ipoMap: Map<string, Ipo>,
  accountMap: Map<string, ApplicationAccount>
): ReceivablesSummary {
  let totalPendingReceivables = 0
  let totalPendingProfit = 0
  let totalSettledReceivables = 0
  let totalSettledProfit = 0
  let pendingCount = 0
  let settledCount = 0

  const items: AccountReceivableItem[] = []
  const byAccount = new Map<
    string,
    {
      account: ApplicationAccount
      pendingAmount: number
      pendingProfit: number
      settledAmount: number
      unsettledCount: number
      settledCount: number
      applications: AccountReceivableItem[]
    }
  >()

  const pendingAccountsSet = new Set<string>()

  for (const app of applications) {
    if (app.status !== "sold") continue
    const account = accountMap.get(app.accountId)
    if (!account || account.type !== "other") continue

    const ipo = ipoMap.get(app.ipoId)
    const lotSize = ipo?.lotSize || 1
    const issuePrice = ipo?.issuePrice || 0
    const allottedShares =
      app.allottedShares !== undefined && app.allottedShares >= 0
        ? app.allottedShares
        : (app.allottedLots || 1) * lotSize
    const investedAmount = Math.round(allottedShares * issuePrice)

    const salePrice =
      app.salePrice !== undefined && app.salePrice !== null
        ? Number(app.salePrice)
        : ipo?.currentPrice || ipo?.listingPrice || issuePrice
    const saleProceeds = Math.round(allottedShares * salePrice)
    const grossProfit = saleProceeds - investedAmount

    const profitSharePercent = account.profitSharePercent || 0
    const ownerProfitShare =
      grossProfit > 0 ? Math.round((grossProfit * profitSharePercent) / 100) : 0
    const yourProfitShare =
      grossProfit > 0 ? grossProfit - ownerProfitShare : grossProfit
    const amountToSendUser = saleProceeds - ownerProfitShare

    const isSettled = app.settlementStatus === "settled"

    const item: AccountReceivableItem = {
      applicationId: app.id,
      ipoId: app.ipoId,
      ipoName: ipo?.name || "IPO",
      accountId: account.id,
      accountName: account.name,
      allottedShares,
      allottedLots: app.allottedLots || 1,
      issuePrice,
      salePrice,
      saleProceeds,
      investedAmount,
      grossProfit,
      ownerProfitShare,
      yourProfitShare,
      amountToSendUser,
      settlementStatus: isSettled ? "settled" : "pending",
      settledAt: app.settledAt,
      application: app,
    }
    items.push(item)

    if (isSettled) {
      settledCount++
      totalSettledReceivables += amountToSendUser
      totalSettledProfit += yourProfitShare
    } else {
      pendingCount++
      totalPendingReceivables += amountToSendUser
      totalPendingProfit += yourProfitShare
      pendingAccountsSet.add(account.id)
    }

    const accEntry = byAccount.get(account.id) || {
      account,
      pendingAmount: 0,
      pendingProfit: 0,
      settledAmount: 0,
      unsettledCount: 0,
      settledCount: 0,
      applications: [],
    }

    accEntry.applications.push(item)
    if (isSettled) {
      accEntry.settledCount++
      accEntry.settledAmount += amountToSendUser
    } else {
      accEntry.unsettledCount++
      accEntry.pendingAmount += amountToSendUser
      accEntry.pendingProfit += yourProfitShare
    }
    byAccount.set(account.id, accEntry)
  }

  return {
    totalPendingReceivables,
    totalPendingProfit,
    totalSettledReceivables,
    totalSettledProfit,
    pendingCount,
    settledCount,
    pendingAccountsCount: pendingAccountsSet.size,
    items,
    byAccount,
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
  pendingReceivables: number
  unsettledSoldApplicationsCount: number
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

  let pendingReceivables = 0
  let unsettledSoldApplicationsCount = 0

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
      const shares =
        app.allottedShares !== undefined && app.allottedShares >= 0
          ? app.allottedShares
          : (app.allottedLots || 1) * (ipo?.lotSize || 1)
      totalInvested += calculateInvestment(shares, issuePrice)

      if (ipo) {
        const profit = calculateApplicationProfit(app, ipo, account)
        totalRealizedGrossProfit += profit.realizedGrossProfit
        totalRealizedProfitShared += profit.realizedProfitShared
        totalRealizedYourProfit += profit.realizedYourProfit

        if (account?.type === "other") {
          const isSettled = app.settlementStatus === "settled"
          if (!isSettled) {
            unsettledSoldApplicationsCount++
            const salePrice =
              app.salePrice !== undefined && app.salePrice !== null
                ? Number(app.salePrice)
                : ipo.currentPrice || ipo.listingPrice || issuePrice
            const saleProceeds = Math.round(shares * salePrice)
            const ownerShare = profit.realizedProfitShared
            pendingReceivables += saleProceeds - ownerShare
          }
        }
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
    pendingReceivables,
    unsettledSoldApplicationsCount,
  }
}
