import { Timestamp } from "firebase/firestore"

export type AccountType = "my" | "other"

export interface ApplicationAccount {
  id: string
  userId: string

  name: string

  type: AccountType

  /** Percentage of profit shared. 0 for "my" accounts, default 40 for "other". */
  profitSharePercent: number

  pan?: string
  dematAccount?: string
  phoneNumber?: string

  notes?: string

  /** User-defined display order. Persisted in Firestore. Lower = higher in list. */
  sortIndex?: number

  archived: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}

export type AccountSortOption =
  | "custom"
  | "name_asc"
  | "name_desc"
  | "type_my"
  | "type_other"
  | "profit_desc"
  | "created_desc"
  | "created_asc"

export const ACCOUNT_SORT_LABELS: Record<AccountSortOption, string> = {
  custom: "Custom (Priority)",
  name_asc: "Name (A → Z)",
  name_desc: "Name (Z → A)",
  type_my: "My Accounts First",
  type_other: "Partners First",
  profit_desc: "Profit % (High → Low)",
  created_desc: "Recently Added",
  created_asc: "Oldest First",
}

