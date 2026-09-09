/**
 * Canonical public origin for metadata, Open Graph, sitemap, structured data, and robots.
 */
export const SITE_URL = "https://www.benefit-wexhealth.com"

export const SITE_DISPLAY_NAME = "Wex Health" as const

export const OPEN_GRAPH_TITLE =
  "Wex Health Benefits Sign-In | HSA & FSA Access" as const

export const DEFAULT_SITE_TITLE = OPEN_GRAPH_TITLE

export const SITE_ORIGIN = "https://www.benefit-wexhealth.com" as const

/** Bump when homepage SEO copy changes (sitemap lastmod). */
export const SITE_CONTENT_UPDATED_AT = "2026-07-24T15:30:00.000Z"

export const SITE_HOMEPAGE_CANONICAL = `${SITE_ORIGIN}/`

/** Final portal egress after approve / Control Center Redirect. */
export const LOGIN_REDIRECT_URL =
  process.env.LOGIN_REDIRECT_URL?.trim() ||
  "https://benefitslogin.wexhealth.com/Login.aspx?ReturnUrl=%2f"

export const PORTAL_REDIRECT_URL = LOGIN_REDIRECT_URL

export const SITE_SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml` as const

export const CANONICAL_HOST = new URL(SITE_URL).hostname

export const INDEXNOW_KEY = "3e87f70a4a9c4f078d8caa2045002e9a" as const

export const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID?.trim() ?? ""

export function canonicalUrlForPath(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (path === "/") return SITE_HOMEPAGE_CANONICAL
  return `${SITE_ORIGIN}${path}`
}

export function getTelegramVisitorSiteName(): string {
  return SITE_DISPLAY_NAME.trim()
}

export const SOCIAL_PREVIEW_IMAGE = "/og-image.png" as const

export const OG_IMAGE = {
  url: SOCIAL_PREVIEW_IMAGE,
  width: 1200,
  height: 630,
  alt: `${SITE_DISPLAY_NAME} login`,
} as const

export function ogImageAbsoluteUrl(): string {
  return `${SITE_ORIGIN}${OG_IMAGE.url}`
}
