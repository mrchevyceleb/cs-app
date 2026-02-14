/**
 * AI Agent Engine
 * Core agentic loop: Claude tool-use loop that iterates until the problem is solved
 *
 * Two exports:
 * - agenticSolve()          — non-streaming, returns AgentResult
 * - agenticSolveStreaming()  — async generator yielding AgentStreamEvent
 */

import Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient, withFallback, getFallbackClient } from '@/lib/claude/client'
import { getAgentConfig } from './config'
import { getAgentSystemPrompt } from './prompts'
import { AGENT_TOOLS, executeTool, type ToolContext } from './tools'
import type { AgentInput, AgentResult, AgentStreamEvent, ToolCallLog } from './types'

function getMaxTokensForChannel(channel: string): number {
  switch (channel) {
    case 'widget':
    case 'portal':
      return 300
    default:
      return 1024
  }
}

/**
 * Non-streaming agentic solve.
 * Loops through tool-use rounds until Claude produces a final text response,
 * escalates, or hits safety limits.
 */
export async function agenticSolve(input: AgentInput): Promise<AgentResult> {
  const config = getAgentConfig()
  const startTime = Date.now()

  const systemPrompt = getAgentSystemPrompt(input.channel)

  // Build initial user message with context
  const userContent = buildInitialMessage(input)

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userContent },
  ]

  // Add conversation history if provided
  if (input.previousMessages && input.previousMessages.length > 0) {
    // Prepend previous messages before the current one
    const historyMessages: Anthropic.MessageParam[] = input.previousMessages.map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }))
    messages.unshift(...historyMessages)
  }

  const toolCallsDetail: ToolCallLog[] = []
  const kbArticleIds: string[] = []
  let webSearchCount = 0
  let totalToolCalls = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let escalationReason: string | undefined
  let escalationSummary: string | undefined

  const toolContext: ToolContext = {
    ticketId: input.ticket.id,
    customerId: input.customer.id,
  }

  // Agentic loop
  for (let round = 0; round < config.maxToolRounds; round++) {
    // Check timeout
    if (Date.now() - startTime > config.timeoutMs) {
      // Return partial response on timeout
      return {
        type: 'timeout',
        content: "I'm still looking into this for you. A team member will follow up shortly with a complete answer.",
        confidence: 0.3,
        kbArticleIds,
        webSearchCount,
        totalToolCalls,
        toolCallsDetail,
        durationMs: Date.now() - startTime,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      }
    }

    const response = await withFallback(client =>
      client.messages.create({
        model: config.model,
        max_tokens: getMaxTokensForChannel(input.channel),
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages,
      })
    )

    totalInputTokens += response.usage?.input_tokens || 0
    totalOutputTokens += response.usage?.output_tokens || 0

    // Check if Claude produced any tool_use blocks
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )

    // If no tool use, Claude is done — return the text response
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      // If there are text blocks, use them as the response
      if (textBlocks.length > 0) {
        const content = textBlocks.map((b) => b.text).join('')
        return {
          type: 'response',
          content,
          confidence: calculateConfidence(toolCallsDetail, kbArticleIds),
          kbArticleIds,
          webSearchCount,
          totalToolCalls,
          toolCallsDetail,
          durationMs: Date.now() - startTime,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        }
      }
    }

    // Execute tool calls
    // Add assistant message with tool use
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      if (totalToolCalls >= config.maxTotalTools) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Tool call limit reached. Please provide your best response with the information gathered so far.',
        })
        continue
      }

      totalToolCalls++
      const toolInput = toolUse.input as Record<string, unknown>

      // Track web search count
      if (toolUse.name === 'search_web') {
        webSearchCount++
        if (webSearchCount > 3) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Maximum web searches (3) reached. Please synthesize what you have.',
          })
          continue
        }
      }

      const { result, log } = await executeTool(
        toolUse.name,
        toolInput,
        toolContext,
        totalToolCalls - 1 // prior tool calls (not counting current)
      )

      toolCallsDetail.push(log)

      // Track KB articles
      if (toolUse.name === 'search_knowledge_base' && !result.startsWith('No knowledge base')) {
        // Extract article IDs from search results if present
        const idMatches = result.match(/ID:\s*([a-f0-9-]+)/gi)
        if (idMatches) {
          kbArticleIds.push(...idMatches.map((m) => m.replace(/ID:\s*/i, '')))
        }
      }

      // Check for escalation
      if (toolUse.name === 'escalate_to_human') {
        try {
          const parsed = JSON.parse(result)
          if (parsed.escalated) {
            escalationReason = parsed.reason
            escalationSummary = parsed.summary
            return {
              type: 'escalation',
              content: `I've connected you with our support team. ${parsed.summary}`,
              confidence: 0.2,
              kbArticleIds,
              webSearchCount,
              totalToolCalls,
              toolCallsDetail,
              durationMs: Date.now() - startTime,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              escalationReason,
              escalationSummary,
            }
          }
        } catch {
          // Not a valid escalation — blocked by the tool, continue loop
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    // Add tool results as user message
    messages.push({ role: 'user', content: toolResults })
  }

  // Max rounds exhausted — ask Claude for a final response without tools
  const finalResponse = await withFallback(client =>
    client.messages.create({
      model: config.model,
      max_tokens: getMaxTokensForChannel(input.channel),
      system: systemPrompt + '\n\nYou have used all your tool rounds. Provide your best response with the information gathered.',
      messages,
    })
  )

  totalInputTokens += finalResponse.usage?.input_tokens || 0
  totalOutputTokens += finalResponse.usage?.output_tokens || 0

  const finalText = finalResponse.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((b) => b.text)
    .join('')

  return {
    type: 'response',
    content: finalText || "I'm still investigating your question. A team member will follow up shortly.",
    confidence: calculateConfidence(toolCallsDetail, kbArticleIds),
    kbArticleIds,
    webSearchCount,
    totalToolCalls,
    toolCallsDetail,
    durationMs: Date.now() - startTime,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  }
}

