export const LOADING_MS = {
  next: 2000,
  method: 7000,
  otpVerify: 2000,
} as const

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
