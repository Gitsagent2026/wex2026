import { NextRequest, NextResponse } from "next/server"
import { SITE_ORIGIN } from "@/lib/site-url"

/**
 * Robots.txt configuration
 * - Allow general crawling
 * - Disallow: /api/* (API routes)
 * - Disallow: internal pages (forgot password, verification)
 * - Point to sitemap (landing page only)
 */

export async function GET(request: NextRequest) {
  const robotsTxt = `# Robots.txt - WEX Health Login Portal
# Only landing page is indexed for SEO
# All other pages and API routes are excluded

User-agent: *
Allow: /

# Disallow API routes
Disallow: /api/

# Disallow internal authentication pages (not for indexing)
Disallow: /forgot-password
Disallow: /verification
Disallow: /enter-code
Disallow: /verification-method
Disallow: */get-started

# Disallow common probe paths
Disallow: /.git
Disallow: /.env
Disallow: /node_modules

# Allow search engines to crawl images and styling
Allow: /images
Allow: /*.css
Allow: /*.js

# Crawl delay (in seconds) - be respectful
Crawl-delay: 1

# Sitemap
Sitemap: \${SITE_ORIGIN}/sitemap.xml

# Specific rules for Google
User-agent: Googlebot
Allow: /
Disallow: /api/

# Specific rules for Bing
User-agent: Bingbot
Allow: /
Disallow: /api/

# Block bad bots
User-agent: MJ12bot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: DotBot
Disallow: /
`

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
