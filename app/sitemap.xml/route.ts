import { NextRequest, NextResponse } from "next/server"
import { SITE_ORIGIN, SITE_CONTENT_UPDATED_AT } from "@/lib/site-url"

/**
 * Dynamic XML Sitemap
 * - Only index landing page (/)
 * - Exclude API routes (/api/*)
 * - Exclude internal pages (forgot password, verification, etc)
 */

export async function GET(request: NextRequest) {
  const pages = [
    {
      path: "/",
      changefreq: "daily",
      priority: 1.0,
      lastmod: SITE_CONTENT_UPDATED_AT,
    },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${SITE_ORIGIN}${page.path}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
