import type { ApplicationCategory } from "@/types"

export const RETAIL_MAX_AMOUNT = 200000 // ₹2 Lakhs
export const SHNI_MAX_AMOUNT = 500000 // ₹5 Lakhs

export interface CategoryMetadata {
  id: ApplicationCategory
  label: string
  shortLabel: string
  description: string
  amountLimitText: string
  badgeVariant:
    "default" | "secondary" | "outline" | "info" | "warning" | "success"
}

export const CATEGORY_CONFIG: Record<ApplicationCategory, CategoryMetadata> = {
  retail: {
    id: "retail",
    label: "Retail (RII)",
    shortLabel: "Retail",
    description: "Retail Individual Investor — bids up to ₹2,00,000",
    amountLimitText: "Up to ₹2L",
    badgeVariant: "secondary",
  },
  shni: {
    id: "shni",
    label: "sHNI (Small HNI)",
    shortLabel: "sHNI",
    description:
      "Small High Net-worth Individual — bids from ₹2,00,000 to ₹5,00,000",
    amountLimitText: "₹2L – ₹5L",
    badgeVariant: "default",
  },
  bhni: {
    id: "bhni",
    label: "bHNI (Big HNI)",
    shortLabel: "bHNI",
    description: "Big High Net-worth Individual — bids above ₹5,00,000",
    amountLimitText: "> ₹5L",
    badgeVariant: "info",
  },
  shareholder: {
    id: "shareholder",
    label: "Shareholder Quota",
    shortLabel: "Shareholder",
    description: "Parent company eligible shareholder category",
    amountLimitText: "Eligible SH",
    badgeVariant: "outline",
  },
  employee: {
    id: "employee",
    label: "Employee Quota",
    shortLabel: "Employee",
    description: "Company employee quota (may include discount)",
    amountLimitText: "EMP",
    badgeVariant: "outline",
  },
}

export const ALL_CATEGORIES: ApplicationCategory[] = [
  "retail",
  "shni",
  "bhni",
  "shareholder",
  "employee",
]

/**
 * Calculates the recommended/minimum lots required for a specific quota category.
 * - Retail: 1 lot (or custom up to ₹2L)
 * - sHNI: smallest number of lots exceeding ₹2,00,000 (Math.floor(200000 / lotCost) + 1)
 * - bHNI: smallest number of lots exceeding ₹5,00,000 (Math.floor(500000 / lotCost) + 1)
 * - Shareholder / Employee: 1 lot
 */
export function getCategoryMinLots(
  category: ApplicationCategory,
  lotSize: number,
  issuePrice: number
): number {
  const lotCost = lotSize * issuePrice
  if (lotCost <= 0) return 1

  switch (category) {
    case "shni": {
      const minLots = Math.floor(RETAIL_MAX_AMOUNT / lotCost) + 1
      return Math.max(1, minLots)
    }
    case "bhni": {
      const minLots = Math.floor(SHNI_MAX_AMOUNT / lotCost) + 1
      return Math.max(1, minLots)
    }
    case "retail":
    case "shareholder":
    case "employee":
    default:
      return 1
  }
}

/**
 * Calculates the maximum allowed lots for a category based on monetary thresholds.
 */
export function getCategoryMaxLots(
  category: ApplicationCategory,
  lotSize: number,
  issuePrice: number
): number | undefined {
  const lotCost = lotSize * issuePrice
  if (lotCost <= 0) return undefined

  switch (category) {
    case "retail": {
      const maxLots = Math.floor(RETAIL_MAX_AMOUNT / lotCost)
      return Math.max(1, maxLots)
    }
    case "shni": {
      const maxLots = Math.floor(SHNI_MAX_AMOUNT / lotCost)
      return Math.max(1, maxLots)
    }
    case "bhni":
    case "shareholder":
    case "employee":
    default:
      return undefined // No rigid cap defined here
  }
}

/**
 * Infers the application category from the total application amount.
 */
export function inferCategoryFromAmount(amount: number): ApplicationCategory {
  if (amount > SHNI_MAX_AMOUNT) {
    return "bhni"
  }
  if (amount > RETAIL_MAX_AMOUNT) {
    return "shni"
  }
  return "retail"
}

export interface CategoryValidation {
  isValid: boolean
  warning?: string
}

/**
 * Validates whether the given lot count conforms to the chosen category limits.
 */
export function validateCategoryLots(
  category: ApplicationCategory,
  lots: number,
  lotSize: number,
  issuePrice: number
): CategoryValidation {
  const amount = lots * lotSize * issuePrice
  if (amount <= 0) return { isValid: true }

  switch (category) {
    case "retail":
      if (amount > RETAIL_MAX_AMOUNT) {
        return {
          isValid: false,
          warning: `Retail amount (₹${amount.toLocaleString("en-IN")}) exceeds ₹2,00,000 limit. Consider switching to sHNI.`,
        }
      }
      break
    case "shni":
      if (amount <= RETAIL_MAX_AMOUNT) {
        return {
          isValid: false,
          warning: `sHNI requires amount > ₹2,00,000 (Current: ₹${amount.toLocaleString("en-IN")}). Increase lots or switch to Retail.`,
        }
      }
      if (amount > SHNI_MAX_AMOUNT) {
        return {
          isValid: false,
          warning: `sHNI amount (₹${amount.toLocaleString("en-IN")}) exceeds ₹5,00,000 limit. Consider switching to bHNI.`,
        }
      }
      break
    case "bhni":
      if (amount <= SHNI_MAX_AMOUNT) {
        return {
          isValid: false,
          warning: `bHNI requires amount > ₹5,00,000 (Current: ₹${amount.toLocaleString("en-IN")}). Increase lots or switch to sHNI.`,
        }
      }
      break
    case "shareholder":
    case "employee":
      break
  }

  return { isValid: true }
}