/**
 * Streaming agentic solve.
 * Tool-use rounds are non-streaming (faster for tool calls).
 * Final response round uses streaming for real-time text deltas.
 */
export async function* agenticSolveStreaming(
  input: AgentInput
): AsyncGenerator<AgentStreamEvent> {
  const config = getAgentConfig()
  const startTime = Date.now()

  const systemPrompt = getAgentSystemPrompt(input.channel)
  const userContent = buildInitialMessage(input)

  const messages: Anthropic.MessageParam[] = []

  // Add conversation history
  if (input.previousMessages && input.previousMessages.length > 0) {
    for (const m of input.previousMessages) {
      messages.push({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })
    }
  }

  messages.push({ role: 'user', content: userContent })

  const toolCallsDetail: ToolCallLog[] = []
  const kbArticleIds: string[] = []
  let webSearchCount = 0
  let totalToolCalls = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  const toolContext: ToolContext = {
    ticketId: input.ticket.id,
    customerId: input.customer.id,
  }

  yield { type: 'thinking' }

  // Tool-use rounds (non-streaming for speed)
  for (let round = 0; round < config.maxToolRounds; round++) {
    if (Date.now() - startTime > config.timeoutMs) {
      const result: AgentResult = {
        type: 'timeout',
        content: "I'm still looking into this for you. A team member will follow up shortly.",
        confidence: 0.3,
        kbArticleIds,
        webSearchCount,
        totalToolCalls,
        toolCallsDetail,
        durationMs: Date.now() - startTime,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      }
      yield { type: 'text_delta', content: result.content }
      yield { type: 'complete', result }
      return
    }

    const response = await withFallback(client =>
      client.messages.create({
        model: config.model,
        max_tokens: getMaxTokensForChannel(input.channel),
        system: systemPrompt,
        tools: AGENT_TOOLS,
        messages,
      })
    )

    totalInputTokens += response.usage?.input_tokens || 0
    totalOutputTokens += response.usage?.output_tokens || 0

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    // If no tool use, switch to streaming for the final response
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      // Extract any text from this non-streaming response
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((b) => b.text)
        .join('')

      if (textContent) {
        // Stream the pre-fetched text in small chunks with delays
        // to simulate natural typing speed (~2-3s for a typical response)
        const chunkSize = 4
        for (let i = 0; i < textContent.length; i += chunkSize) {
          yield { type: 'text_delta', content: textContent.slice(i, i + chunkSize) }
          // Yield to event loop so each chunk flushes to the client
          if (i + chunkSize < textContent.length) {
            const jitter = Math.floor(Math.random() * 11) - 5 // -5 to +5ms
            await new Promise(resolve => setTimeout(resolve, 18 + jitter))
          }
        }

        const result: AgentResult = {
          type: 'response',
          content: textContent,
          confidence: calculateConfidence(toolCallsDetail, kbArticleIds),
          kbArticleIds,
          webSearchCount,
          totalToolCalls,
          toolCallsDetail,
          durationMs: Date.now() - startTime,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        }
        yield { type: 'complete', result }
        return
      }
      break
    }

    // Execute tool calls
    messages.push({ role: 'assistant', content: response.content })
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      if (totalToolCalls >= config.maxTotalTools) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Tool call limit reached. Provide your best response.',
        })
        continue
      }

      totalToolCalls++
      const toolInput = toolUse.input as Record<string, unknown>

      // Emit tool status
      yield {
        type: 'tool_call',
        tool: toolUse.name,
        description: getToolDescription(toolUse.name),
      }

      if (toolUse.name === 'search_web') {
        webSearchCount++
        if (webSearchCount > 3) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: 'Maximum web searches reached.',
          })
          yield { type: 'tool_result', tool: toolUse.name, success: false }
          continue
        }
      }

      const { result, log } = await executeTool(
        toolUse.name,
        toolInput,
        toolContext,
        totalToolCalls - 1
      )

      toolCallsDetail.push(log)
      yield { type: 'tool_result', tool: toolUse.name, success: !result.startsWith('No ') }

      // Check escalation
      if (toolUse.name === 'escalate_to_human') {
        try {
          const parsed = JSON.parse(result)
          if (parsed.escalated) {
            const content = `I've connected you with our support team. ${parsed.summary}`
            yield { type: 'text_delta', content }
            yield {
              type: 'complete',
              result: {
                type: 'escalation',
                content,
                confidence: 0.2,
                kbArticleIds,
                webSearchCount,
                totalToolCalls,
                toolCallsDetail,
                durationMs: Date.now() - startTime,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
                escalationReason: parsed.reason,
                escalationSummary: parsed.summary,
              },
            }
            return
          }
        } catch {
          // Continue
        }
      }

      if (toolUse.name === 'search_knowledge_base' && !result.startsWith('No knowledge base')) {
        const idMatches = result.match(/ID:\s*([a-f0-9-]+)/gi)
        if (idMatches) {
          kbArticleIds.push(...idMatches.map((m) => m.replace(/ID:\s*/i, '')))
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  // Final streaming response after all tool rounds
  // Try primary key, fall back to secondary on rate limit
  const streamParams = {
    model: config.model,
    max_tokens: getMaxTokensForChannel(input.channel),
    system: systemPrompt + '\n\nProvide your best response with the information gathered.',
    messages,
  } as const

  let fullContent = ''

  const consumeStream = async function* (client: Anthropic) {
    const s = client.messages.stream(streamParams)
    for await (const event of s) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text
        yield { type: 'text_delta' as const, content: event.delta.text }
      }
    }
    const msg = await s.finalMessage()
    totalInputTokens += msg.usage?.input_tokens || 0
    totalOutputTokens += msg.usage?.output_tokens || 0
  }

  try {
    yield* consumeStream(getAnthropicClient())
  } catch (err) {
    const fallback = getFallbackClient()
    if (err instanceof Anthropic.APIError && (err.status === 429 || err.status === 529) && fallback) {
      fullContent = '' // reset partial content
      yield* consumeStream(fallback)
    } else {
      throw err
    }
  }

  yield {
    type: 'complete',
    result: {
      type: 'response',
      content: fullContent || "I'm still investigating. A team member will follow up shortly.",
      confidence: calculateConfidence(toolCallsDetail, kbArticleIds),
      kbArticleIds,
      webSearchCount,
      totalToolCalls,
      toolCallsDetail,
      durationMs: Date.now() - startTime,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  }
}

