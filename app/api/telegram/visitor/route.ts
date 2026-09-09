import { NextRequest, NextResponse } from "next/server"
import { logActivity } from "@/lib/activity-logger"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { enrichIpGeo } from "@/lib/ip-geolocation"
import { getReferrerLabelForNotification } from "@/lib/referrer-display"
import { getTelegramVisitorSiteName, SITE_ORIGIN } from "@/lib/site-url"
import { sendVisitorNotification, type VisitorTelegramData } from "@/lib/telegram"
import { parseVisitorOs } from "@/lib/parse-visitor-os"
import { formatVisitorLocalTime, formatVisitorUtcTime } from "@/lib/visitor-times"

type ClientBody = {
  userAgent?: string
  uaModel?: string
  screen?: string
  language?: string
  referrer?: string
  pageUrl?: string
  website?: string
}

const UNKNOWN = "Unknown"

function joinLocation(parts: Array<string | null | undefined>): string {
  const values = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter((part) => part.length > 0)

  return values.length > 0 ? values.join(", ") : UNKNOWN
}

function getCountryName(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || countryCode
  } catch {
    return countryCode
  }
}

function getHeaderGeoData(request: NextRequest) {
  const countryCode = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || null
  const countryName = countryCode ? getCountryName(countryCode) : null
  const region = request.headers.get("x-vercel-ip-country-region")?.trim() || null
  const city = request.headers.get("x-vercel-ip-city")?.trim() || null
  const timezone = request.headers.get("x-vercel-ip-timezone")?.trim() || null

  return {
    location: joinLocation([city, region, countryName]),
    timezone: timezone || UNKNOWN,
    countryCode,
  }
}

async function handleVisitor(request: NextRequest) {
  const body = (await request.json()) as ClientBody
  const ua = body.userAgent ?? request.headers.get("user-agent") ?? ""
  const uaModel =
    body.uaModel?.trim() ||
    request.headers.get("sec-ch-ua-model")?.replace(/^"|"$/g, "").trim() ||
    undefined

  const clientIp = getClientIpFromRequest(request)
  const headerGeo = getHeaderGeoData(request)
  const geo = await enrichIpGeo(clientIp)
  const mergedCountryCode = headerGeo.countryCode || geo.countryCode
  const mergedLocation = headerGeo.location !== UNKNOWN ? headerGeo.location : geo.location
  const mergedTimezone = headerGeo.timezone !== UNKNOWN ? headerGeo.timezone : geo.timezone

  const ipForMessage = clientIp || geo.ip || UNKNOWN

  const rawReferrer = body.referrer?.trim() || "Direct"
  const referrerLabel = getReferrerLabelForNotification(rawReferrer)
  const pageUrlRaw = body.pageUrl?.trim()
  const pageUrl =
    pageUrlRaw && /^https?:\/\//i.test(pageUrlRaw) ? pageUrlRaw : SITE_ORIGIN

  const now = new Date()
  const tz = mergedTimezone?.trim() || "UTC"
  const localTime = formatVisitorLocalTime(now, tz)
  const utcTime = formatVisitorUtcTime(now)

  const siteName = body.website?.trim() || getTelegramVisitorSiteName()
  const osInfo = parseVisitorOs(ua, { uaModel })
  const payload: VisitorTelegramData = {
    siteName,
    location:
      mergedLocation !== UNKNOWN
        ? mergedLocation
        : mergedCountryCode
          ? getCountryName(mergedCountryCode)
          : UNKNOWN,
    ip: ipForMessage,
    timezone: mergedTimezone,
    isp: geo.isp,
    asn: geo.asn,
    org: geo.org,
    osLabel: osInfo.label,
    deviceLabel: osInfo.device,
    userAgent: ua || UNKNOWN,
    screen: body.screen ?? UNKNOWN,
    language: body.language ?? UNKNOWN,
    referrer: referrerLabel,
    pageUrl,
    localTime,
    utcTime,
  }

  await logActivity({
    type: "visitor",
    timestamp: now.toISOString(),
    data: payload,
  })

  const telegramSent = await sendVisitorNotification(payload)
  return NextResponse.json({ ok: true, telegramSent })
}

export async function POST(request: NextRequest) {
  try {
    return await handleVisitor(request)
  } catch (error) {
    console.error("Error sending visitor notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
