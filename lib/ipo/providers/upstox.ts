import type {
  ExternalIPO,
  IPOListResult,
  IPOProvider,
  IPOQueryParams,
  UpstoxApiResponse,
  UpstoxIpoDetail,
  UpstoxIpoListItem,
} from "../types"
import { normalizeUpstoxDetail, normalizeUpstoxListItem } from "../normalize"

const UPSTOX_BASE_URL = "https://api.upstox.com/v2"
const CACHE_TTL_MS = 60 * 1000 // 1 minute in-memory cache

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const memoryCache = new Map<string, CacheEntry<unknown>>()

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key)
    return null
  }
  return entry.data
}

function setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

export class UpstoxProvider implements IPOProvider {
  name = "upstox"

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "IPOLog/1.0",
    }

    const token =
      process.env.UPSTOX_ANALYTICS_TOKEN || process.env.UPSTOX_ACCESS_TOKEN
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Fetches a paginated list of IPOs from Upstox.
   */
  async getIPOs(params: IPOQueryParams = {}): Promise<IPOListResult> {
    const status = params.status || "open"
    const issueType = params.issueType
    const pageNumber = params.pageNumber || 1
    const records = Math.min(params.records || 30, 30)

    const cacheKey = `upstox:ipos:${status}:${issueType || "all"}:${pageNumber}:${records}`
    const cached = getFromCache<IPOListResult>(cacheKey)
    if (cached) {
      return cached
    }

    const queryParams = new URLSearchParams({
      status,
      page_number: String(pageNumber),
      records: String(records),
    })

    if (issueType) {
      queryParams.set("issue_type", issueType)
    }

    const url = `${UPSTOX_BASE_URL}/ipos?${queryParams.toString()}`

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Upstox API rate limit reached. Please try again later.")
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("Upstox API authentication error. Please verify your access credentials.")
        }
        if (res.status >= 500) {
          throw new Error("Upstox IPO service is temporarily unavailable. Please try again later.")
        }
        const errJson = (await res.json().catch(() => ({}))) as UpstoxApiResponse<unknown>
        const errorMsg =
          errJson.errors?.[0]?.message ||
          `Upstox request failed with status ${res.status}`
        throw new Error(errorMsg)
      }

      const json = (await res.json()) as UpstoxApiResponse<UpstoxIpoListItem[]>

      if (!json.data || !Array.isArray(json.data)) {
        return {
          ipos: [],
          pageNumber: 1,
          totalPages: 1,
          totalRecords: 0,
        }
      }

      const ipos = json.data.map(normalizeUpstoxListItem)
      const pageMeta = json.meta_data?.page

      const result: IPOListResult = {
        ipos,
        pageNumber: pageMeta?.page_number || pageNumber,
        totalPages: pageMeta?.total_pages || 1,
        totalRecords: pageMeta?.total_records || ipos.length,
      }

      setCache(cacheKey, result)
      return result
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          throw new Error("Request to Upstox timed out. Please try again.")
        }
        throw error
      }
      throw new Error("An unexpected error occurred while fetching IPOs from Upstox.")
    }
  }

  /**
   * Fetches detailed information for a single IPO by ID from Upstox.
   */
  async getIPOById(id: string): Promise<ExternalIPO | null> {
    if (!id || typeof id !== "string") {
      return null
    }

    const cleanId = encodeURIComponent(id.trim())
    const cacheKey = `upstox:ipo:${cleanId}`
    const cached = getFromCache<ExternalIPO>(cacheKey)
    if (cached) {
      return cached
    }

    const url = `${UPSTOX_BASE_URL}/ipos/${cleanId}`

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: this.getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      })

      if (res.status === 404) {
        return null
      }

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Upstox API rate limit reached. Please try again later.")
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error("Upstox API authentication error. Please verify your access credentials.")
        }
        if (res.status >= 500) {
          throw new Error("Upstox IPO service is temporarily unavailable. Please try again later.")
        }
        const errJson = (await res.json().catch(() => ({}))) as UpstoxApiResponse<unknown>
        const errorMsg =
          errJson.errors?.[0]?.message ||
          `Upstox request failed with status ${res.status}`
        throw new Error(errorMsg)
      }

      const json = (await res.json()) as UpstoxApiResponse<UpstoxIpoDetail>

      if (!json.data || !json.data.id) {
        return null
      }

      const externalIpo = normalizeUpstoxDetail(json.data)
      setCache(cacheKey, externalIpo)
      return externalIpo
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "TimeoutError" || error.name === "AbortError") {
          throw new Error("Request to Upstox timed out. Please try again.")
        }
        throw error
      }
      throw new Error("An unexpected error occurred while fetching IPO details from Upstox.")
    }
  }
}

export const upstoxProvider = new UpstoxProvider()
