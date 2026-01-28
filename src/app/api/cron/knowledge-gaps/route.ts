import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'

const JOB_NAME = 'knowledge-gaps'

interface GapCandidate {
  topic: string
  occurrences: number
  avgConfidence: number
  sampleTicketIds: string[]
  suggestedTitle: string
}

/**
 * POST /api/cron/knowledge-gaps
 * Find topics with low KB matches + low AI confidence and suggest articles
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get recent tickets with low AI confidence (suggests KB gap)
    const { data: lowConfidenceTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        subject,
        ai_confidence,
        tags,
        messages(content, sender_type)
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .lt('ai_confidence', 0.6)
      .order('created_at', { ascending: false })
      .limit(200)

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    if (!lowConfidenceTickets || lowConfidenceTickets.length === 0) {
      logCronExecution(JOB_NAME, 'completed', { message: 'No low-confidence tickets found' })
      return NextResponse.json({ success: true, gapsDetected: 0, draftsCreated: 0 })
    }

    // Extract common topics/keywords from subjects
    const topicCounts = new Map<string, {
      count: number
      confidences: number[]
      ticketIds: string[]
      subjects: string[]
    }>()

    // Common words to ignore
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'if',
      'because', 'until', 'while', 'about', 'against', 'between', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
      'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
      'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
      'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
      'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'help', 'please', 'thanks', 'thank', 'hi', 'hello', 'issue',
      'problem', 'question', 'work', 'working', 'doesnt', "doesn't", 'cant',
      "can't", 'wont', "won't", 'get', 'getting', 'got'
    ])

    for (const ticket of lowConfidenceTickets) {
      // Extract words from subject
      const words = ticket.subject
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w))

      // Also use tags as topics
      const tags = ticket.tags || []

      const topics = [...new Set([...words, ...tags])]

      for (const topic of topics) {
        if (!topicCounts.has(topic)) {
          topicCounts.set(topic, {
            count: 0,
            confidences: [],
            ticketIds: [],
            subjects: [],
          })
        }

        const data = topicCounts.get(topic)!
        data.count++
        if (ticket.ai_confidence !== null) {
          data.confidences.push(ticket.ai_confidence)
        }
        data.ticketIds.push(ticket.id)
        data.subjects.push(ticket.subject)
      }
    }

    // Find topics that appear frequently (potential gaps)
    const MIN_OCCURRENCES = 3
    const gapCandidates: GapCandidate[] = []

    for (const [topic, data] of topicCounts) {
      if (data.count >= MIN_OCCURRENCES) {
        const avgConfidence = data.confidences.length > 0
          ? data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length
          : 0

        // Generate suggested title from most common subject pattern
        const subjectWords = data.subjects
          .flatMap((s) => s.split(/\s+/))
          .filter((w) => w.length > 2)

        const wordFreq = new Map<string, number>()
        for (const w of subjectWords) {
          wordFreq.set(w.toLowerCase(), (wordFreq.get(w.toLowerCase()) || 0) + 1)
        }

        const topWords = [...wordFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([w]) => w)

        const suggestedTitle = `How to ${topWords.join(' ')}`

        gapCandidates.push({
          topic,
          occurrences: data.count,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          sampleTicketIds: data.ticketIds.slice(0, 5),
          suggestedTitle,
        })
      }
    }

    // Sort by occurrences (most common gaps first)
    gapCandidates.sort((a, b) => b.occurrences - a.occurrences)

    // Create article drafts for top gaps
    let draftsCreated = 0
    const TOP_GAPS = 5

    for (const gap of gapCandidates.slice(0, TOP_GAPS)) {
      // Check if we already have a draft for this topic
      const { data: existingDraft } = await supabase
        .from('knowledge_article_drafts')
        .select('id')
        .ilike('title', `%${gap.topic}%`)
        .eq('status', 'pending')
        .limit(1)

      if (existingDraft && existingDraft.length > 0) continue

      // Get sample messages for content generation hints
      const { data: sampleMessages } = await supabase
        .from('messages')
        .select('content, sender_type')
        .in('ticket_id', gap.sampleTicketIds)
        .eq('sender_type', 'customer')
        .limit(3)

      const sampleQuestions = sampleMessages?.map((m) => m.content).join('\n\n') || ''

      // Create draft
      const { error: draftError } = await supabase
        .from('knowledge_article_drafts')
        .insert({
          title: gap.suggestedTitle,
          content: `## Topic: ${gap.topic}

This article was auto-suggested because ${gap.occurrences} tickets about this topic had low AI confidence (avg: ${gap.avgConfidence}).

### Sample Customer Questions:
${sampleQuestions}

### Suggested Content:
[Draft content needed - please write an article addressing the above questions]

---
*This draft was generated by the Knowledge Gap Detector on ${now.toISOString()}*`,
          suggested_category: gap.topic,
          source_ticket_ids: gap.sampleTicketIds,
          generation_reason: 'gap_detected',
          confidence_score: 1 - gap.avgConfidence, // Higher confidence in the gap
          status: 'pending',
          metadata: {
            topic: gap.topic,
            occurrences: gap.occurrences,
            avgAiConfidence: gap.avgConfidence,
          },
        })

      if (!draftError) {
        draftsCreated++
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      ticketsAnalyzed: lowConfidenceTickets.length,
      gapsDetected: gapCandidates.length,
      draftsCreated,
      topGaps: gapCandidates.slice(0, 10).map((g) => ({
        topic: g.topic,
        occurrences: g.occurrences,
        avgConfidence: g.avgConfidence,
      })),
    })

    return NextResponse.json({
      success: true,
      ticketsAnalyzed: lowConfidenceTickets.length,
      gapsDetected: gapCandidates.length,
      draftsCreated,
      topGaps: gapCandidates.slice(0, 10),
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
