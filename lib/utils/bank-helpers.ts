import type { BankAccount } from "@/types"

export function getBankDisplayName(bank: BankAccount): string {
  const parts: string[] = [bank.bankName]
  if (bank.nickname && bank.nickname !== bank.bankName) {
    parts.push(`(${bank.nickname})`)
  }
  if (bank.last4) {
    parts.push(`••••${bank.last4}`)
  }
  return parts.join(" ")
}
