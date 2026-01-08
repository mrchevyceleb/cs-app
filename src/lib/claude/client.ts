import Anthropic from '@anthropic-ai/sdk'

// Server-side Anthropic client for Nova (Agent Copilot)
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model for agent copilot
export const COPILOT_MODEL = 'claude-sonnet-4-20250514'
