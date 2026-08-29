import type {
  ExternalIPO,
  UpstoxIpoDetail,
  UpstoxIpoListItem,
} from "./types"

/**
 * Normalizes an external issue type to IPOLog standard type ("mainboard" | "sme").
 */
export function normalizeIpoType(
  issueType?: string | null
): "mainboard" | "sme" {
  if (!issueType) return "mainboard"
  const clean = issueType.toLowerCase().trim()
  if (clean === "sme") return "sme"
  return "mainboard"
}

/**
 * Normalizes an external status to IPOLog standard status.
 */
export function normalizeIpoStatus(
  status?: string | null
): "upcoming" | "open" | "closed" | "listed" {
  if (!status) return "open"
  const clean = status.toLowerCase().trim()
  if (clean === "upcoming") return "upcoming"
  if (clean === "closed") return "closed"
  if (clean === "listed") return "listed"
  return "open"
}

/**
 * Derives a clean company name from the IPO name.
 * e.g. "Autofurnish IPO" -> "Autofurnish" or "Hero Fincorp Limited IPO" -> "Hero Fincorp Limited"
 */
export function deriveCompanyName(name: string): string {
  if (!name) return ""
  return name.replace(/\s+IPO\s*$/i, "").trim()
}

/**
 * Normalizes an Upstox list item into an ExternalIPO.
 */
export function normalizeUpstoxListItem(
  item: UpstoxIpoListItem
): ExternalIPO {
  const minPrice = typeof item.minimum_price === "number" ? item.minimum_price : 0
  const maxPrice = typeof item.maximum_price === "number" ? item.maximum_price : 0
  const issuePrice = maxPrice > 0 ? maxPrice : minPrice > 0 ? minPrice : 0

  return {
    externalId: item.id,
    provider: "upstox",
    symbol: item.symbol || undefined,
    name: item.name,
    companyName: deriveCompanyName(item.name),
    type: normalizeIpoType(item.issue_type),
    issuePrice,
    priceBandMin: minPrice > 0 ? minPrice : undefined,
    priceBandMax: maxPrice > 0 ? maxPrice : undefined,
    lotSize: 1, // Full lot size is available in detailed view /v2/ipos/{id}
    issueSize:
      typeof item.issue_size === "number" && item.issue_size > 0
        ? item.issue_size
        : undefined,
    status: normalizeIpoStatus(item.status),
    isin: item.isin || undefined,
    openDate: item.bidding_start_date || undefined,
    closeDate: item.bidding_end_date || undefined,
    totalSubscription: item.total_subscription || undefined,
    industry: item.industry || undefined,
    raw: item as unknown as Record<string, unknown>,
  }
}

/**
 * Normalizes an Upstox detailed IPO response into an ExternalIPO.
 */
export function normalizeUpstoxDetail(
  detail: UpstoxIpoDetail
): ExternalIPO {
  const minPrice =
    typeof detail.minimum_price === "number" ? detail.minimum_price : 0
  const maxPrice =
    typeof detail.maximum_price === "number" ? detail.maximum_price : 0
  const cutoffPrice =
    typeof detail.cut_off_price === "number" ? detail.cut_off_price : 0
  const issuePrice =
    maxPrice > 0 ? maxPrice : minPrice > 0 ? minPrice : cutoffPrice > 0 ? cutoffPrice : 0

  const openDate =
    detail.timeline?.application_start_date ||
    detail.timeline?.pre_apply_start_date ||
    detail.bidding_start_date ||
    undefined

  const closeDate =
    detail.timeline?.application_end_date ||
    detail.bidding_end_date ||
    undefined

  const allotmentDate =
    detail.timeline?.allotment_start_date ||
    detail.timeline?.allotment_date ||
    undefined

  const listingDate = detail.timeline?.listing_date || undefined

  const lotSize =
    typeof detail.lot_size === "number" && detail.lot_size > 0
      ? detail.lot_size
      : 1

  return {
    externalId: detail.id,
    provider: "upstox",
    symbol: detail.symbol || undefined,
    name: detail.name,
    companyName: deriveCompanyName(detail.name),
    type: normalizeIpoType(detail.issue_type),
    issuePrice,
    priceBandMin: minPrice > 0 ? minPrice : undefined,
    priceBandMax: maxPrice > 0 ? maxPrice : undefined,
    lotSize,
    issueSize:
      typeof detail.issue_size === "number" && detail.issue_size > 0
        ? detail.issue_size
        : undefined,
    status: normalizeIpoStatus(detail.status),
    isin: detail.isin || undefined,
    openDate,
    closeDate,
    allotmentDate,
    listingDate,
    listingPrice:
      typeof detail.listing_price === "number" && detail.listing_price > 0
        ? detail.listing_price
        : undefined,
    totalSubscription: detail.total_subscription || undefined,
    industry: detail.industry || undefined,
    registrarName: detail.registrar_info?.name || undefined,
    rhpUrl: detail.rhp_url || undefined,
    drhpUrl: detail.drhp_url || undefined,
    raw: detail as unknown as Record<string, unknown>,
  }
}
