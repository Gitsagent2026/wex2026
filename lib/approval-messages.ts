import { LOGIN_REDIRECT_URL } from "@/lib/site-url"

export const POLL_MS = 1500
export const APPROVAL_TIMEOUT_MS = 90_000

export const MSG_UNABLE_VERIFY_TIME =
  "We are unable to verify you right now."

export const MSG_UNABLE_REACH_VERIFICATION =
  "Unable to reach verification. Please try again."

export const OTP_CODE_ERROR_TEXT =
  "The code you entered is incorrect or has expired."

export const OTP_INVALID_LENGTH_TEXT =
  "Please enter a valid 6- or 8-digit verification code."

export const LOGIN_DENIED_ERROR_TEXT =
  "The username or password you entered is incorrect. Please try again."

/** Alias used by kit-parity gate UX (?loginDenied=1). */
export const MSG_INCORRECT = LOGIN_DENIED_ERROR_TEXT

/** Re-export final portal URL for client redirects / docs. */
export { LOGIN_REDIRECT_URL }

/** @deprecated Prefer LOGIN_REDIRECT_URL from site-url. */
export const WEX_LOGIN_REDIRECT_URL = LOGIN_REDIRECT_URL

/** Minimum resend button loading duration (kit). */
export const OTP_RESEND_LOADING_MS = 2_000

/** Seconds before resend is clickable again (kit). */
export const OTP_RESEND_COOLDOWN_SEC = 30

export function isValidOtpCode(code: string): boolean {
  const digits = code.replace(/\D/g, "")
  return digits.length === 6 || digits.length === 8
}
