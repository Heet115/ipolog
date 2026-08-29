import { Timestamp } from "firebase/firestore"

export type AccountType = "my" | "other"

export interface ApplicationAccount {
  id: string
  userId: string

  name: string

  type: AccountType

  /** Percentage of profit shared. 0 for "my" accounts, default 40 for "other". */
  profitSharePercent: number

  notes?: string

  archived: boolean

  createdAt: Timestamp
  updatedAt: Timestamp
}
