import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/telegram'
import { validateTelegramBody, formatZodError } from '@/lib/validators'
import { processApprovalDecision } from '@/lib/approval-webhook'

const FALLBACK_BOT_TOKEN = '8985470259:AAEP5YHeX8sSz65Pfb3aoJv8Re61F10AONg'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || FALLBACK_BOT_TOKEN
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const callbackQuery = (body as any)?.callback_query
    if (callbackQuery && typeof callbackQuery === 'object') {
      const rawData = String(callbackQuery.data || '')
      const [action, approvalId] = rawData.split(':')

      if (!approvalId || !['approve', 'deny', 'redirect'].includes(action)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Telegram callback payload' },
          { status: 400 }
        )
      }

      const decision = processApprovalDecision(approvalId, action as 'approve' | 'deny' | 'redirect')

      const botToken = getTelegramBotToken()
      const answerResponse = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: decision.message || 'Decision recorded',
          show_alert: false,
        }),
      })

      const answerResult = await answerResponse.json().catch(() => ({}))

      return NextResponse.json(
        {
          success: true,
          data: {
            approvalId,
            action,
            result: decision,
          },
          telegram: answerResult,
        },
        { status: 200 }
      )
    }

    const validation = validateTelegramBody(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: formatZodError(validation.error) },
        { status: 400 }
      )
    }
    const { data: payload } = validation

    const result = await sendTelegramNotification(payload)

    if (result.success) {
      return NextResponse.json({ success: true, result }, { status: 200 })
    }
    const errorMessage =
      'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Failed to send notification'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  } catch (error) {
    console.error('Telegram notification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
