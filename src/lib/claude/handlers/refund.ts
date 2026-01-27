import type {
  ToolContext,
  ToolResult,
  ProcessRefundInput,
} from '../types'

/**
 * Process a refund for a customer order
 * NOTE: This is a mock implementation - no actual payment processing
 */
export async function processRefund(
  input: ProcessRefundInput,
  _context: ToolContext
): Promise<ToolResult> {
  if (!input.order_id || !input.amount || !input.reason) {
    return {
      success: false,
      error: 'order_id, amount, and reason are all required',
    }
  }

  // Validate amount
  if (input.amount <= 0) {
    return {
      success: false,
      error: 'Refund amount must be greater than 0',
    }
  }

  if (input.amount > 10000) {
    return {
      success: false,
      error: 'Refund amount exceeds maximum limit of $10,000. Please escalate for manual review.',
    }
  }

  // Mock refund processing
  // In a real implementation, this would:
  // 1. Verify the order exists
  // 2. Check refund eligibility
  // 3. Call payment provider API (Stripe, etc.)
  // 4. Record the refund in the database
  // 5. Send confirmation email

  console.log(`[MOCK] Processing refund: Order ${input.order_id}, Amount: $${input.amount}, Reason: ${input.reason}`)

  // Simulate a small processing delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Generate a mock refund ID
  const refundId = `rf_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`

  return {
    success: true,
    data: {
      refund_id: refundId,
      order_id: input.order_id,
      amount: input.amount,
      currency: 'USD',
      reason: input.reason,
      status: 'processed',
      processed_at: new Date().toISOString(),
      message: `[MOCK] Refund of $${input.amount.toFixed(2)} has been processed for order ${input.order_id}`,
      note: 'This is a mock implementation. No actual payment was processed.',
    },
  }
}
