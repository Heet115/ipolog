import { Timestamp } from "firebase/firestore"

export interface BankAccount {
  id: string
  userId: string

  bankName: string
  nickname?: string
  last4?: string

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
