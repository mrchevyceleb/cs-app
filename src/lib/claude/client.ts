import Anthropic from '@anthropic-ai/sdk'

// Lazy-initialized Anthropic client for Nova (Agent Copilot)
let _anthropicClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    _anthropicClient = new Anthropic({ apiKey })
  }
  return _anthropicClient
}

// Model for agent copilot
export const COPILOT_MODEL = 'claude-sonnet-4-20250514'
