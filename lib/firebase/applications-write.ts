import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type { Application } from "@/types"

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
  if (data.settlementStatus !== undefined)
    payload.settlementStatus = data.settlementStatus
  if (data.settledAt !== undefined) payload.settledAt = data.settledAt
  if (data.notes !== undefined) payload.notes = data.notes.trim()

  await updateDoc(appRef, payload)
}

/**
 * Updates the settlement status of an individual application.
 */
export async function updateApplicationSettlement(
  userId: string,
  applicationId: string,
  settlementStatus: "pending" | "settled"
): Promise<void> {
  const appRef = doc(db, "users", userId, "applications", applicationId)
  await updateDoc(appRef, {
    settlementStatus,
    settledAt: settlementStatus === "settled" ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
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
