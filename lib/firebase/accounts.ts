import {
  collection,
  doc,
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
    notes?: string
  }
): Promise<string> {
  const accountsRef = collection(db, "users", userId, "applicationAccounts")

  const profitSharePercent =
    data.type === "my" ? 0 : (data.profitSharePercent ?? 40)

  const docRef = await addDoc(accountsRef, {
    userId,
    name: data.name.trim(),
    type: data.type,
    profitSharePercent,
    notes: data.notes?.trim() || "",
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

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
  if (data.profitSharePercent !== undefined) {
    updatePayload.profitSharePercent =
      data.type === "my" ? 0 : data.profitSharePercent
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
