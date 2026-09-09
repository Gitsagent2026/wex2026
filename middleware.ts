import { NextRequest, NextResponse } from "next/server"

/**
 * Middleware for multi-domain canonical URL handling
 * - Accept requests from both domains
 * - Set canonical header to primary domain
 * - Redirect non-canonical requests
 */

const PRIMARY_DOMAIN = process.env.PRIMARY_DOMAIN?.trim() || "myhealthbenefitsbofa.com"
const SECONDARY_DOMAIN = "www.benefit-wexhealth.com"
const ALLOWED_DOMAINS = [PRIMARY_DOMAIN, SECONDARY_DOMAIN]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const protocol = request.headers.get("x-forwarded-proto") || "https"

  // Extract domain without port
  const domain = hostname.split(":")[0]

  // Allow API routes and other requests to pass through
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // If not on primary domain, optionally redirect (or allow both)
  // Uncomment to enforce primary domain only:
  // if (!domain.includes(PRIMARY_DOMAIN)) {
  //   const url = request.nextUrl.clone()
  //   url.host = PRIMARY_DOMAIN
  //   url.protocol = `${protocol}:`
  //   return NextResponse.redirect(url)
  // }

  // Add canonical URL header
  const response = NextResponse.next()
  response.headers.set("Link", `<${protocol}://${PRIMARY_DOMAIN}${request.nextUrl.pathname}>; rel="canonical"`)

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
