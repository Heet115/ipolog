/**
 * Central atomic financial calculations for IPO Tracker.
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
  if (
    !lots ||
    lots < 0 ||
    !lotSize ||
    lotSize < 0 ||
    !issuePrice ||
    issuePrice < 0
  ) {
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
  if (
    !grossProfit ||
    grossProfit <= 0 ||
    !profitSharePercent ||
    profitSharePercent <= 0
  ) {
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
