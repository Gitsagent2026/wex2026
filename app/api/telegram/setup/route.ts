import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const FALLBACK_BOT_TOKEN = '8985470259:AAEP5YHeX8sSz65Pfb3aoJv8Re61F10AONg'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || FALLBACK_BOT_TOKEN
}

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const botToken = getTelegramBotToken()
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return response.json().catch(() => ({}))
}

/**
 * One-time webhook registration + diagnostics.
 *
 * GET /api/telegram/setup          -> shows current webhook info (getWebhookInfo)
 * GET /api/telegram/setup?set=1    -> registers THIS deployment's /api/telegram/webhook
 *                                     URL with Telegram (setWebhook), then returns info
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const shouldSet = url.searchParams.get('set') === '1'

    const webhookUrl = `${url.origin}/api/telegram/webhook`

    let setResult: unknown = null
    if (shouldSet) {
      setResult = await callTelegram('setWebhook', {
        url: webhookUrl,
        allowed_updates: ['callback_query', 'message'],
        drop_pending_updates: true,
      })
    }

    const info = await callTelegram('getWebhookInfo', {})

    return NextResponse.json(
      {
        success: true,
        webhookUrl,
        registered: shouldSet ? setResult : 'pass ?set=1 to register',
        webhookInfo: info,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Telegram setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Telegram setup failed' },
      { status: 500 }
    )
  }
}
