/**
 * Converts Firebase Auth error codes into clean, user-friendly error messages.
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password. Please check your credentials."
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/weak-password":
      return "Password is too weak. It must be at least 6 characters."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again."
    case "auth/popup-closed-by-user":
      return "Sign in popup was closed before completing."
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support."
    default:
      return "An unexpected authentication error occurred. Please try again."
  }
}
