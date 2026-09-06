"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
  type UserCredential,
} from "firebase/auth"
import { auth } from "@/lib/firebase/firebase"
import { createOrUpdateUserProfile, updateUserDisplayName } from "@/lib/firebase/user"

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, pass: string) => Promise<UserCredential>
  signUpWithEmail: (email: string, pass: string) => Promise<UserCredential>
  signInWithGoogle: () => Promise<UserCredential>
  sendPasswordReset: (email: string) => Promise<void>
  signOut: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  changePassword: (currentPass: string, newPass: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithEmail: async () => {
    throw new Error("AuthProvider not initialized")
  },
  signUpWithEmail: async () => {
    throw new Error("AuthProvider not initialized")
  },
  signInWithGoogle: async () => {
    throw new Error("AuthProvider not initialized")
  },
  sendPasswordReset: async () => {
    throw new Error("AuthProvider not initialized")
  },
  signOut: async () => {},
  updateDisplayName: async () => {
    throw new Error("AuthProvider not initialized")
  },
  changePassword: async () => {
    throw new Error("AuthProvider not initialized")
  },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      if (firebaseUser) {
        try {
          await createOrUpdateUserProfile(firebaseUser)
        } catch (error) {
          console.error("Error creating/updating user profile:", error)
        }
      }
    })

    return unsubscribe
  }, [])

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass)
    try {
      await createOrUpdateUserProfile(cred.user)
    } catch (e) {
      console.error("Error saving user profile on sign in:", e)
    }
    return cred
  }

  const signUpWithEmail = async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass)
    try {
      await createOrUpdateUserProfile(cred.user)
    } catch (e) {
      console.error("Error saving user profile on sign up:", e)
    }
    return cred
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    try {
      await createOrUpdateUserProfile(cred.user)
    } catch (e) {
      console.error("Error saving user profile on google sign in:", e)
    }
    return cred
  }

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
  }

  const updateDisplayName = async (displayName: string) => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user")
    }
    await updateProfile(auth.currentUser, { displayName })
    await updateUserDisplayName(auth.currentUser.uid, displayName)
    const currentUser = auth.currentUser
    if (currentUser) {
      const cloned = Object.assign(
        Object.create(Object.getPrototypeOf(currentUser)),
        currentUser
      )
      setUser(cloned)
    }
  }

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("No authenticated user")
    }
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPass
    )
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updatePassword(auth.currentUser, newPass)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        signOut,
        updateDisplayName,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
