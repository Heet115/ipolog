import { Timestamp } from "firebase/firestore"

export type IpoType = "mainboard" | "sme"

export type IpoStatus =
  | "upcoming"
  | "open"
  | "closed"
  | "allotment_pending"
  | "listed"
  | "completed"

export interface Ipo {
  id: string
  userId: string

  name: string
  companyName?: string
  symbol?: string

  type: IpoType

  issuePrice: number
  priceBandMin?: number
  priceBandMax?: number
  lotSize: number
  issueSize?: number // in Cr

  openDate?: Timestamp
  closeDate?: Timestamp
  allotmentDate?: Timestamp
  listingDate?: Timestamp

  listingPrice?: number
  currentPrice?: number

  isin?: string

  // Source & Sync Metadata
  source?: "manual" | "api"
  provider?: "upstox" | string
  externalId?: string
  lastSyncedAt?: Timestamp

  notes?: string

  archived: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}
