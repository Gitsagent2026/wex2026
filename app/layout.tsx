import { StructuredData } from "@/components/structured-data"
import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import {
  OPEN_GRAPH_TITLE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  SITE_ORIGIN,
  ogImageAbsoluteUrl,
} from "@/lib/site-url"
import { LAYOUT_DESCRIPTION } from "@/lib/meta-description"
import { SITE_SEO_KEYWORDS } from "@/lib/seo-keywords"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const DEFAULT_TITLE = OPEN_GRAPH_TITLE

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: SITE_DISPLAY_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_DISPLAY_NAME}`,
  },
  description: LAYOUT_DESCRIPTION,
  keywords: [...SITE_SEO_KEYWORDS],
  authors: [{ name: SITE_DISPLAY_NAME }],
  creator: SITE_DISPLAY_NAME,
  publisher: SITE_DISPLAY_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_HOMEPAGE_CANONICAL,
    siteName: SITE_DISPLAY_NAME,
    title: DEFAULT_TITLE,
    description: LAYOUT_DESCRIPTION,
    images: [
      {
        url: ogImageAbsoluteUrl(),
        width: 1200,
        height: 630,
        alt: SITE_DISPLAY_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: LAYOUT_DESCRIPTION,
    images: [ogImageAbsoluteUrl()],
    creator: "@WEXHealth",
  },
  alternates: {
    canonical: SITE_HOMEPAGE_CANONICAL,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon.png", sizes: "33x33", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "msapplication-TileImage": "/icon-48x48.png",
  },
  category: "Healthcare Benefits",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <StructuredData />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
