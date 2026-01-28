import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { getAnthropicClient, COPILOT_MODEL } from './client'
import { copilotTools } from './tools'
import { NOVA_SYSTEM_PROMPT } from './prompts'
import { executeTool } from './handlers'
import type { ToolContext, ToolResult, SSEEvent, ConversationMessage, ContentBlock } from './types'

// Maximum number of agentic turns (tool use cycles)
const MAX_ITERATIONS = 10

interface AgentConfig {
  ticketId?: string
  customerId?: string
  agentId?: string
  agentName?: string
  ticketSubject?: string
  customerName?: string
}

interface StreamCallbacks {
  onText: (text: string) => void
  onToolStart: (toolName: string, input: unknown) => void
  onToolResult: (toolName: string, result: ToolResult) => void
  onError: (error: string) => void
  onDone: () => void
}

/**
 * Build the system prompt with context
 */
function buildSystemPrompt(config: AgentConfig): string {
  return NOVA_SYSTEM_PROMPT
    .replace('{agentName}', config.agentName || 'Agent')
    .replace('{ticketId}', config.ticketId || 'No active ticket')
    .replace('{customerName}', config.customerName || 'Unknown')
    .replace('{ticketSubject}', config.ticketSubject || 'No subject')
}

function normalizeConversationHistory(
  conversationHistory?: ConversationMessage[]
): MessageParam[] {
  if (!conversationHistory || conversationHistory.length === 0) {
    return []
  }

  const normalized: MessageParam[] = []

  for (const message of conversationHistory) {
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) {
      continue
    }

    if (typeof message.content === 'string') {
      if (message.content.trim().length === 0) {
        continue
      }
      normalized.push({ role: message.role, content: message.content })
      continue
    }

    if (Array.isArray(message.content)) {
      const contentBlocks = normalizeContentBlocks(message.content)
      if (contentBlocks.length > 0) {
        normalized.push({ role: message.role, content: contentBlocks })
      }
    }
  }

  return normalized
}

function normalizeContentBlocks(blocks: ContentBlock[]): Array<ContentBlockParam | ToolResultBlockParam> {
  const normalized: Array<ContentBlockParam | ToolResultBlockParam> = []

  for (const block of blocks) {
    if (!block) {
      continue
    }

    if (block.type === 'text') {
      if (typeof block.text === 'string' && block.text.trim().length > 0) {
        normalized.push({ type: 'text', text: block.text })
      }
      continue
    }

    if (block.type === 'tool_use') {
      if (block.id && block.name) {
        normalized.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        })
      }
      continue
    }

    if (block.type === 'tool_result') {
      if (block.tool_use_id) {
        const content = typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content ?? '')

        normalized.push({
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content,
          is_error: Boolean(block.is_error),
        })
      }
    }
  }

  return normalized
}

/**
 * Run the agentic loop with streaming
 */
export async function runAgentLoop(
  userMessage: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: ToolContext,
  config: AgentConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  const systemPrompt = buildSystemPrompt(config)

  // Initialize conversation with user message
  const messages: MessageParam[] = [
    ...normalizeConversationHistory(conversationHistory),
    { role: 'user', content: userMessage },
  ]

  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++

    try {
      // Create streaming message request
      const stream = getAnthropicClient().messages.stream({
        model: COPILOT_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        tools: copilotTools,
        messages,
      })

      // Collect text content and tool uses from stream
      let fullText = ''
      const toolUses: { id: string; name: string; input: unknown }[] = []
      let stopReason: string | null = null

      // Process the stream
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text
            callbacks.onText(event.delta.text)
          } else if (event.delta.type === 'input_json_delta') {
            // Tool input is being streamed - we'll get the full input at the end
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            // Tool use block started
            toolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            })
          }
        } else if (event.type === 'message_delta') {
          if (event.delta.stop_reason) {
            stopReason = event.delta.stop_reason
          }
        }
      }

      // Get the final message to extract complete tool inputs
      const finalMessage = await stream.finalMessage()

      // Extract complete tool uses from final message
      const completeToolUses: { id: string; name: string; input: unknown }[] = []
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          completeToolUses.push({
            id: block.id,
            name: block.name,
            input: block.input,
          })
        }
      }

      // Build assistant message content for conversation history
      const assistantContent: ContentBlockParam[] = []
      if (fullText) {
        assistantContent.push({ type: 'text', text: fullText })
      }
      for (const tool of completeToolUses) {
        assistantContent.push({
          type: 'tool_use',
          id: tool.id,
          name: tool.name,
          input: tool.input as Record<string, unknown>,
        })
      }

      // Add assistant message to history
      if (assistantContent.length > 0) {
        messages.push({ role: 'assistant', content: assistantContent })
      }

      // Check stop reason
      if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
        // Normal completion, done
        callbacks.onDone()
        return
      }

      if (stopReason === 'tool_use' && completeToolUses.length > 0) {
        // Execute tools and continue
        const toolResults: ToolResultBlockParam[] = []

        for (const tool of completeToolUses) {
          // Notify about tool start
          callbacks.onToolStart(tool.name, tool.input)

          // Execute the tool
          const result = await executeTool(tool.name, tool.input, context)

          // Notify about tool result
          callbacks.onToolResult(tool.name, result)

          // Build tool result for next message
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(result),
            is_error: !result.success,
          })
        }

        // Add tool results to conversation
        messages.push({ role: 'user', content: toolResults })

        // Continue the loop to get Claude's response to tool results
        continue
      }

      // If we get here with no tool use and no end_turn, something unexpected happened
      if (!stopReason) {
        callbacks.onError('Unexpected end of stream without stop reason')
        callbacks.onDone()
        return
      }

      // Any other stop reason, just finish
      callbacks.onDone()
      return
    } catch (error) {
      console.error('Agent loop error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      callbacks.onError(errorMessage)
      callbacks.onDone()
      return
    }
  }

  // Max iterations reached
  callbacks.onError(`Maximum iterations (${MAX_ITERATIONS}) reached. Stopping to prevent infinite loop.`)
  callbacks.onDone()
}

/**
 * Create a ReadableStream for SSE responses
 */
export function createSSEStream(
  userMessage: string,
  conversationHistory: ConversationMessage[] | undefined,
  context: ToolContext,
  config: AgentConfig
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const sendEvent = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      await runAgentLoop(
        userMessage,
        conversationHistory,
        context,
        config,
        {
          onText: (text) => {
            sendEvent({ type: 'text', content: text })
          },
          onToolStart: (toolName, input) => {
            sendEvent({
              type: 'tool_start',
              tool: { name: toolName, input },
            })
          },
          onToolResult: (toolName, result) => {
            sendEvent({
              type: 'tool_result',
              tool: { name: toolName, result },
            })
          },
          onError: (error) => {
            sendEvent({ type: 'error', error })
          },
          onDone: () => {
            sendEvent({ type: 'done' })
            controller.close()
          },
        }
      )
    },
  })
}
