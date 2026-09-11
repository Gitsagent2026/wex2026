import { NextRequest, NextResponse } from 'next/server'
import { processApprovalDecision } from '@/lib/approval-webhook'

function getTelegramBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
}

async function answerTelegramCallback(botToken: string, callbackQueryId: string, message: string) {
  if (!callbackQueryId) return null
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

async function editTelegramDecisionMessage(
  botToken: string,
  callbackQueryMessage: any,
  action: 'approve' | 'deny' | 'redirect',
) {
  const chatId = callbackQueryMessage?.chat?.id
  const messageId = callbackQueryMessage?.message_id
  if (!chatId || !messageId) return null

  const text = action === 'approve' ? '✅ Approved' : action === 'deny' ? '❌ Denied' : '🔄 Redirected'
  const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: { inline_keyboard: [] },
    }),
  })

  return response.json().catch(() => ({}))
}

export async function POST(request: NextRequest) {
  let callbackQueryId = ''
  let callbackMessage = 'Unable to process callback'
  let botToken = ''

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid Telegram webhook payload' }, { status: 400 })
    }

    const callbackQuery = (body as any).callback_query
    if (!callbackQuery || typeof callbackQuery !== 'object') {
      return NextResponse.json({ success: false, error: 'Not a callback query' }, { status: 400 })
    }

    callbackQueryId = String(callbackQuery.id || '')
    botToken = getTelegramBotToken() || ''

    if (!botToken) {
      callbackMessage = 'Telegram bot is misconfigured'
      return NextResponse.json({ success: false, error: 'Telegram bot token is not configured' }, { status: 500 })
    }

    const rawData = String(callbackQuery.data || '')
    const [action, approvalId] = rawData.split(':')

    if (!approvalId || !['approve', 'deny', 'redirect'].includes(action)) {
      callbackMessage = 'Invalid approval action'
      return NextResponse.json({ success: false, error: 'Invalid approval callback data' }, { status: 400 })
    }

    const decision = await processApprovalDecision(approvalId, action as 'approve' | 'deny' | 'redirect')
    callbackMessage = decision.message || 'Approval action recorded'

    if (!decision.action) {
      return NextResponse.json({ success: false, error: decision.message || 'Approval request not found' }, { status: 404 })
    }

    await editTelegramDecisionMessage(botToken, callbackQuery.message, decision.action)

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
    callbackMessage = 'Telegram webhook failed'
    return NextResponse.json({ success: false, error: 'Telegram webhook failed' }, { status: 500 })
  } finally {
    if (botToken && callbackQueryId) {
      await answerTelegramCallback(botToken, callbackQueryId, callbackMessage).catch((error) => {
        console.error('Failed to answer Telegram callback:', error)
      })
    }
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Telegram webhook endpoint active' }, { status: 200 })
}
