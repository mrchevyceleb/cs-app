import type { ToolContext } from '../types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_IN_TEXT_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
const COMPACT_UUID_REGEX = /\b[0-9a-f]{32}\b/i
const SHORT_TICKET_ID_REGEX = /\b[0-9a-f]{6,12}\b/i
const MAX_PREFIX_SCAN = 2000

interface ResolveTicketIdResult {
  success: boolean
  ticketId?: string
  error?: string
}

function toCanonicalUuid(compactUuid: string): string {
  const value = compactUuid.toLowerCase()
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}

function normalizeTicketIdInput(rawTicketId: string): string {
  const value = rawTicketId.trim()

  const uuidMatch = value.match(UUID_IN_TEXT_REGEX)
  if (uuidMatch) {
    return uuidMatch[0].toLowerCase()
  }

  const compactUuidMatch = value.match(COMPACT_UUID_REGEX)
  if (compactUuidMatch) {
    return toCanonicalUuid(compactUuidMatch[0])
  }

  const shortIdMatch = value.match(SHORT_TICKET_ID_REGEX)
  if (shortIdMatch) {
    return shortIdMatch[0].toLowerCase()
  }

  return value
    .replace(/^[`"'#\s]+/, '')
    .replace(/[`"',.;:!?)\]\}>\s]+$/, '')
    .toLowerCase()
}

export async function resolveTicketId(
  rawTicketId: string,
  context: ToolContext
): Promise<ResolveTicketIdResult> {
  const { supabase } = context
  const normalizedTicketId = normalizeTicketIdInput(rawTicketId)

  if (!normalizedTicketId) {
    return {
      success: false,
      error: 'ticket_id is required',
    }
  }

  // Exact UUID already, no lookup required.
  if (UUID_REGEX.test(normalizedTicketId)) {
    return {
      success: true,
      ticketId: normalizedTicketId,
    }
  }

  // Support short display IDs like "c539f8a1" by scanning for a unique prefix match.
  if (!/^[0-9a-f]{6,12}$/i.test(normalizedTicketId)) {
    return {
      success: false,
      error: `Invalid ticket ID format: ${rawTicketId}`,
    }
  }

  const { data: candidates, error } = await supabase
    .from('tickets')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(MAX_PREFIX_SCAN)

  if (error) {
    return {
      success: false,
      error: `Failed to resolve ticket ID: ${error.message}`,
    }
  }

  const matches = (candidates || []).filter((ticket) =>
    ticket.id.toLowerCase().startsWith(normalizedTicketId)
  )

  if (matches.length === 1) {
    return {
      success: true,
      ticketId: matches[0].id,
    }
  }

  if (matches.length > 1) {
    return {
      success: false,
      error: `Ticket ID prefix "${normalizedTicketId}" matches multiple tickets. Please use a longer ID.`,
    }
  }

  return {
    success: false,
    error: `Ticket not found: ${rawTicketId}`,
  }
}
