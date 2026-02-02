import Anthropic from '@anthropic-ai/sdk'

// Dual-key Anthropic clients with automatic fallback.
// Uses ANTHROPIC_API_KEY_1 as primary, falls back to _2 on rate-limit (429) or overloaded (529).
let _clients: Anthropic[] | null = null

function getClients(): Anthropic[] {
  if (!_clients) {
    const key1 = process.env.ANTHROPIC_API_KEY_1
    const key2 = process.env.ANTHROPIC_API_KEY_2
    if (!key1) {
      throw new Error('ANTHROPIC_API_KEY_1 environment variable is not set')
    }
    _clients = [new Anthropic({ apiKey: key1 })]
    if (key2) {
      _clients.push(new Anthropic({ apiKey: key2 }))
    }
  }
  return _clients
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status === 429 || err.status === 529
  }
  return false
}

export function getAnthropicClient(index = 0): Anthropic {
  const clients = getClients()
  return clients[Math.min(index, clients.length - 1)]
}

export function getFallbackClient(): Anthropic | null {
  const clients = getClients()
  return clients.length > 1 ? clients[1] : null
}

/**
 * Execute an Anthropic API call with automatic key fallback.
 * Tries the primary key first; on 429/529, retries with the secondary key (if configured).
 */
export async function withFallback<T>(fn: (client: Anthropic) => Promise<T>): Promise<T> {
  const clients = getClients()
  try {
    return await fn(clients[0])
  } catch (err) {
    if (isRateLimitError(err) && clients.length > 1) {
      return await fn(clients[1])
    }
    throw err
  }
}

// Model for agent copilot
export const COPILOT_MODEL = 'claude-sonnet-4-20250514'
