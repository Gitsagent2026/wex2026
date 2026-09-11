import { NextRequest, NextResponse } from 'next/server'
import { processApprovalDecision, getApprovalRequest } from '@/lib/approval-webhook'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || ''
}

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const botToken = getTelegramBotToken()
  if (!botToken) {
    return {}
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await response.json().catch(() => ({}))
  } catch (error) {
    console.error(`Telegram ${method} failed:`, error)
    return {}
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 })
    }

    const callbackQuery = (body as any).callback_query
    if (!callbackQuery || typeof callbackQuery !== 'object') {
      return NextResponse.json({ success: true, ignored: true }, { status: 200 })
    }

    const callbackId = String(callbackQuery.id || '')
    const rawData = String(callbackQuery.data || '')
    const separatorIndex = rawData.indexOf(':')
    const action = separatorIndex >= 0 ? rawData.slice(0, separatorIndex) : rawData
    const approvalId = separatorIndex >= 0 ? rawData.slice(separatorIndex + 1) : ''

    if (!approvalId || !['approve', 'deny', 'redirect'].includes(action)) {
      await callTelegram('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Invalid approval action',
        show_alert: false,
      })
      return NextResponse.json({ success: false, error: 'Invalid approval callback data' }, { status: 200 })
    }

    const approval = getApprovalRequest(approvalId)
    if (!approval) {
      await callTelegram('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Approval request not found or expired',
        show_alert: false,
      })
      return NextResponse.json({ success: false, error: 'Approval request not found or expired' }, { status: 200 })
    }

    const decision = processApprovalDecision(approvalId, action as 'approve' | 'deny' | 'redirect')
    console.log(`[webhook] ${action} for ${approvalId.slice(0, 8)}… -> ${decision.message}`)

    await callTelegram('answerCallbackQuery', {
      callback_query_id: callbackId,
      text: decision.message || 'Approval action recorded',
      show_alert: false,
    })

    const message = callbackQuery.message
    if (message && message.chat && typeof message.message_id === 'number') {
      const decidedLabel = action === 'approve' ? '✅ APPROVED' : action === 'deny' ? '❌ DENIED' : '🔄 REDIRECTED'
      await callTelegram('editMessageReplyMarkup', {
        chat_id: message.chat.id,
        message_id: message.message_id,
        reply_markup: { inline_keyboard: [] },
      })
      if (typeof message.text === 'string' && message.text.length > 0) {
        await callTelegram('editMessageText', {
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: `${message.text}\n\n${decidedLabel}`,
          parse_mode: 'HTML',
        })
      }
    }

    return NextResponse.json({ success: true, data: { approvalId, action, decision } }, { status: 200 })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ success: false, error: 'Telegram webhook failed' }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Telegram webhook endpoint active' }, { status: 200 })
}
