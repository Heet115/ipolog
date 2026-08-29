import { Timestamp } from "firebase/firestore"

export type ApplicationStatus = "pending" | "allotted" | "not_allotted" | "sold"

export interface Application {
  id: string
  userId: string

  ipoId: string
  accountId: string
  bankAccountId: string

  applicationDate: Timestamp

  lotsApplied: number
  sharesApplied: number
  amountApplied: number

  status: ApplicationStatus

  allottedLots?: number
  allottedShares?: number

  listingPrice?: number
  currentPrice?: number

  sharesSold?: number
  salePrice?: number
  saleDate?: Timestamp

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
