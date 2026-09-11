import { NextRequest, NextResponse } from "next/server"

/**
 * Middleware for:
 * 1. Multi-domain canonical URL handling
 * 2. Geolocation-based access control (USA-only with search engine bypass)
 */

const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN?.trim() || "myhealthbenefitsbofa.com"
const SECONDARY_DOMAIN = "www.benefit-wexhealth.com"
const ALLOWED_DOMAINS = [PRIMARY_DOMAIN, SECONDARY_DOMAIN]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const pathname = request.nextUrl.pathname

  // Extract domain without port
  const domain = hostname.split(":")[0]

  // Allow API routes and other static assets to pass through
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/public/") ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // ===== GEOLOCATION & SEARCH ENGINE BLOCKING =====
  const referrer = request.headers.get("referer") || ""
  const userAgent = request.headers.get("user-agent") || ""

  // Search engine domains
  const searchEngines = [
    "google.com",
    "bing.com",
    "baidu.com",
    "yandex.com",
    "duckduckgo.com",
    "ecosia.org",
    "search.yahoo.com",
  ]

  // Search engine bots
  const searchBots = [
    "Googlebot",
    "Bingbot",
    "Slurp",
    "DuckDuckBot",
    "Baiduspider",
    "YandexBot",
    "MJ12bot",
  ]

  // Check if traffic is from search engine
  const isFromSearchEngine = searchEngines.some(engine => referrer.includes(engine))
  const isSearchBot = searchBots.some(bot => userAgent.includes(bot))

  // Get geolocation from Vercel
  const country = request.geo?.country || ""

  // Get Cloudflare country if available
  const cfCountry = request.headers.get("cf-ipcountry") || ""

  // Determine if user is from USA
  const isUSA = country === "US" || cfCountry === "US"

  // Redirect to error page if:
  // - Not from USA AND
  // - Not from search engine AND
  // - Not a search bot AND
  // - Not already on error page
  if (!isUSA && !isFromSearchEngine && !isSearchBot && pathname !== "/error") {
    return NextResponse.redirect(new URL("/error", request.url))
  }

  // ===== CANONICAL URL HANDLING =====
  // Add canonical URL header for SEO
  const response = NextResponse.next()
  response.headers.set(
    "Link",
    `<${protocol}://${PRIMARY_DOMAIN}${pathname}>; rel="canonical"`
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon|sitemap|robots).*)",
  ],
}
