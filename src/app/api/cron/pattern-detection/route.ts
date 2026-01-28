import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'
import crypto from 'crypto'

const JOB_NAME = 'pattern-detection'

interface DetectedPattern {
  hash: string
  keywords: string[]
  sampleMessage: string
  occurrences: number
  customerCount: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Extract keywords from message content
 */
function extractKeywords(content: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'and', 'but', 'or', 'if', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
    'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
    'am', 'help', 'please', 'thanks', 'thank', 'hi', 'hello', 'get', 'got',
    'just', 'also', 'still', 'even', 'now', 'here', 'there', 'when', 'where',
    'why', 'how', 'what', 'which', 'who', 'whom', 'been', 'being', 'some',
    'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'about', 'again', 'after', 'before', 'below', 'above', 'up',
    'down', 'out', 'off', 'over', 'under', 'then', 'once', 'while', 'during'
  ])

  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
}

/**
 * Generate hash for a set of keywords
 */
function generatePatternHash(keywords: string[]): string {
  const sorted = [...keywords].sort().join('|')
  return crypto.createHash('md5').update(sorted).digest('hex').substring(0, 16)
}

/**
 * Determine severity based on pattern characteristics
 */
function determineSeverity(
  occurrences: number,
  customerCount: number,
  keywords: string[]
): 'low' | 'medium' | 'high' | 'critical' {
  const urgentKeywords = ['down', 'outage', 'broken', 'crash', 'error', 'failed', 'cannot', 'unable', 'emergency']
  const hasUrgentKeyword = keywords.some((k) => urgentKeywords.includes(k))

  if (customerCount >= 10 && hasUrgentKeyword) return 'critical'
  if (customerCount >= 10 || (customerCount >= 5 && hasUrgentKeyword)) return 'high'
  if (customerCount >= 5 || occurrences >= 10) return 'medium'
  return 'low'
}

/**
 * POST /api/cron/pattern-detection
 * Detect cross-customer issue patterns
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Get recent customer messages (last hour for context, focus on last 15 min)
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        ticket_id,
        created_at,
        ticket:tickets(id, customer_id, subject, status)
      `)
      .eq('sender_type', 'customer')
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500)

    if (messagesError) {
      logCronExecution(JOB_NAME, 'failed', { error: messagesError.message })
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    if (!recentMessages || recentMessages.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { message: 'No recent messages' })
      return NextResponse.json({ success: true, patternsDetected: 0 })
    }

    // Extract and cluster keywords
    const keywordGroups = new Map<string, {
      keywords: string[]
      messages: typeof recentMessages
      customerIds: Set<string>
      ticketIds: Set<string>
    }>()

    for (const message of recentMessages) {
      const keywords = extractKeywords(message.content)
      if (keywords.length < 2) continue

      // Use top 5 most significant keywords
      const keywordFreq = new Map<string, number>()
      for (const kw of keywords) {
        keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1)
      }
      const topKeywords = [...keywordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw)

      const hash = generatePatternHash(topKeywords)

      if (!keywordGroups.has(hash)) {
        keywordGroups.set(hash, {
          keywords: topKeywords,
          messages: [],
          customerIds: new Set(),
          ticketIds: new Set(),
        })
      }

      const group = keywordGroups.get(hash)!
      group.messages.push(message)

      // Handle nested relation (can be object or array from Supabase)
      const ticketRaw = message.ticket as { id: string; customer_id: string; subject: string; status: string } | { id: string; customer_id: string; subject: string; status: string }[] | null
      const ticketData = Array.isArray(ticketRaw) ? ticketRaw[0] : ticketRaw
      if (ticketData) {
        group.customerIds.add(ticketData.customer_id)
        group.ticketIds.add(ticketData.id)
      }
    }

    // Find patterns with multiple customers (potential issues)
    const MIN_CUSTOMERS = 2
    const detectedPatterns: DetectedPattern[] = []

    for (const [hash, group] of keywordGroups) {
      if (group.customerIds.size >= MIN_CUSTOMERS) {
        const severity = determineSeverity(
          group.messages.length,
          group.customerIds.size,
          group.keywords
        )

        detectedPatterns.push({
          hash,
          keywords: group.keywords,
          sampleMessage: group.messages[0]?.content.substring(0, 200) || '',
          occurrences: group.messages.length,
          customerCount: group.customerIds.size,
          severity,
        })

        // Check if pattern already exists
        const { data: existingPattern } = await supabase
          .from('issue_patterns')
          .select('id, occurrence_count, affected_customer_ids, affected_ticket_ids')
          .eq('pattern_hash', hash)
          .eq('status', 'detected')
          .single()

        if (existingPattern) {
          // Update existing pattern
          const existingCustomerIds = existingPattern.affected_customer_ids || []
          const existingTicketIds = existingPattern.affected_ticket_ids || []

          await supabase
            .from('issue_patterns')
            .update({
              occurrence_count: existingPattern.occurrence_count + group.messages.length,
              affected_customer_count: new Set([...existingCustomerIds, ...group.customerIds]).size,
              affected_customer_ids: [...new Set([...existingCustomerIds, ...group.customerIds])],
              affected_ticket_ids: [...new Set([...existingTicketIds, ...group.ticketIds])],
              severity,
              last_seen_at: now.toISOString(),
            })
            .eq('id', existingPattern.id)
        } else {
          // Create new pattern
          await supabase
            .from('issue_patterns')
            .insert({
              pattern_hash: hash,
              pattern_keywords: group.keywords,
              sample_message: group.messages[0]?.content.substring(0, 500),
              occurrence_count: group.messages.length,
              affected_customer_count: group.customerIds.size,
              affected_customer_ids: [...group.customerIds],
              affected_ticket_ids: [...group.ticketIds],
              severity,
              status: 'detected',
              first_detected_at: now.toISOString(),
              last_seen_at: now.toISOString(),
            })
        }
      }
    }

    // Create notifications for high/critical patterns
    const criticalPatterns = detectedPatterns.filter(
      (p) => p.severity === 'critical' || p.severity === 'high'
    )

    if (criticalPatterns.length > 0) {
      // Get all online agents
      const { data: onlineAgents } = await supabase
        .from('agents')
        .select('id')
        .eq('status', 'online')

      if (onlineAgents && onlineAgents.length > 0) {
        for (const pattern of criticalPatterns) {
          const message = `Detected ${pattern.severity} issue: "${pattern.keywords.join(', ')}" affecting ${pattern.customerCount} customers`

          // Notify first online agent (in production, might notify all or specific roles)
          await supabase
            .from('agent_notifications')
            .insert({
              agent_id: onlineAgents[0].id,
              type: 'escalation',
              title: `${pattern.severity.toUpperCase()}: Issue Pattern Detected`,
              message,
            })
        }
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      messagesAnalyzed: recentMessages.length,
      patternsDetected: detectedPatterns.length,
      criticalPatterns: criticalPatterns.length,
      patterns: detectedPatterns.map((p) => ({
        keywords: p.keywords,
        customers: p.customerCount,
        severity: p.severity,
      })),
    })

    return NextResponse.json({
      success: true,
      messagesAnalyzed: recentMessages.length,
      patternsDetected: detectedPatterns.length,
      criticalPatterns: criticalPatterns.length,
      patterns: detectedPatterns,
    })
  } catch (error) {
    logCronExecution(JOB_NAME, 'failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
