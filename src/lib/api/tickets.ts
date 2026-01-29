import type { TicketWithCustomer } from '@/components/dashboard'
import type { MessageWithAttachments, TicketEventWithAgent } from '@/types/database'

interface FetchJsonOptions {
  signal?: AbortSignal
}

interface FetchMessagesOptions extends FetchJsonOptions {
  limit?: number
  offset?: number
  includeAttachments?: boolean
}

interface FetchEventsOptions extends FetchJsonOptions {
  limit: number
  offset?: number
}

async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const response = await fetch(url, {
    signal: options.signal,
  })

  if (!response.ok) {
    let message = 'Request failed'
    try {
      const data = await response.json()
      if (data?.error) {
        message = data.error
      }
    } catch {
      // Ignore JSON parse errors
    }
    const error = new Error(message)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

export async function fetchTicketById(id: string, options: FetchJsonOptions = {}): Promise<TicketWithCustomer> {
  const data = await fetchJson<{ ticket: TicketWithCustomer }>(`/api/tickets/${id}`, options)
  return data.ticket
}

export async function fetchTicketMessages(
  id: string,
  options: FetchMessagesOptions = {}
): Promise<MessageWithAttachments[]> {
  const params = new URLSearchParams()
  params.set('limit', String(options.limit ?? 100))
  params.set('offset', String(options.offset ?? 0))
  params.set('includeAttachments', options.includeAttachments === false ? 'false' : 'true')

  const data = await fetchJson<{ messages: MessageWithAttachments[] }>(
    `/api/tickets/${id}/messages?${params.toString()}`,
    options
  )

  return data.messages || []
}

export async function fetchTicketEvents(
  id: string,
  options: FetchEventsOptions
): Promise<{ events: TicketEventWithAgent[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams()
  params.set('limit', String(options.limit))
  params.set('offset', String(options.offset ?? 0))

  return fetchJson<{ events: TicketEventWithAgent[]; total: number; hasMore: boolean }>(
    `/api/tickets/${id}/events?${params.toString()}`,
    options
  )
}
