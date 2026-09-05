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
export function formatDate(date: Timestamp | Date | null | undefined): string {
  if (!date) return "—"

  let jsDate: Date
  if (date instanceof Timestamp) {
    jsDate = date.toDate()
  } else if (date instanceof Date) {
    jsDate = date
  } else if (
    typeof date === "object" &&
    "seconds" in (date as { seconds: number })
  ) {
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
  } else if (
    typeof date === "object" &&
    "seconds" in (date as { seconds: number })
  ) {
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
 * Converts a YYYY-MM-DD input value or ISO date string to a Firestore Timestamp.
 */
export function inputValueToTimestamp(val: string): Timestamp | undefined {
  if (!val) return undefined
  const cleanVal = val.trim().slice(0, 10)
  const parts = cleanVal.split("-")
  if (parts.length !== 3) return undefined
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined
  const date = new Date(year, month - 1, day, 12, 0, 0)
  return Timestamp.fromDate(date)
}

/**
 * Formats an ISO YYYY-MM-DD date string into a friendly format (e.g. 28 Aug or 28 Aug 2026).
 */
export function formatIsoDate(
  isoDate?: string | null,
  includeYear = false
): string {
  if (!isoDate) return "—"
  try {
    const cleanVal = isoDate.trim().slice(0, 10)
    const parts = cleanVal.split("-")
    if (parts.length < 3) return isoDate
    const year = Number(parts[0])
    const month = Number(parts[1])
    const day = Number(parts[2])
    if (isNaN(year) || isNaN(month) || isNaN(day)) return isoDate
    const date = new Date(year, month - 1, day, 12, 0, 0)
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      ...(includeYear ? { year: "numeric" } : {}),
    }).format(date)
  } catch {
    return isoDate
  }
}

/**
 * Checks if an imported IPO's synced data is older than maxAgeHours (defaults to 24h).
 */
export function isIpoSyncStale(ipo: Ipo, maxAgeHours = 24): boolean {
  if (!ipo.externalId) return false
  if (!ipo.lastSyncedAt) return true

  let lastSyncMillis: number
  if (ipo.lastSyncedAt instanceof Timestamp) {
    lastSyncMillis = ipo.lastSyncedAt.toMillis()
  } else if (
    typeof ipo.lastSyncedAt === "object" &&
    ipo.lastSyncedAt !== null &&
    "toMillis" in ipo.lastSyncedAt &&
    typeof (ipo.lastSyncedAt as { toMillis: unknown }).toMillis === "function"
  ) {
    lastSyncMillis = (ipo.lastSyncedAt as { toMillis: () => number }).toMillis()
  } else if (
    typeof ipo.lastSyncedAt === "object" &&
    ipo.lastSyncedAt !== null &&
    "seconds" in ipo.lastSyncedAt
  ) {
    lastSyncMillis = (ipo.lastSyncedAt as { seconds: number }).seconds * 1000
  } else {
    lastSyncMillis = new Date(ipo.lastSyncedAt as unknown as string).getTime()
  }

  if (isNaN(lastSyncMillis)) return true
  const ageMillis = Date.now() - lastSyncMillis
  return ageMillis >= maxAgeHours * 60 * 60 * 1000
}

/**
 * Formats relative freshness of last sync (e.g. "Just now", "3h ago", "2d ago").
 */
export function formatSyncFreshness(
  timestamp?: Timestamp | Date | null
): string {
  if (!timestamp) return "Never synced"
  let date: Date
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate()
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else if (
    typeof timestamp === "object" &&
    "seconds" in (timestamp as { seconds: number })
  ) {
    date = new Date((timestamp as { seconds: number }).seconds * 1000)
  } else {
    date = new Date(timestamp as unknown as string)
  }

  if (isNaN(date.getTime())) return "Unknown"
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 0) return "Just now"
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}


