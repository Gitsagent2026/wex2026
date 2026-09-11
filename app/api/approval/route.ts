import { NextRequest, NextResponse } from "next/server"
import { processApprovalDecision, getApprovalRequest } from "@/lib/approval-webhook"

/**
 * Webhook endpoint for Telegram button callbacks
 * Receives approval decisions from admin via Telegram inline buttons
 * 
 * POST /api/approval
 * Body: { approvalId: string, action: "approve" | "deny" | "redirect" }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { approvalId, action } = body

    // Validate inputs
    if (!approvalId || typeof approvalId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid approvalId" },
        { status: 400 }
      )
    }

    if (!["approve", "deny", "redirect"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be: approve, deny, or redirect" },
        { status: 400 }
      )
    }

    // Check if approval exists
    const approval = await getApprovalRequest(approvalId)
    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval request not found or expired" },
        { status: 404 }
      )
    }

    // Process the decision
    const result = await processApprovalDecision(approvalId, action as "approve" | "deny" | "redirect")

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

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Use POST to submit approval decisions" },
    { status: 405 }
  )
}
