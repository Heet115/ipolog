import {
  collection,
  doc,
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type { Application, ApplicationStatus, ApplicationCategory } from "@/types"
import { inferCategoryFromAmount } from "@/lib/calculations/categories"

function docToApplication(
  docSnap: QueryDocumentSnapshot<DocumentData>
): Application {
  const data = docSnap.data()
  const amountApplied = data.amountApplied != null ? Number(data.amountApplied) : 0
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

/**
 * Fetches all applications for a user.
 */
export async function getApplications(userId: string): Promise<Application[]> {
  const appsRef = collection(db, "users", userId, "applications")
  const q = query(appsRef, orderBy("createdAt", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map(docToApplication)
}

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

  const batch = writeBatch(db)
  const appsRef = collection(db, "users", userId, "applications")
  const createdIds: string[] = []

  for (const app of applications) {
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
 * Updates a single application document.
 */
export async function updateApplication(
  userId: string,
  applicationId: string,
  data: Partial<Application>
): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", applicationId)

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.category !== undefined) payload.category = data.category
  if (data.bankAccountId !== undefined)
    payload.bankAccountId = data.bankAccountId
  if (data.lotsApplied !== undefined)
    payload.lotsApplied = Number(data.lotsApplied)
  if (data.sharesApplied !== undefined)
    payload.sharesApplied = Number(data.sharesApplied)
  if (data.amountApplied !== undefined)
    payload.amountApplied = Number(data.amountApplied)
  if (data.status !== undefined) payload.status = data.status
  if (data.allottedLots !== undefined)
    payload.allottedLots = Number(data.allottedLots)
  if (data.allottedShares !== undefined)
    payload.allottedShares = Number(data.allottedShares)
  if (data.listingPrice !== undefined)
    payload.listingPrice = Number(data.listingPrice)
  if (data.currentPrice !== undefined)
    payload.currentPrice = Number(data.currentPrice)
  if (data.sharesSold !== undefined)
    payload.sharesSold = Number(data.sharesSold)
  if (data.salePrice !== undefined) payload.salePrice = Number(data.salePrice)
  if (data.saleDate !== undefined) payload.saleDate = data.saleDate
  if (data.notes !== undefined) payload.notes = data.notes.trim()

  await updateDoc(appRef, payload)
}

/**
 * Permanently deletes an application document.
 */
export async function deleteApplication(
  userId: string,
  applicationId: string
): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", applicationId)
  await deleteDoc(appRef)
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

    if (item.status === "allotted") {
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

export interface RecordSaleData {
  sharesSold: number
  salePrice: number
  saleDate?: Timestamp
  notes?: string
}

/**
 * Records sale for an individual application and updates its status to 'sold'.
 */
export async function recordSaleSingle(
  userId: string,
  applicationId: string,
  data: RecordSaleData
): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", applicationId)
  await updateDoc(appRef, {
    status: "sold",
    sharesSold: Number(data.sharesSold),
    salePrice: Number(data.salePrice),
    saleDate: data.saleDate || serverTimestamp(),
    notes: data.notes?.trim() || "",
    updatedAt: serverTimestamp(),
  })
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
