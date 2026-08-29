import { NextRequest } from "next/server"

export interface AuthenticatedUser {
  uid: string
  email?: string
}

/**
 * Verifies a Firebase Auth ID Token sent in the Authorization Bearer header.
 * Uses Google's official Firebase Identity Toolkit REST API endpoint.
 */
export async function verifyServerAuth(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const idToken = authHeader.slice(7).trim()
  if (!idToken) {
    return null
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    console.error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured")
    return null
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const user = data.users?.[0]
    if (!user || !user.localId) {
      return null
    }

    return {
      uid: user.localId,
      email: user.email,
    }
  } catch (error) {
    console.error("Server auth verification failed:", error)
    return null
  }
}
