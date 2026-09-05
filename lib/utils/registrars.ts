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
    name: "Link Intime India",
    aliases: [
      "link intime",
      "linkintime",
      "link-intime",
      "in time",
      "intime",
    ],
    checkUrl: "https://linkintime.co.in/initial_offer/public-issues.html",
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
    checkUrl: "https://kosmic.kfintech.com/ipostatus/",
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
    aliases: [
      "purva",
      "purvashare",
      "purva sharegistry",
    ],
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
    aliases: [
      "integrated",
      "integrated registry",
      "integrated enterprises",
    ],
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
    if (reg.aliases.some((alias) => clean.includes(alias))) {
      return reg
    }
  }
  return null
}

/**
 * Returns the resolved portal URL for an IPO's registrar.
 */
export function getRegistrarPortalUrl(
  registrar?: string | null,
  customUrl?: string | null
): string | null {
  if (customUrl && customUrl.trim()) return customUrl.trim()
  if (!registrar) return null
  const detected = detectRegistrar(registrar)
  return detected ? detected.checkUrl : null
}
