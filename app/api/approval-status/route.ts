import { NextRequest, NextResponse } from "next/server"
import { checkApprovalStatus } from "@/lib/approval-webhook"

/**
 * Client polling endpoint for approval status
 * Frontend polls this to get real-time approval decision
 * 
 * GET /api/approval-status?approvalId=<id>
 * 
 * Response:
 * {
 *   approved: boolean
 *   action?: "approve" | "deny" | "redirect"
 *   message?: string
 *   waitingFor?: number (milliseconds remaining)
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const approvalId = searchParams.get("approvalId")

    if (!approvalId || typeof approvalId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing approvalId parameter" },
        { status: 400 }
      )
    }

    // Check approval status
    const status = checkApprovalStatus(approvalId)

    return NextResponse.json(
      {
        success: true,
        data: status,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Approval status error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Use GET to check approval status" },
    { status: 405 }
  )
}
