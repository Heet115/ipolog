/**
 * Type definitions for External IPO Providers & Upstox API responses.
 */

export interface UpstoxIpoListItem {
  id: string
  symbol: string
  name: string
  status: "open" | "closed" | "listed" | "upcoming" | string
  isin?: string | null
  issue_type: "regular" | "sme" | string
  issue_size?: number | null // in Crores
  industry?: string | null
  minimum_price: number
  maximum_price: number
  bidding_start_date?: string | null // YYYY-MM-DD
  bidding_end_date?: string | null // YYYY-MM-DD
  total_subscription?: string | null
}

export interface UpstoxIpoTimeline {
  pre_apply_start_date?: string | null
  application_start_date?: string | null
  application_end_date?: string | null
  allotment_start_date?: string | null
  allotment_date?: string | null
  refund_initiation_date?: string | null
  listing_date?: string | null
  mandate_end_date?: string | null
}

export interface UpstoxRegistrarInfo {
  name?: string | null
  email?: string | null
  contact_name?: string | null
  contact_number?: string | null
  website?: string | null
  registrar?: string | null
}

export interface UpstoxIpoDetail extends UpstoxIpoListItem {
  daily_start_time?: string | null
  daily_end_time?: string | null
  face_value?: number | null
  tick_size?: number | null
  lot_size?: number | null
  minimum_quantity?: number | null
  cut_off_price?: number | null
  listing_price?: number | null
  listing_exchange?: string | null
  rhp_url?: string | null
  drhp_url?: string | null
  timeline?: UpstoxIpoTimeline | null
  registrar_info?: UpstoxRegistrarInfo | null
}

export interface UpstoxPaginationMeta {
  page?: {
    page_number?: number
    total_pages?: number
    records?: number
    total_records?: number
  }
}

export interface UpstoxApiResponse<T> {
  status: "success" | "error" | string
  data?: T
  meta_data?: UpstoxPaginationMeta
  errors?: Array<{
    error_code?: string
    message?: string
    property_path?: string
  }>
}

/**
 * Normalized External IPO Model used across IPOLog.
 */
export interface ExternalIPO {
  externalId: string
  provider: "upstox" | string
  symbol?: string
  name: string
  companyName?: string
  type: "mainboard" | "sme"
  issuePrice: number
  priceBandMin?: number
  priceBandMax?: number
  lotSize: number
  issueSize?: number // in Crores
  status: "upcoming" | "open" | "closed" | "listed"
  isin?: string
  openDate?: string // YYYY-MM-DD ISO string
  closeDate?: string // YYYY-MM-DD ISO string
  allotmentDate?: string // YYYY-MM-DD ISO string
  listingDate?: string // YYYY-MM-DD ISO string
  listingPrice?: number
  totalSubscription?: string
  industry?: string
  registrarName?: string
  rhpUrl?: string
  drhpUrl?: string
  raw?: Record<string, unknown>
}

export interface IPOQueryParams {
  status?: "upcoming" | "open" | "closed" | "listed"
  issueType?: "regular" | "sme"
  pageNumber?: number
  records?: number
}

export interface IPOListResult {
  ipos: ExternalIPO[]
  pageNumber: number
  totalPages: number
  totalRecords: number
}

/**
 * Provider Abstraction Interface
 */
export interface IPOProvider {
  name: string
  getIPOs(params?: IPOQueryParams): Promise<IPOListResult>
  getIPOById(id: string): Promise<ExternalIPO | null>
}
