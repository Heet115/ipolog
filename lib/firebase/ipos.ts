import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type { Ipo, IpoType } from "@/types"

function docToIpo(docSnap: DocumentSnapshot<DocumentData>): Ipo {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    userId: data.userId,
    name: data.name,
    companyName: data.companyName || "",
    type: (data.type as IpoType) || "mainboard",
    issuePrice: Number(data.issuePrice) || 0,
    priceBandMin: data.priceBandMin ? Number(data.priceBandMin) : undefined,
    priceBandMax: data.priceBandMax ? Number(data.priceBandMax) : undefined,
    lotSize: Number(data.lotSize) || 1,
    openDate: data.openDate || undefined,
    closeDate: data.closeDate || undefined,
    allotmentDate: data.allotmentDate || undefined,
    listingDate: data.listingDate || undefined,
    listingPrice: data.listingPrice ? Number(data.listingPrice) : undefined,
    currentPrice: data.currentPrice ? Number(data.currentPrice) : undefined,
    notes: data.notes || "",
    archived: Boolean(data.archived),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Fetches all IPOs for a user, ordered by creation date descending.
 */
export async function getIpos(
  userId: string,
  includeArchived = false
): Promise<Ipo[]> {
  const iposRef = collection(db, "users", userId, "ipos")
  let q = query(iposRef, orderBy("createdAt", "desc"))

  if (!includeArchived) {
    q = query(
      iposRef,
      where("archived", "==", false),
      orderBy("createdAt", "desc")
    )
  }

  const snap = await getDocs(q)
  return snap.docs.map(docToIpo)
}

/**
 * Fetches a single IPO by ID.
 */
export async function getIpoById(
  userId: string,
  ipoId: string
): Promise<Ipo | null> {
  const ipoRef = doc(db, "users", userId, "ipos", ipoId)
  const snap = await getDoc(ipoRef)
  if (!snap.exists()) {
    return null
  }

  return docToIpo(snap)
}

/**
 * Creates a new IPO document.
 */
export async function createIpo(
  userId: string,
  data: {
    name: string
    companyName?: string
    type: IpoType
    issuePrice: number
    priceBandMin?: number
    priceBandMax?: number
    lotSize: number
    openDate?: Timestamp
    closeDate?: Timestamp
    allotmentDate?: Timestamp
    listingDate?: Timestamp
    notes?: string
  }
): Promise<string> {
  const iposRef = collection(db, "users", userId, "ipos")

  const payload: Record<string, unknown> = {
    userId,
    name: data.name.trim(),
    companyName: data.companyName?.trim() || "",
    type: data.type,
    issuePrice: Number(data.issuePrice),
    lotSize: Number(data.lotSize),
    notes: data.notes?.trim() || "",
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.priceBandMin !== undefined && !isNaN(data.priceBandMin)) {
    payload.priceBandMin = Number(data.priceBandMin)
  }
  if (data.priceBandMax !== undefined && !isNaN(data.priceBandMax)) {
    payload.priceBandMax = Number(data.priceBandMax)
  }
  if (data.openDate) payload.openDate = data.openDate
  if (data.closeDate) payload.closeDate = data.closeDate
  if (data.allotmentDate) payload.allotmentDate = data.allotmentDate
  if (data.listingDate) payload.listingDate = data.listingDate

  const docRef = await addDoc(iposRef, payload)
  return docRef.id
}

/**
 * Updates an existing IPO document.
 */
export async function updateIpo(
  userId: string,
  ipoId: string,
  data: Partial<{
    name: string
    companyName: string
    type: IpoType
    issuePrice: number
    priceBandMin?: number
    priceBandMax?: number
    lotSize: number
    openDate?: Timestamp | null
    closeDate?: Timestamp | null
    allotmentDate?: Timestamp | null
    listingDate?: Timestamp | null
    notes: string
    archived: boolean
  }>
): Promise<void> {
  const ipoRef = doc(db, "users", userId, "ipos", ipoId)

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.name !== undefined) payload.name = data.name.trim()
  if (data.companyName !== undefined)
    payload.companyName = data.companyName.trim()
  if (data.type !== undefined) payload.type = data.type
  if (data.issuePrice !== undefined)
    payload.issuePrice = Number(data.issuePrice)
  if (data.lotSize !== undefined) payload.lotSize = Number(data.lotSize)
  if (data.notes !== undefined) payload.notes = data.notes.trim()
  if (data.archived !== undefined) payload.archived = data.archived

  if (data.priceBandMin !== undefined) {
    payload.priceBandMin = data.priceBandMin ? Number(data.priceBandMin) : null
  }
  if (data.priceBandMax !== undefined) {
    payload.priceBandMax = data.priceBandMax ? Number(data.priceBandMax) : null
  }
  if (data.openDate !== undefined) payload.openDate = data.openDate
  if (data.closeDate !== undefined) payload.closeDate = data.closeDate
  if (data.allotmentDate !== undefined)
    payload.allotmentDate = data.allotmentDate
  if (data.listingDate !== undefined) payload.listingDate = data.listingDate

  await updateDoc(ipoRef, payload)
}

/**
 * Toggles an IPO's archived state.
 */
export async function archiveIpo(
  userId: string,
  ipoId: string,
  archived: boolean
): Promise<void> {
  const ipoRef = doc(db, "users", userId, "ipos", ipoId)
  await updateDoc(ipoRef, {
    archived,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Permanently deletes an IPO document.
 */
export async function deleteIpo(userId: string, ipoId: string): Promise<void> {
  const ipoRef = doc(db, "users", userId, "ipos", ipoId)
  await deleteDoc(ipoRef)
}

/**
 * Updates market prices (listingPrice and currentPrice) for an IPO.
 */
export async function updateIpoPrices(
  userId: string,
  ipoId: string,
  prices: {
    listingPrice?: number
    currentPrice?: number
  }
): Promise<void> {
  const ipoRef = doc(db, "users", userId, "ipos", ipoId)
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (prices.listingPrice !== undefined) {
    payload.listingPrice = prices.listingPrice
      ? Number(prices.listingPrice)
      : null
  }
  if (prices.currentPrice !== undefined) {
    payload.currentPrice = prices.currentPrice
      ? Number(prices.currentPrice)
      : null
  }

  await updateDoc(ipoRef, payload)
}
