/**
 * AI Agent Configuration
 * Config from environment variables with sensible defaults
 */

export interface AgentConfig {
  enabled: boolean
  maxToolRounds: number
  maxTotalTools: number
  model: string
  timeoutMs: number
}

let _config: AgentConfig | null = null

export function getAgentConfig(): AgentConfig {
  if (!_config) {
    _config = {
      enabled: process.env.AI_AGENT_ENABLED !== 'false', // enabled by default
      maxToolRounds: parseInt(process.env.AI_AGENT_MAX_TOOL_ROUNDS || '8', 10),
      maxTotalTools: parseInt(process.env.AI_AGENT_MAX_TOTAL_TOOLS || '15', 10),
      model: process.env.AI_AGENT_MODEL || 'claude-sonnet-4-20250514',
      timeoutMs: parseInt(process.env.AI_AGENT_TIMEOUT_MS || '30000', 10),
    }
  }
  return _config
}
