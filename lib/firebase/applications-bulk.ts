import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type { ApplicationStatus, ApplicationCategory } from "@/types"
import { inferCategoryFromAmount } from "@/lib/calculations/categories"

/**
 * Creates multiple applications in a single batch write for efficiency.
 */
export async function createApplicationsBatch(
  userId: string,
  applications: Array<{
    ipoId: string
    accountId: string
    bankAccountId: string
    category?: ApplicationCategory
    lotsApplied: number
    sharesApplied: number
    amountApplied: number
    applicationDate?: Timestamp
    notes?: string
  }>
): Promise<string[]> {
  if (applications.length === 0) return []

  // Ensure no duplicate account applications are inserted within the same batch
  const seenAccountIds = new Set<string>()
  const uniqueApplications = applications.filter((app) => {
    if (seenAccountIds.has(app.accountId)) return false
    seenAccountIds.add(app.accountId)
    return true
  })

  const batch = writeBatch(db)
  const appsRef = collection(db, "users", userId, "applications")
  const createdIds: string[] = []

  for (const app of uniqueApplications) {
    const newDocRef = doc(appsRef)
    createdIds.push(newDocRef.id)

    batch.set(newDocRef, {
      userId,
      ipoId: app.ipoId,
      accountId: app.accountId,
      bankAccountId: app.bankAccountId,
      category:
        app.category ||
        (app.amountApplied > 0
          ? inferCategoryFromAmount(app.amountApplied)
          : "retail"),
      lotsApplied: app.lotsApplied,
      sharesApplied: app.sharesApplied,
      amountApplied: app.amountApplied,
      status: "pending",
      applicationDate: app.applicationDate || serverTimestamp(),
      notes: app.notes?.trim() || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
  return createdIds
}

/**
 * Batch updates settlement status for multiple applications.
 */
export async function updateSettlementsBatch(
  userId: string,
  applicationIds: string[],
  settlementStatus: "pending" | "settled"
): Promise<void> {
  if (applicationIds.length === 0) return

  for (let i = 0; i < applicationIds.length; i += 450) {
    const batch = writeBatch(db)
    const chunk = applicationIds.slice(i, i + 450)
    for (const appId of chunk) {
      const appRef = doc(db, "users", userId, "applications", appId)
      batch.update(appRef, {
        settlementStatus,
        settledAt: settlementStatus === "settled" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
  }
}

/**
 * Permanently deletes all applications associated with an IPO.
 */
export async function deleteApplicationsByIpo(
  userId: string,
  ipoId: string
): Promise<number> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(appsRef, where("ipoId", "==", ipoId))
  const snap = await getDocs(q)
  if (snap.empty) return 0

  const docs = snap.docs
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db)
    const chunk = docs.slice(i, i + 450)
    chunk.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  return docs.length
}

/**
 * Cleans up any orphaned applications whose parent IPO has been deleted.
 */
export async function cleanupOrphanedApplications(
  userId: string,
  existingIpoIds: string[]
): Promise<number> {
  const appsRef = collection(db, "users", userId, "applications")
  const snap = await getDocs(appsRef)
  if (snap.empty) return 0

  const validSet = new Set(existingIpoIds)
  const orphanedDocs = snap.docs.filter((d) => {
    const ipoId = d.data().ipoId
    return !ipoId || !validSet.has(ipoId)
  })

  if (orphanedDocs.length === 0) return 0

  for (let i = 0; i < orphanedDocs.length; i += 450) {
    const batch = writeBatch(db)
    const chunk = orphanedDocs.slice(i, i + 450)
    chunk.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  return orphanedDocs.length
}

export interface AllotmentUpdateItem {
  applicationId: string
  status: ApplicationStatus
  allottedLots?: number
  allottedShares?: number
}

/**
 * Updates allotment results (status, allotted lots, allotted shares) for multiple applications in a single batch.
 */
export async function updateAllotmentsBatch(
  userId: string,
  updates: AllotmentUpdateItem[]
): Promise<void> {
  if (updates.length === 0) return

  const batch = writeBatch(db)

  for (const item of updates) {
    const appRef = doc(db, "users", userId, "applications", item.applicationId)
    const payload: Record<string, unknown> = {
      status: item.status,
      updatedAt: serverTimestamp(),
    }

    if (item.status === "allotted" || item.status === "sold") {
      payload.allottedLots =
        item.allottedLots !== undefined ? Number(item.allottedLots) : 1
      payload.allottedShares =
        item.allottedShares !== undefined ? Number(item.allottedShares) : 0
    } else {
      payload.allottedLots = 0
      payload.allottedShares = 0
    }

    batch.update(appRef, payload)
  }

  await batch.commit()
}

export interface BulkSaleItem {
  applicationId: string
  sharesSold: number
  salePrice: number
  saleDate?: Timestamp
  notes?: string
}

/**
 * Records sales for multiple applications in a single atomic batch write.
 */
export async function recordSaleBulk(
  userId: string,
  sales: BulkSaleItem[]
): Promise<void> {
  if (sales.length === 0) return

  const batch = writeBatch(db)

  for (const item of sales) {
    const appRef = doc(db, "users", userId, "applications", item.applicationId)
    batch.update(appRef, {
      status: "sold",
      sharesSold: Number(item.sharesSold),
      salePrice: Number(item.salePrice),
      saleDate: item.saleDate || serverTimestamp(),
      ...(item.notes ? { notes: item.notes.trim() } : {}),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
}

/**
 * Batch deletes multiple applications in a single atomic batch write.
 */
export async function deleteApplicationsBatch(
  userId: string,
  applicationIds: string[]
): Promise<void> {
  if (applicationIds.length === 0) return

  const CHUNK_SIZE = 450
  for (let i = 0; i < applicationIds.length; i += CHUNK_SIZE) {
    const chunk = applicationIds.slice(i, i + CHUNK_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => {
      const ref = doc(db, "users", userId, "applications", id)
      batch.delete(ref)
    })
    await batch.commit()
  }
}

/**
 * Batch updates funding bank account for multiple applications.
 */
export async function updateApplicationsBankBatch(
  userId: string,
  applicationIds: string[],
  bankAccountId: string
): Promise<void> {
  if (applicationIds.length === 0) return

  const CHUNK_SIZE = 450
  const now = serverTimestamp()
  for (let i = 0; i < applicationIds.length; i += CHUNK_SIZE) {
    const chunk = applicationIds.slice(i, i + CHUNK_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((id) => {
      const ref = doc(db, "users", userId, "applications", id)
      batch.update(ref, { bankAccountId, updatedAt: now })
    })
    await batch.commit()
  }
}

export interface StatusUpdateBatchItem {
  applicationId: string
  status: ApplicationStatus
  allottedLots?: number
  allottedShares?: number
}

/**
 * Batch updates application status for multiple applications.
 */
export async function updateApplicationsStatusBatch(
  userId: string,
  updates: StatusUpdateBatchItem[]
): Promise<void> {
  if (updates.length === 0) return

  const CHUNK_SIZE = 450
  const now = serverTimestamp()
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE)
    const batch = writeBatch(db)
    chunk.forEach((item) => {
      const ref = doc(db, "users", userId, "applications", item.applicationId)
      const payload: Record<string, unknown> = {
        status: item.status,
        updatedAt: now,
      }
      if (item.status === "allotted") {
        if (item.allottedLots !== undefined)
          payload.allottedLots = item.allottedLots
        if (item.allottedShares !== undefined)
          payload.allottedShares = item.allottedShares
      } else if (item.status === "not_allotted" || item.status === "pending") {
        payload.allottedLots = 0
        payload.allottedShares = 0
        payload.sharesSold = 0
        payload.salePrice = 0
        payload.saleDate = null
        payload.settlementStatus = null
        payload.settledAt = null
      }
      batch.update(ref, payload)
    })
    await batch.commit()
  }
}
