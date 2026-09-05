import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

export interface SettlementParams {
  application: Application
  ipo: Ipo
  account?: ApplicationAccount
  bankAccount?: BankAccount
  customSalePrice?: number
  customUpiId?: string
  senderName?: string
}

export interface SettlementCalculation {
  accountName: string
  accountType: string
  profitSharingPercentage: number
  ipoName: string
  allottedShares: number
  allottedLots: number
  issuePrice: number
  investedAmount: number
  salePrice: number
  saleProceeds: number
  grossProfit: number
  ownerProfitShare: number
  yourProfitShare: number
  amountToSendUser: number
  bankName: string
  upiId: string
  upiPayUrl?: string
  senderName?: string
  isLoss: boolean
}

/**
 * Calculates financial distribution between funder (user) and account owner.
 * Formula:
 * - Funder pays initial investment from their bank: investedAmount = shares * issuePrice
 * - Account owner receives sale proceeds in their bank: saleProceeds = shares * salePrice
 * - Gross profit = saleProceeds - investedAmount
 * - Account owner keeps: ownerProfitShare = (grossProfit * profitShare%) / 100 (if profit > 0)
 * - Account owner transfers to funder: amountToSendUser = saleProceeds - ownerProfitShare
 *   (which equals investedAmount + funderProfitShare)
 */
export function calculateSettlement(
  params: SettlementParams
): SettlementCalculation {
  const {
    application,
    ipo,
    account,
    bankAccount,
    customSalePrice,
    customUpiId,
  } = params

  const allottedShares =
    application.allottedShares || (application.allottedLots || 1) * ipo.lotSize
  const allottedLots = application.allottedLots || 1
  const issuePrice = ipo.issuePrice || 0
  const investedAmount = Math.round(allottedShares * issuePrice)

  const effectiveSalePrice =
    customSalePrice !== undefined && !isNaN(customSalePrice)
      ? Number(customSalePrice)
      : application.salePrice !== undefined && application.salePrice !== null
        ? Number(application.salePrice)
        : ipo.currentPrice || ipo.listingPrice || issuePrice

  const saleProceeds = Math.round(allottedShares * effectiveSalePrice)
  const grossProfit = saleProceeds - investedAmount
  const isLoss = grossProfit < 0

  const profitSharingPercentage =
    account?.profitSharePercent !== undefined
      ? Number(account.profitSharePercent)
      : 0

  let ownerProfitShare = 0
  let yourProfitShare = 0
  let amountToSendUser = saleProceeds

  if (grossProfit > 0) {
    ownerProfitShare = Math.round((grossProfit * profitSharingPercentage) / 100)
    yourProfitShare = grossProfit - ownerProfitShare
    amountToSendUser = saleProceeds - ownerProfitShare
  } else {
    ownerProfitShare = 0
    yourProfitShare = grossProfit
    amountToSendUser = saleProceeds
  }

  const bankName = bankAccount
    ? bankAccount.nickname || bankAccount.bankName
    : "Primary Bank"

  const upiId = (customUpiId || bankAccount?.upiId || "").trim()

  let upiPayUrl: string | undefined
  if (upiId) {
    const note = encodeURIComponent(`${ipo.name} IPO Settlement`)
    upiPayUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent("IPO Settlement")}&am=${amountToSendUser}&cu=INR&tn=${note}`
  }

  return {
    accountName: account?.name || "Account Owner",
    accountType: account?.type || "other",
    profitSharingPercentage,
    ipoName: ipo.name,
    allottedShares,
    allottedLots,
    issuePrice,
    investedAmount,
    salePrice: effectiveSalePrice,
    saleProceeds,
    grossProfit,
    ownerProfitShare,
    yourProfitShare,
    amountToSendUser,
    bankName,
    upiId,
    upiPayUrl,
    senderName: params.senderName?.trim() || "",
    isLoss,
  }
}

/**
 * Formats a clean, readable WhatsApp message with emojis and exact transfer instructions.
 */
export function formatWhatsAppSettlementMessage(
  calc: SettlementCalculation,
  customNote?: string
): string {
  const formatInr = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN")}`
  const funderName =
    calc.senderName && calc.senderName.trim() ? calc.senderName.trim() : "Me"

  const lines: string[] = []

  lines.push(`Hi ${calc.accountName},`)
  lines.push(
    `Here is the settlement breakdown for *${calc.ipoName}* allotment:`
  )
  lines.push("")

  lines.push(`*Allotment & Sale Details*`)
  lines.push(
    `• Allotted: ${calc.allottedShares} shares (${calc.allottedLots} lot${calc.allottedLots > 1 ? "s" : ""})`
  )
  lines.push(`• Issue Price: ₹${calc.issuePrice}`)
  lines.push(
    `• Capital Applied: ${formatInr(calc.investedAmount)} (Paid by ${funderName})`
  )
  lines.push(`• Sale / Exit Price: ₹${calc.salePrice}`)
  lines.push(
    `• Total Sale Proceeds: ${formatInr(calc.saleProceeds)} (Credited into your bank)`
  )
  lines.push("")

  lines.push(`*Profit Sharing Breakdown*`)
  lines.push(
    `• Gross Profit: ${calc.grossProfit >= 0 ? "+" : "-"}${formatInr(calc.grossProfit)}`
  )

  if (calc.grossProfit > 0 && calc.profitSharingPercentage > 0) {
    lines.push(
      `• Your Profit Share (${calc.profitSharingPercentage}%): *${formatInr(calc.ownerProfitShare)}* (Keep this in your account)`
    )
    lines.push(
      `• ${funderName}'s Profit Share: ${formatInr(calc.yourProfitShare)}`
    )
  } else if (calc.grossProfit > 0) {
    lines.push(`• Net Profit: ${formatInr(calc.grossProfit)}`)
  }

  lines.push("")
  lines.push(`*Amount to Transfer to ${funderName}:*`)
  lines.push(`*${formatInr(calc.amountToSendUser)}*`)

  if (calc.grossProfit > 0 && calc.ownerProfitShare > 0) {
    lines.push(
      `_(Initial Capital ${formatInr(calc.investedAmount)} + ${funderName}'s Profit ${formatInr(calc.yourProfitShare)})_`
    )
  }

  if (calc.upiId) {
    lines.push("")
    lines.push(`*Please transfer via UPI to:*`)
    lines.push(`UPI ID: *${calc.upiId}*`)
  }

  if (customNote && customNote.trim()) {
    lines.push("")
    lines.push(`Note: ${customNote.trim()}`)
  }

  lines.push("")
  lines.push(`Please share the payment screenshot once transferred. Thanks!`)
  lines.push("")
  lines.push(
    `Settlement Statement generated via IPOLog(https://ipolog.vercel.app)`
  )

  return lines.join("\n")
}

/**
 * Builds the WhatsApp Web / App share URL.
 */
export function getWhatsAppShareUrl(message: string, phone?: string): string {
  const encodedText = encodeURIComponent(message)
  if (!phone || !phone.trim()) {
    return `https://wa.me/?text=${encodedText}`
  }

  // Sanitize phone digits
  let cleanPhone = phone.replace(/\D/g, "")
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`
  }

  return `https://wa.me/${cleanPhone}?text=${encodedText}`
}
