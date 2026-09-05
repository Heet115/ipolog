import type { ExternalIPO, UpstoxIpoDetail, UpstoxIpoListItem } from "./types"
import { getRegistrarPortalUrl } from "@/lib/utils/registrars"

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
 * Helper to safely parse numeric values from API responses.
 */
function parseNumeric(val: unknown): number {
  if (typeof val === "number" && !isNaN(val)) return val
  if (typeof val === "string") {
    const parsed = parseFloat(val)
    if (!isNaN(parsed)) return parsed
  }
  return 0
}

/**
 * Derives a clean company name from the IPO name.
 * e.g. "Autofurnish IPO" -> "Autofurnish", "Yaashvi Jewellers - SME IPO" -> "Yaashvi Jewellers"
 */
export function deriveCompanyName(name: string): string {
  if (!name) return ""
  return name
    .replace(/\s*\((?:SME\s+)?IPO\)\s*$/i, "")
    .replace(/\s*[-–—]?\s*(?:SME\s+)?IPO\s*$/i, "")
    .trim()
}

/**
 * Normalizes an Upstox list item into an ExternalIPO.
 */
export function normalizeUpstoxListItem(item: UpstoxIpoListItem): ExternalIPO {
  const minPrice = parseNumeric(item.minimum_price)
  const maxPrice = parseNumeric(item.maximum_price)
  const issuePrice = maxPrice > 0 ? maxPrice : minPrice > 0 ? minPrice : 0
  const issueSize = parseNumeric(item.issue_size)

  return {
    externalId: item.id,
    provider: "upstox",
    symbol: item.symbol?.trim() || undefined,
    name: item.name,
    companyName: deriveCompanyName(item.name),
    type: normalizeIpoType(item.issue_type),
    issuePrice,
    priceBandMin: minPrice > 0 ? minPrice : undefined,
    priceBandMax: maxPrice > 0 ? maxPrice : undefined,
    lotSize: 1, // Full lot size is available in detailed view /v2/ipos/{id}
    issueSize: issueSize > 0 ? issueSize : undefined,
    status: normalizeIpoStatus(item.status),
    isin: item.isin?.trim() || undefined,
    openDate: item.bidding_start_date || undefined,
    closeDate: item.bidding_end_date || undefined,
    totalSubscription: item.total_subscription || undefined,
    industry: item.industry?.trim() || undefined,
    raw: item as unknown as Record<string, unknown>,
  }
}

/**
 * Normalizes an Upstox detailed IPO response into an ExternalIPO.
 */
export function normalizeUpstoxDetail(detail: UpstoxIpoDetail): ExternalIPO {
  const minPrice = parseNumeric(detail.minimum_price)
  const maxPrice = parseNumeric(detail.maximum_price)
  const cutoffPrice = parseNumeric(detail.cut_off_price)
  const issuePrice =
    maxPrice > 0
      ? maxPrice
      : minPrice > 0
        ? minPrice
        : cutoffPrice > 0
          ? cutoffPrice
          : 0

  const openDate =
    detail.timeline?.application_start_date ||
    detail.bidding_start_date ||
    detail.timeline?.pre_apply_start_date ||
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

  const parsedLotSize = parseNumeric(detail.lot_size)
  const lotSize = parsedLotSize > 0 ? parsedLotSize : 1
  const issueSize = parseNumeric(detail.issue_size)
  const listingPrice = parseNumeric(detail.listing_price)

  return {
    externalId: detail.id,
    provider: "upstox",
    symbol: detail.symbol?.trim() || undefined,
    name: detail.name,
    companyName: deriveCompanyName(detail.name),
    type: normalizeIpoType(detail.issue_type),
    issuePrice,
    priceBandMin: minPrice > 0 ? minPrice : undefined,
    priceBandMax: maxPrice > 0 ? maxPrice : undefined,
    lotSize,
    issueSize: issueSize > 0 ? issueSize : undefined,
    status: normalizeIpoStatus(detail.status),
    isin: detail.isin?.trim() || undefined,
    openDate,
    closeDate,
    allotmentDate,
    listingDate,
    listingPrice: listingPrice > 0 ? listingPrice : undefined,
    totalSubscription: detail.total_subscription || undefined,
    industry: detail.industry?.trim() || undefined,
    registrarName:
      detail.registrar_info?.name?.trim() ||
      detail.registrar_info?.registrar?.trim() ||
      undefined,
    registrarWebsite: detail.registrar_info?.website?.trim() || undefined,
    registrarUrl:
      getRegistrarPortalUrl(
        detail.registrar_info?.name?.trim() ||
          detail.registrar_info?.registrar?.trim(),
        detail.registrar_info?.website?.trim()
      ) || undefined,
    rhpUrl: detail.rhp_url?.trim() || undefined,
    drhpUrl: detail.drhp_url?.trim() || undefined,
    raw: detail as unknown as Record<string, unknown>,
  }
}
