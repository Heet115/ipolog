import { Timestamp } from "firebase/firestore"

export interface BankAccount {
  id: string
  userId: string

  bankName: string
  nickname?: string
  last4?: string
  upiId?: string
  asbaLimit?: number

  notes?: string

  archived: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Format a bank account for display, e.g. "HDFC Bank •1234" */
export function formatBankAccount(bank: BankAccount): string {
  const parts = [bank.nickname || bank.bankName]
  if (bank.last4) {
    parts.push(`•${bank.last4}`)
  }
  return parts.join(" ")
}

export type BankSortOption =
  | "name_asc"
  | "name_desc"
  | "limit_desc"
  | "limit_asc"
  | "blocked_desc"
  | "created_desc"
  | "created_asc"

export const BANK_SORT_LABELS: Record<BankSortOption, string> = {
  name_asc: "Bank Name (A → Z)",
  name_desc: "Bank Name (Z → A)",
  limit_desc: "ASBA Limit (High → Low)",
  limit_asc: "ASBA Limit (Low → High)",
  blocked_desc: "Blocked Capital (High → Low)",
  created_desc: "Recently Added",
  created_asc: "Oldest First",
}

