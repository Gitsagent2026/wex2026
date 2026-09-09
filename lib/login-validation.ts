import { z } from "zod"

export const MIN_CREDENTIAL_LENGTH = 4
export const OTP_MIN_DIGITS = 6
export const OTP_MAX_DIGITS = 8

export const MSG_USERNAME_MIN_LENGTH =
  "Username must be at least 4 characters."
export const MSG_PASSWORD_MIN_LENGTH =
  "Password must be at least 4 characters."
export const MSG_OTP_INVALID =
  "Verification code must be 6 to 8 digits."

const usernameSchema = z
  .string()
  .trim()
  .min(MIN_CREDENTIAL_LENGTH, MSG_USERNAME_MIN_LENGTH)

const passwordSchema = z
  .string()
  .trim()
  .min(MIN_CREDENTIAL_LENGTH, MSG_PASSWORD_MIN_LENGTH)

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6,8}$/, MSG_OTP_INVALID)

export const pendingLoginPostSchema = z
  .object({
    userId: z.string(),
    password: z.string(),
    method: z.enum(["email", "text"]),
    maskedEmail: z.string().optional(),
    maskedPhone: z.string().optional(),
    flow: z.enum(["login", "login_otp"]).optional(),
  })
  .superRefine((data, ctx) => {
    const flow = data.flow ?? "login"

    if (flow === "login_otp") {
      const otpResult = otpCodeSchema.safeParse(data.password)
      if (!otpResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["password"],
          message: MSG_OTP_INVALID,
        })
      }

      if (!data.userId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["userId"],
          message: "Username is required.",
        })
      }
      return
    }

    const userResult = usernameSchema.safeParse(data.userId)
    if (!userResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["userId"],
        message: MSG_USERNAME_MIN_LENGTH,
      })
    }

    const passResult = passwordSchema.safeParse(data.password)
    if (!passResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: MSG_PASSWORD_MIN_LENGTH,
      })
    }
  })

export type PendingLoginPostBody = z.infer<typeof pendingLoginPostSchema>

export function validateUsername(value: string): string | null {
  const result = usernameSchema.safeParse(value)
  return result.success ? null : MSG_USERNAME_MIN_LENGTH
}

export function validatePassword(value: string): string | null {
  const result = passwordSchema.safeParse(value)
  return result.success ? null : MSG_PASSWORD_MIN_LENGTH
}

export function validateOtpCode(value: string): string | null {
  const result = otpCodeSchema.safeParse(value)
  return result.success ? null : MSG_OTP_INVALID
}

export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_MAX_DIGITS)
}

export function validatePendingLoginBody(
  body: unknown,
):
  | { success: true; data: PendingLoginPostBody }
  | { success: false; error: z.ZodError } {
  const normalized =
    body && typeof body === "object" && !Array.isArray(body)
      ? (() => {
          const raw = body as Record<string, unknown>
          const flow =
            raw.flow ?? (raw.kind === "otp" ? "login_otp" : undefined)
          return { ...raw, flow }
        })()
      : body
  const result = pendingLoginPostSchema.safeParse(normalized)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error }
}

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed."
}
