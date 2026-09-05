import { calculateApplicationProfit } from "@/lib/calculations/financials"
import {
  CATEGORY_CONFIG,
  inferCategoryFromAmount,
} from "@/lib/calculations/categories"
import { formatBankAccount, formatDate } from "@/lib/utils/ipo"
import type { Ipo, Application, ApplicationAccount, BankAccount } from "@/types"

/**
 * Escapes a cell value for standard CSV (RFC 4180).
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const stringValue = String(value)
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

/**
 * Triggers client-side download of a CSV file.
 * Includes UTF-8 BOM (\uFEFF) for seamless opening in Microsoft Excel.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generates and downloads a CSV export for all applications of a single IPO.
 */
export function exportIpoApplicationsCsv(
  ipo: Ipo,
  applications: Application[],
  accounts: ApplicationAccount[],
  bankAccounts: BankAccount[]
): void {
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

  const headers = [
    "Account Name",
    "Account Type",
    "Profit Share %",
    "Bank Account",
    "Quota Category",
    "Lots Applied",
    "Shares Applied",
    "Amount Applied (INR)",
    "Status",
    "Allotted Lots",
    "Allotted Shares",
    "Sale Price (INR)",
    "Shares Sold",
    "Realized Gross Profit (INR)",
    "Realized Shared Profit (INR)",
    "Realized Your Profit (INR)",
    "Unrealized Gross Profit (INR)",
    "Unrealized Your Profit (INR)",
    "Application Date",
    "Notes",
  ]

  const rows: string[][] = [headers]

  for (const app of applications) {
    const account = accountMap.get(app.accountId)
    const bank = bankMap.get(app.bankAccountId)
    const profit = calculateApplicationProfit(app, ipo, account)

    const cat = app.category || inferCategoryFromAmount(app.amountApplied)
    const catLabel = CATEGORY_CONFIG[cat]?.label || cat

    const row = [
      account?.name || "Unknown Account",
      account?.type === "my" ? "My Account" : "Other Account",
      account?.type === "my" ? "0%" : `${account?.profitSharePercent ?? 40}%`,
      bank ? formatBankAccount(bank) : "—",
      catLabel,
      String(app.lotsApplied || 0),
      String(app.sharesApplied || 0),
      String(app.amountApplied || 0),
      app.status.toUpperCase(),
      String(app.allottedLots || 0),
      String(app.allottedShares || 0),
      app.salePrice ? String(app.salePrice) : "",
      app.sharesSold ? String(app.sharesSold) : "",
      profit.hasRealized ? profit.realizedGrossProfit.toFixed(2) : "0.00",
      profit.hasRealized ? profit.realizedProfitShared.toFixed(2) : "0.00",
      profit.hasRealized ? profit.realizedYourProfit.toFixed(2) : "0.00",
      profit.hasUnrealized ? profit.unrealizedGrossProfit.toFixed(2) : "0.00",
      profit.hasUnrealized ? profit.unrealizedYourProfit.toFixed(2) : "0.00",
      formatDate(app.applicationDate),
      app.notes || "",
    ]

    rows.push(row)
  }

  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")

  const safeName = ipo.name.replace(/[^a-zA-Z0-9_-]/g, "_")
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadCsv(`IPO_${safeName}_Applications_${dateStr}.csv`, csvContent)
}

/**
 * Generates and downloads a complete master portfolio report CSV.
 */
export function exportPortfolioSummaryCsv(
  ipos: Ipo[],
  applications: Application[],
  accounts: ApplicationAccount[],
  bankAccounts: BankAccount[]
): void {
  const ipoMap = new Map(ipos.map((i) => [i.id, i]))
  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const bankMap = new Map(bankAccounts.map((b) => [b.id, b]))

  const headers = [
    "IPO Name",
    "IPO Type",
    "Issue Price (INR)",
    "Account Name",
    "Account Type",
    "Profit Share %",
    "Bank Account",
    "Quota Category",
    "Lots Applied",
    "Shares Applied",
    "Amount Applied (INR)",
    "Status",
    "Allotted Lots",
    "Allotted Shares",
    "Sale Price (INR)",
    "Shares Sold",
    "Realized Gross Profit (INR)",
    "Realized Shared Profit (INR)",
    "Realized Your Profit (INR)",
    "Unrealized Gross Profit (INR)",
    "Unrealized Your Profit (INR)",
    "Application Date",
    "Notes",
  ]

  const rows: string[][] = [headers]

  for (const app of applications) {
    const ipo = ipoMap.get(app.ipoId)
    const account = accountMap.get(app.accountId)
    const bank = bankMap.get(app.bankAccountId)

    const profit = ipo
      ? calculateApplicationProfit(app, ipo, account)
      : {
          hasRealized: false,
          hasUnrealized: false,
          realizedGrossProfit: 0,
          realizedProfitShared: 0,
          realizedYourProfit: 0,
          unrealizedGrossProfit: 0,
          unrealizedProfitShared: 0,
          unrealizedYourProfit: 0,
        }

    const cat = app.category || inferCategoryFromAmount(app.amountApplied)
    const catLabel = CATEGORY_CONFIG[cat]?.label || cat

    const row = [
      ipo?.name || "Unknown IPO",
      ipo?.type === "sme" ? "SME" : "Mainboard",
      ipo?.issuePrice ? String(ipo.issuePrice) : "",
      account?.name || "Unknown Account",
      account?.type === "my" ? "My Account" : "Other Account",
      account?.type === "my" ? "0%" : `${account?.profitSharePercent ?? 40}%`,
      bank ? formatBankAccount(bank) : "—",
      catLabel,
      String(app.lotsApplied || 0),
      String(app.sharesApplied || 0),
      String(app.amountApplied || 0),
      app.status.toUpperCase(),
      String(app.allottedLots || 0),
      String(app.allottedShares || 0),
      app.salePrice ? String(app.salePrice) : "",
      app.sharesSold ? String(app.sharesSold) : "",
      profit.hasRealized ? profit.realizedGrossProfit.toFixed(2) : "0.00",
      profit.hasRealized ? profit.realizedProfitShared.toFixed(2) : "0.00",
      profit.hasRealized ? profit.realizedYourProfit.toFixed(2) : "0.00",
      profit.hasUnrealized ? profit.unrealizedGrossProfit.toFixed(2) : "0.00",
      profit.hasUnrealized ? profit.unrealizedYourProfit.toFixed(2) : "0.00",
      formatDate(app.applicationDate),
      app.notes || "",
    ]

    rows.push(row)
  }

  const csvContent = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")

  const dateStr = new Date().toISOString().slice(0, 10)
  downloadCsv(`IPO_Master_Portfolio_Report_${dateStr}.csv`, csvContent)
}
