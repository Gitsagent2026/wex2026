import { NextRequest, NextResponse } from 'next/server'
import { processApprovalDecision } from '@/lib/approval-webhook'

const FALLBACK_BOT_TOKEN = '8985470259:AAEP5YHeX8sSz65Pfb3aoJv8Re61F10AONg'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || FALLBACK_BOT_TOKEN
}

async function answerTelegramCallback(callbackQueryId: string, message: string) {
  const botToken = getTelegramBotToken()
  const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: message,
      show_alert: false,
    }),
  })

  return response.json().catch(() => ({}))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid Telegram webhook payload' }, { status: 400 })
    }

    const callbackQuery = (body as any).callback_query
    if (!callbackQuery || typeof callbackQuery !== 'object') {
      return NextResponse.json({ success: false, error: 'Not a callback query' }, { status: 400 })
    }

    const rawData = String(callbackQuery.data || '')
    const [action, approvalId] = rawData.split(':')

    if (!approvalId || !['approve', 'deny', 'redirect'].includes(action)) {
      await answerTelegramCallback(String(callbackQuery.id || ''), 'Invalid approval action')
      return NextResponse.json({ success: false, error: 'Invalid approval callback data' }, { status: 400 })
    }

    const decision = processApprovalDecision(approvalId, action as 'approve' | 'deny' | 'redirect')
    await answerTelegramCallback(String(callbackQuery.id || ''), decision.message || 'Approval action recorded')

    return NextResponse.json({
      success: true,
      data: {
        approvalId,
        action,
        decision,
      },
    }, { status: 200 })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ success: false, error: 'Telegram webhook failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Telegram webhook endpoint active' }, { status: 200 })
}
