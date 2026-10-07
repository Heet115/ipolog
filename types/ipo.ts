import { Timestamp } from "firebase/firestore"

export type IpoType = "mainboard" | "sme"

export type IpoStatus =
  "upcoming" | "open" | "closed" | "allotment_pending" | "listed" | "completed"

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
  registrar?: string
  registrarUrl?: string

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

export type StatusFilter =
  | "all"
  | "open"
  | "upcoming"
  | "allotment_pending"
  | "closed"
  | "listed"
  | "archived"

export type TypeFilter = "all" | IpoType

export type IpoSortOption =
  | "close_date_asc"
  | "close_date_desc"
  | "open_date_desc"
  | "open_date_asc"
  | "name_asc"
  | "name_desc"
  | "price_desc"
  | "price_asc"
  | "created_desc"
  | "created_asc"

export const IPO_SORT_LABELS: Record<IpoSortOption, string> = {
  close_date_asc: "Closing Soonest",
  close_date_desc: "Closing Latest",
  open_date_desc: "Opening Latest",
  open_date_asc: "Opening Earliest",
  name_asc: "Name (A → Z)",
  name_desc: "Name (Z → A)",
  price_desc: "Price (High → Low)",
  price_asc: "Price (Low → High)",
  created_desc: "Recently Added",
  created_asc: "Oldest First",
}
