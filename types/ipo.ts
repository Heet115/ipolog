import { Timestamp } from "firebase/firestore"

export type IpoType = "mainboard" | "sme"

export type IpoStatus =
  "upcoming" | "open" | "closed" | "allotment_pending" | "listed" | "completed"

export interface Ipo {
  id: string
  userId: string

  name: string
  companyName?: string

  type: IpoType

  issuePrice: number
  priceBandMin?: number
  priceBandMax?: number
  lotSize: number

  openDate?: Timestamp
  closeDate?: Timestamp
  allotmentDate?: Timestamp
  listingDate?: Timestamp

  listingPrice?: number
  currentPrice?: number

  notes?: string

  archived: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}
