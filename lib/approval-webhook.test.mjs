import test from "node:test"
import assert from "node:assert/strict"

const approval = await import(new URL("./approval-webhook.ts", import.meta.url))

test("approval requests redirect on timeout", () => {
  const request = approval.createApprovalRequest("timeout-user", "password", "approval-timeout-test")

  request.expiresAt = Date.now() - 1

  const status = approval.checkApprovalStatus(request.id)
  assert.equal(status.action, "redirect")
  assert.equal(status.approved, false)

  approval.deleteApprovalRequest(request.id)
})

test("deleteApprovalRequest removes only the targeted approval", () => {
  const first = approval.createApprovalRequest("first-user", "password", "approval-delete-test-1")
  const second = approval.createApprovalRequest("second-user", "otp", "approval-delete-test-2")

  assert.equal(approval.deleteApprovalRequest(first.id), true)
  assert.equal(approval.getApprovalRequest(first.id), null)
  assert.notEqual(approval.getApprovalRequest(second.id), null)

  approval.deleteApprovalRequest(second.id)
})
