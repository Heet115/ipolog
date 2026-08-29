import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
import type { User as FirebaseUser } from "firebase/auth"
import { db } from "@/lib/firebase/firebase"

export interface UserProfile {
  uid: string
  email: string | null
  createdAt: unknown
  updatedAt: unknown
}

/**
 * Creates or updates the user profile document at users/{uid} in Firestore.
 */
export async function createOrUpdateUserProfile(
  user: FirebaseUser
): Promise<void> {
  const userRef = doc(db, "users", user.uid)
  const snap = await getDoc(userRef)

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(
      userRef,
      {
        email: user.email ?? null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }
}

/**
 * Retrieves the user profile document from Firestore.
 */
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    return null
  }
  return snap.data() as UserProfile
}
