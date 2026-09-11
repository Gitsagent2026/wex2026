import { NextRequest, NextResponse } from 'next/server'
import { sendTelegramNotification } from '@/lib/telegram'
import { validateTelegramBody, formatZodError } from '@/lib/validators'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
