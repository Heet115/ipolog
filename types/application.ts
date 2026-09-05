import { Timestamp } from "firebase/firestore"

export type ApplicationStatus = "pending" | "allotted" | "not_allotted" | "sold"

export type SettlementStatus = "pending" | "settled"

export type ApplicationCategory =
  "retail" | "shni" | "bhni" | "shareholder" | "employee"

export interface Application {
  id: string
  userId: string

  ipoId: string
  accountId: string
  bankAccountId: string

  applicationDate: Timestamp
  applicationNumber?: string

  category?: ApplicationCategory

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

  settlementStatus?: SettlementStatus
  settledAt?: Timestamp

  notes?: string

  createdAt: Timestamp
  updatedAt: Timestamp
}
