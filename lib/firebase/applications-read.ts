import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  getCountFromServer,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type {
  Application,
  ApplicationStatus,
  ApplicationCategory,
} from "@/types"
import { inferCategoryFromAmount } from "@/lib/calculations/categories"

export function docToApplication(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Application {
  const data = docSnap.data()
  const amountApplied =
    data.amountApplied != null ? Number(data.amountApplied) : 0
  return {
    id: docSnap.id,
    userId: data.userId,
    ipoId: data.ipoId,
    accountId: data.accountId,
    bankAccountId: data.bankAccountId,
    applicationDate: data.applicationDate,
    category:
      (data.category as ApplicationCategory) ||
      (amountApplied > 0 ? inferCategoryFromAmount(amountApplied) : "retail"),
    lotsApplied: data.lotsApplied != null ? Number(data.lotsApplied) : 1,
    sharesApplied: data.sharesApplied != null ? Number(data.sharesApplied) : 0,
    amountApplied,
    status: (data.status as ApplicationStatus) || "pending",
    allottedLots:
      data.allottedLots !== undefined ? Number(data.allottedLots) : undefined,
    allottedShares:
      data.allottedShares !== undefined
        ? Number(data.allottedShares)
        : undefined,
    listingPrice:
      data.listingPrice !== undefined ? Number(data.listingPrice) : undefined,
    currentPrice:
      data.currentPrice !== undefined ? Number(data.currentPrice) : undefined,
    sharesSold:
      data.sharesSold !== undefined ? Number(data.sharesSold) : undefined,
    salePrice:
      data.salePrice !== undefined ? Number(data.salePrice) : undefined,
    saleDate: data.saleDate || undefined,
    settlementStatus: data.settlementStatus || undefined,
    settledAt: data.settledAt || undefined,
    notes: data.notes || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Fetches all applications for a specific IPO.
 */
export async function getApplicationsByIpo(
  userId: string,
  ipoId: string
): Promise<Application[]> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(
    appsRef,
    where("ipoId", "==", ipoId),
    orderBy("createdAt", "asc")
  )
  const snap = await getDocs(q)
  return snap.docs.map(docToApplication)
}

export interface GetApplicationsOptions {
  ipoId?: string
  accountId?: string
  bankAccountId?: string
  status?: ApplicationStatus
  settlementStatus?: "pending" | "settled"
  limitCount?: number
}

/**
 * Fetches applications for a user with optional query filters and limits.
 * Falls back safely to client-side filtering if composite indexes are building.
 */
export async function getApplications(
  userId: string,
  options?: GetApplicationsOptions
): Promise<Application[]> {
  const appsRef = collection(db, "users", userId, "applications")
  const constraints: QueryConstraint[] = []

  if (options?.ipoId) {
    constraints.push(where("ipoId", "==", options.ipoId))
  }
  if (options?.accountId) {
    constraints.push(where("accountId", "==", options.accountId))
  }
  if (options?.bankAccountId) {
    constraints.push(where("bankAccountId", "==", options.bankAccountId))
  }
  if (options?.status) {
    constraints.push(where("status", "==", options.status))
  }
  if (options?.settlementStatus) {
    constraints.push(where("settlementStatus", "==", options.settlementStatus))
  }

  constraints.push(orderBy("createdAt", "desc"))

  if (options?.limitCount && options.limitCount > 0) {
    constraints.push(limit(options.limitCount))
  }

  try {
    const q = query(appsRef, ...constraints)
    const snap = await getDocs(q)
    return snap.docs.map(docToApplication)
  } catch (err) {
    console.warn("Fallback to base query for getApplications:", err)
    const fallbackQ = query(appsRef, orderBy("createdAt", "desc"))
    const snap = await getDocs(fallbackQ)
    let apps = snap.docs.map(docToApplication)

    if (options?.ipoId) apps = apps.filter((a) => a.ipoId === options.ipoId)
    if (options?.accountId)
      apps = apps.filter((a) => a.accountId === options.accountId)
    if (options?.bankAccountId)
      apps = apps.filter((a) => a.bankAccountId === options.bankAccountId)
    if (options?.status) apps = apps.filter((a) => a.status === options.status)
    if (options?.settlementStatus)
      apps = apps.filter((a) => a.settlementStatus === options.settlementStatus)
    if (options?.limitCount && options.limitCount > 0)
      apps = apps.slice(0, options.limitCount)

    return apps
  }
}

/**
 * Fast aggregation: counts total applications for an account with zero document payload overhead.
 */
export async function getAccountApplicationsCount(
  userId: string,
  accountId: string
): Promise<number> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(appsRef, where("accountId", "==", accountId))
  const snap = await getCountFromServer(q)
  return snap.data().count
}

/**
 * Fast aggregation: counts total applications for a bank account with zero document payload overhead.
 */
export async function getBankApplicationsCount(
  userId: string,
  bankAccountId: string
): Promise<number> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(appsRef, where("bankAccountId", "==", bankAccountId))
  const snap = await getCountFromServer(q)
  return snap.data().count
}

/**
 * Fast aggregation: counts total applications for an IPO with zero document payload overhead.
 */
export async function getIpoApplicationsCount(
  userId: string,
  ipoId: string
): Promise<number> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(appsRef, where("ipoId", "==", ipoId))
  const snap = await getCountFromServer(q)
  return snap.data().count
}
