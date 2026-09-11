import { NextRequest, NextResponse } from "next/server"
import {
  createApprovalRequest,
  deleteApprovalRequest,
  processApprovalDecision,
  getApprovalRequest,
} from "@/lib/approval-webhook"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function isSameOriginRequest(request: NextRequest): boolean {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get("origin")
  if (origin) {
    return origin === requestOrigin
  }

  const referer = request.headers.get("referer")
  return typeof referer === "string" && referer.startsWith(`${requestOrigin}/`)
}

/**
 * Approval endpoint
 *
 * POST /api/approval
 *
 * Two modes:
 *  1) Register:  { username: string, stage: "password"|"otp", approvalId?: string }
 *     -> creates the approval server-side (called when the page starts awaiting approval)
 *  2) Decide:    { approvalId: string, action: "approve"|"deny"|"redirect" }
 *     -> records an admin decision (webhook/manual)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    const { approvalId, action, username, stage } = body as Record<string, unknown>

    // Mode 1: register a new approval request
    if (typeof username === "string" && (stage === "password" || stage === "otp")) {
      const approval = createApprovalRequest(
        username,
        stage,
        typeof approvalId === "string" ? approvalId : undefined
      )
      return NextResponse.json(
        {
          success: true,
          data: {
            approvalId: approval.id,
            username: approval.username,
            stage: approval.stage,
            expiresAt: approval.expiresAt,
          },
        },
        { status: 200 }
      )
    }

    // Mode 2: record a decision
    if (!approvalId || typeof approvalId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid approvalId" },
        { status: 400 }
      )
    }

    if (typeof action !== "string" || !["approve", "deny", "redirect"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be: approve, deny, or redirect" },
        { status: 400 }
      )
    }

    const approval = getApprovalRequest(approvalId)
    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval request not found or expired" },
        { status: 404 }
      )
    }

    const result = processApprovalDecision(approvalId, action as "approve" | "deny" | "redirect")

    return NextResponse.json(
      {
        success: true,
        data: {
          approvalId,
          action,
          username: approval.username,
          stage: approval.stage,
          message: result.message,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Approval webhook error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to submit approval decisions" },
    { status: 405 }
  )
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const approvalId =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).approvalId === "string"
        ? (body as Record<string, string>).approvalId
        : ""

    if (!approvalId) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid approvalId" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: true, deleted: deleteApprovalRequest(approvalId) },
      { status: 200 }
    )
  } catch (error) {
    console.error("Approval cleanup error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
