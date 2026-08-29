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
import type { BankAccount } from "@/types"

function docToBankAccount(
  docSnap: QueryDocumentSnapshot<DocumentData>
): BankAccount {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    userId: data.userId,
    bankName: data.bankName,
    nickname: data.nickname || "",
    last4: data.last4 || "",
    notes: data.notes || "",
    archived: Boolean(data.archived),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

/**
 * Fetches all bank accounts for the given user, ordered by creation date.
 */
export async function getBankAccounts(
  userId: string,
  includeArchived = false
): Promise<BankAccount[]> {
  const bankAccountsRef = collection(db, "users", userId, "bankAccounts")
  let q = query(bankAccountsRef, orderBy("createdAt", "asc"))

  if (!includeArchived) {
    q = query(bankAccountsRef, where("archived", "==", false), orderBy("createdAt", "asc"))
  }

  const snap = await getDocs(q)
  return snap.docs.map(docToBankAccount)
}

/**
 * Creates a new bank account under users/{userId}/bankAccounts.
 */
export async function createBankAccount(
  userId: string,
  data: {
    bankName: string
    nickname?: string
    last4?: string
    notes?: string
  }
): Promise<string> {
  const bankAccountsRef = collection(db, "users", userId, "bankAccounts")

  const docRef = await addDoc(bankAccountsRef, {
    userId,
    bankName: data.bankName.trim(),
    nickname: data.nickname?.trim() || "",
    last4: data.last4?.trim() || "",
    notes: data.notes?.trim() || "",
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

/**
 * Updates a bank account.
 */
export async function updateBankAccount(
  userId: string,
  bankAccountId: string,
  data: Partial<{
    bankName: string
    nickname: string
    last4: string
    notes: string
    archived: boolean
  }>
): Promise<void> {
  const bankAccountRef = doc(db, "users", userId, "bankAccounts", bankAccountId)

  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (data.bankName !== undefined) updatePayload.bankName = data.bankName.trim()
  if (data.nickname !== undefined) updatePayload.nickname = data.nickname.trim()
  if (data.last4 !== undefined) updatePayload.last4 = data.last4.trim()
  if (data.notes !== undefined) updatePayload.notes = data.notes.trim()
  if (data.archived !== undefined) updatePayload.archived = data.archived

  await updateDoc(bankAccountRef, updatePayload)
}

/**
 * Toggles the archived state of a bank account.
 */
export async function archiveBankAccount(
  userId: string,
  bankAccountId: string,
  archived: boolean
): Promise<void> {
  const bankAccountRef = doc(db, "users", userId, "bankAccounts", bankAccountId)
  await updateDoc(bankAccountRef, {
    archived,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Permanently deletes a bank account document.
 */
export async function deleteBankAccount(
  userId: string,
  bankAccountId: string
): Promise<void> {
  const bankAccountRef = doc(db, "users", userId, "bankAccounts", bankAccountId)
  await deleteDoc(bankAccountRef)
}
