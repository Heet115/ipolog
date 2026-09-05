/**
 * Registry of Indian IPO Registrars with official public allotment status check URLs.
 */

export interface RegistrarInfo {
  id: string
  name: string
  aliases: string[]
  checkUrl: string
  searchModes: Array<"pan" | "appNo" | "dpId">
}

export const KNOWN_REGISTRARS: RegistrarInfo[] = [
  {
    id: "linkintime",
    name: "MUFG Intime (Link Intime)",
    aliases: [
      "mufg",
      "mufg intime",
      "link intime",
      "linkintime",
      "link-intime",
      "in time",
      "intime",
    ],
    checkUrl: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
    searchModes: ["pan", "appNo", "dpId"],
  },
  {
    id: "kfintech",
    name: "KFin Technologies",
    aliases: [
      "kfintech",
      "kfin",
      "karvy",
      "kosmic",
      "kfin technologies",
      "kfin technologies limited",
    ],
    checkUrl: "https://ipostatus.kfintech.com/",
    searchModes: ["pan", "appNo", "dpId"],
  },
  {
    id: "bigshare",
    name: "Bigshare Services",
    aliases: [
      "bigshare",
      "big share",
      "bigshares",
      "bigshare services",
      "bigshare services private limited",
    ],
    checkUrl: "https://ipo.bigshareonline.com/",
    searchModes: ["appNo", "pan", "dpId"],
  },
  {
    id: "skyline",
    name: "Skyline Financial",
    aliases: [
      "skyline",
      "skyline financial",
      "skylinerta",
      "skyline financial services",
    ],
    checkUrl: "https://www.skylinerta.com/ipo.php",
    searchModes: ["dpId", "appNo", "pan"],
  },
  {
    id: "cameo",
    name: "Cameo Corporate",
    aliases: [
      "cameo",
      "cameo corporate",
      "cameoindia",
      "cameo corporate services",
    ],
    checkUrl: "https://ipo.cameoindia.com/",
    searchModes: ["pan", "appNo", "dpId"],
  },
  {
    id: "purva",
    name: "Purva Sharegistry",
    aliases: ["purva", "purvashare", "purva sharegistry"],
    checkUrl: "https://www.purvashare.com/queries/",
    searchModes: ["appNo", "pan"],
  },
  {
    id: "maashitla",
    name: "Maashitla Securities",
    aliases: [
      "maashitla",
      "maashitla securities",
      "maashitla securities private limited",
    ],
    checkUrl: "https://maashitla.com/allotment-status/public-issues",
    searchModes: ["pan", "appNo", "dpId"],
  },
  {
    id: "integrated",
    name: "Integrated Registry",
    aliases: ["integrated", "integrated registry", "integrated enterprises"],
    checkUrl: "https://www.integratedindia.in/",
    searchModes: ["pan", "dpId"],
  },
]

/**
 * Automatically identifies a known registrar by fuzzy-matching names or provider metadata.
 */
export function detectRegistrar(
  registrarText?: string | null
): RegistrarInfo | null {
  if (!registrarText) return null
  const clean = registrarText.toLowerCase().trim()
  for (const reg of KNOWN_REGISTRARS) {
    if (
      reg.id === clean ||
      reg.name.toLowerCase() === clean ||
      reg.aliases.some((alias) => clean.includes(alias))
    ) {
      return reg
    }
  }
  return null
}

/**
 * Exchange Allotment Portals (available for all IPOs regardless of registrar)
 */
export const BSE_ALLOTMENT_URL =
  "https://www.bseindia.com/investors/appli_check.aspx"
export const NSE_ALLOTMENT_URL =
  "https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids"

/**
 * Concise key-value mapping of known registrars and stock exchange allotment portals.
 */
export const REGISTRAR_URL_MAP: Record<string, string> = {
  linkintime: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
  mufg: "https://in.mpms.mufg.com/Initial_Offer/public-issues.html",
  kfintech: "https://ipostatus.kfintech.com/",
  bigshare: "https://ipo.bigshareonline.com/",
  skyline: "https://www.skylinerta.com/ipo.php",
  cameo: "https://ipo.cameoindia.com/",
  purva: "https://www.purvashare.com/queries/",
  maashitla: "https://maashitla.com/allotment-status/public-issues",
  integrated: "https://www.integratedindia.in/",
  bse: BSE_ALLOTMENT_URL,
  nse: NSE_ALLOTMENT_URL,
}

/**
 * Returns the resolved portal URL for an IPO's registrar.
 * Always prefers the verified official registry URL when a known registrar is detected,
 * fixing legacy outdated URLs (e.g. linkintime.co.in -> in.mpms.mufg.com).
 */
export function getRegistrarPortalUrl(
  registrar?: string | null,
  customUrl?: string | null
): string | null {
  const detected = detectRegistrar(registrar)
  if (detected) {
    return detected.checkUrl
  }

  if (customUrl && customUrl.trim()) {
    const trimmed = customUrl.trim()
    const detectedFromUrl = detectRegistrar(trimmed)
    if (detectedFromUrl) {
      return detectedFromUrl.checkUrl
    }
    // Redirect outdated Link Intime domain to modern MUFG portal
    if (trimmed.includes("linkintime.co.in")) {
      return "https://in.mpms.mufg.com/Initial_Offer/public-issues.html"
    }
    return trimmed
  }

  return null
}
