import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase/firebase"
import type { ApplicationAccount } from "@/types"

function docToAccount(
  docSnap: QueryDocumentSnapshot<DocumentData>
): ApplicationAccount {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    userId: data.userId,
    name: data.name,
    type: data.type,
    profitSharePercent:
      data.profitSharePercent ?? (data.type === "my" ? 0 : 40),
    pan: data.pan || undefined,
    dematAccount: data.dematAccount || undefined,
    notes: data.notes || "",
    archived: Boolean(data.archived),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Fetches all application accounts for the given user, ordered by creation date.
 */
export async function getApplicationAccounts(
  userId: string,
  includeArchived = false
): Promise<ApplicationAccount[]> {
  const accountsRef = collection(db, "users", userId, "applicationAccounts")
  let q = query(accountsRef, orderBy("createdAt", "asc"))

  if (!includeArchived) {
    q = query(
      accountsRef,
      where("archived", "==", false),
      orderBy("createdAt", "asc")
    )
  }

  const snap = await getDocs(q)
  return snap.docs.map(docToAccount)
}

/**
 * Creates a new application account under users/{userId}/applicationAccounts.
 */
export async function createApplicationAccount(
  userId: string,
  data: {
    name: string
    type: "my" | "other"
    profitSharePercent?: number
    pan?: string
    dematAccount?: string
    notes?: string
  }
): Promise<string> {
  const accountsRef = collection(db, "users", userId, "applicationAccounts")

  const profitSharePercent =
    data.type === "my" ? 0 : (data.profitSharePercent ?? 40)

  const payload: Record<string, unknown> = {
    userId,
    name: data.name.trim(),
    type: data.type,
    profitSharePercent,
    notes: data.notes?.trim() || "",
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (data.pan) payload.pan = data.pan.trim().toUpperCase()
  if (data.dematAccount) payload.dematAccount = data.dematAccount.trim()

  const docRef = await addDoc(accountsRef, payload)
  return docRef.id
}

/**
 * Updates an application account.
 */
export async function updateApplicationAccount(
  userId: string,
  accountId: string,
  data: Partial<{
    name: string
    type: "my" | "other"
    profitSharePercent: number
    pan: string | null
    dematAccount: string | null
    notes: string
    archived: boolean
  }>
): Promise<void> {
  const accountRef = doc(db, "users", userId, "applicationAccounts", accountId)

  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.name !== undefined) updatePayload.name = data.name.trim()
  if (data.type !== undefined) updatePayload.type = data.type
  if (data.pan !== undefined)
    updatePayload.pan = data.pan ? data.pan.trim().toUpperCase() : null
  if (data.dematAccount !== undefined)
    updatePayload.dematAccount = data.dematAccount ? data.dematAccount.trim() : null
  if (data.profitSharePercent !== undefined) {
    // Determine the effective type: use the incoming type if provided,
    // otherwise read the current type from Firestore to enforce the rule.
    let effectiveType = data.type
    if (effectiveType === undefined) {
      const snap = await getDoc(accountRef)
      effectiveType = snap.exists() ? snap.data()?.type : undefined
    }
    updatePayload.profitSharePercent =
      effectiveType === "my" ? 0 : data.profitSharePercent
  }
  if (data.notes !== undefined) updatePayload.notes = data.notes.trim()
  if (data.archived !== undefined) updatePayload.archived = data.archived

  await updateDoc(accountRef, updatePayload)
}

/**
 * Toggles the archived state of an application account.
 */
export async function archiveApplicationAccount(
  userId: string,
  accountId: string,
  archived: boolean
): Promise<void> {
  const accountRef = doc(db, "users", userId, "applicationAccounts", accountId)
  await updateDoc(accountRef, {
    archived,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Permanently deletes an application account document.
 */
export async function deleteApplicationAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const accountRef = doc(db, "users", userId, "applicationAccounts", accountId)
  await deleteDoc(accountRef)
}