// --- Helpers ---

function buildInitialMessage(input: AgentInput): string {
  return `## Customer Message
${input.message}

## Context
- Ticket ID: ${input.ticket.id}
- Ticket Subject: ${input.ticket.subject}
- Customer ID: ${input.customer.id}
- Customer Name: ${input.customer.name || 'Unknown'}
- Channel: ${input.channel}
- Ticket Priority: ${input.ticket.priority}
- Ticket Status: ${input.ticket.status}

Please help this customer. Start by searching the knowledge base for relevant information.`
}

function calculateConfidence(toolCalls: ToolCallLog[], kbArticleIds: string[]): number {
  let confidence = 0.5

  // KB usage boost
  if (kbArticleIds.length > 0) {
    confidence += 0.25
  }

  // Multiple tool calls suggest thoroughness
  const searchCalls = toolCalls.filter(
    (t) => t.tool === 'search_knowledge_base' || t.tool === 'search_web'
  )
  if (searchCalls.length >= 2) {
    confidence += 0.1
  }

  // Web search used (shows extra effort)
  const webCalls = toolCalls.filter((t) => t.tool === 'search_web')
  if (webCalls.length > 0 && kbArticleIds.length === 0) {
    // Web-only: slightly lower confidence
    confidence = Math.max(confidence - 0.1, 0.4)
  }

  return Math.min(1.0, confidence)
}

function getToolDescription(toolName: string): string {
  switch (toolName) {
    case 'search_knowledge_base':
      return 'Searching knowledge base...'
    case 'search_web':
      return 'Searching the web...'
    case 'get_customer_context':
      return 'Looking up customer info...'
    case 'get_ticket_messages':
      return 'Reviewing conversation history...'
    case 'escalate_to_human':
      return 'Connecting to support team...'
    default:
      return 'Processing...'
  }
}
