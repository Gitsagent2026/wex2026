/**
 * Multi-domain canonical URL configuration
 * Supports: gebreezebenefitsaccount.com (primary) and www.gebreezebenefitsaccount.com (secondary)
 * All pages canonical to gebreezebenefitsaccount.com
 */

// Get primary domain from environment, default to gebreezebenefitsaccount.com
const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN?.trim() || "gebreezebenefitsaccount.com"
const SECONDARY_DOMAIN = "www.gebreezebenefitsaccount.com"

export const SITE_URL = `https://${PRIMARY_DOMAIN}`

export const SITE_DISPLAY_NAME = "GaBreeze" as const

export const OPEN_GRAPH_TITLE =
  "GaBreeze Benefits Sign-In | Employee Benefits Access" as const

export const DEFAULT_SITE_TITLE = OPEN_GRAPH_TITLE

export const SITE_ORIGIN = `https://${PRIMARY_DOMAIN}` as const

/** Bump when homepage SEO copy changes (sitemap lastmod). */
export const SITE_CONTENT_UPDATED_AT = "2026-09-11T15:30:00.000Z"

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

/**
 * Domains to accept requests from (both primary and secondary)
 */
export const ALLOWED_DOMAINS = [PRIMARY_DOMAIN, SECONDARY_DOMAIN]

/**
 * Canonical URL builder - all paths point to primary domain
 */
export function canonicalUrlForPath(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (path === "/") return SITE_HOMEPAGE_CANONICAL
  return `${SITE_ORIGIN}${path}`
}

/**
 * Generate alternate links for multi-domain setup
 */
export function getAlternateLinks() {
  return [
    {
      hrefLang: "en",
      href: SITE_HOMEPAGE_CANONICAL,
    },
  ]
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

/**
 * Multi-domain configuration
 * Used for robots.txt, sitemap, and canonical URL generation
 */
export const MULTI_DOMAIN_CONFIG = {
  primary: PRIMARY_DOMAIN,
  secondary: SECONDARY_DOMAIN,
  canonical_base: SITE_ORIGIN,
  allowed_domains: ALLOWED_DOMAINS,
}
