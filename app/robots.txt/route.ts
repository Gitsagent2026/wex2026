import { NextRequest, NextResponse } from "next/server"
import { SITE_ORIGIN } from "@/lib/site-url"

export async function GET(request: NextRequest) {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /error

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`

  return new NextResponse(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
