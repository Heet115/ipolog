import { Timestamp } from "firebase/firestore"
import type { Ipo, IpoStatus } from "@/types"
export { formatBankAccount } from "@/types"

/**
 * Derives IPO lifecycle status based on dates.
 */
export function getIpoStatus(ipo: Ipo): {
  status: IpoStatus
  label: string
  variant: "default" | "secondary" | "outline" | "destructive"
} {
  const now = Date.now()

  const openTime = ipo.openDate?.toMillis?.() ?? null
  const closeTime = ipo.closeDate?.toMillis?.() ?? null
  const allotmentTime = ipo.allotmentDate?.toMillis?.() ?? null
  const listingTime = ipo.listingDate?.toMillis?.() ?? null

  if (listingTime && now >= listingTime) {
    return { status: "listed", label: "Listed", variant: "default" }
  }

  if (allotmentTime && now >= allotmentTime) {
    return {
      status: "allotment_pending",
      label: "Allotment Out",
      variant: "secondary",
    }
  }

  if (closeTime && now > closeTime) {
    return {
      status: "closed",
      label: "Closed",
      variant: "outline",
    }
  }

  if (openTime && now >= openTime) {
    return { status: "open", label: "Open", variant: "default" }
  }

  if (openTime && now < openTime) {
    return { status: "upcoming", label: "Upcoming", variant: "secondary" }
  }

  return { status: "open", label: "Active", variant: "default" }
}

/**
 * Formats numbers into Indian Currency format (₹).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₹0"
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats a Firestore Timestamp or Date object into a readable date string (e.g. 15 Sep 2026).
 */
export function formatDate(
  date: Timestamp | Date | null | undefined
): string {
  if (!date) return "—"

  let jsDate: Date
  if (date instanceof Timestamp) {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "object" && "seconds" in (date as { seconds: number })) {
    jsDate = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    return "—"
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(jsDate)
}

/**
 * Converts a Timestamp or Date into YYYY-MM-DD string for HTML date input.
 */
export function dateToInputValue(
  date: Timestamp | Date | null | undefined
): string {
  if (!date) return ""

  let jsDate: Date
  if (date instanceof Timestamp) {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (typeof date === "object" && "seconds" in (date as { seconds: number })) {
    jsDate = new Date((date as { seconds: number }).seconds * 1000)
  } else {
    return ""
  }

  const y = jsDate.getFullYear()
  const m = String(jsDate.getMonth() + 1).padStart(2, "0")
  const d = String(jsDate.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Converts a YYYY-MM-DD input value to a Firestore Timestamp.
 */
export function inputValueToTimestamp(val: string): Timestamp | undefined {
  if (!val) return undefined
  const parts = val.split("-")
  if (parts.length !== 3) return undefined
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0)
  return Timestamp.fromDate(date)
}
