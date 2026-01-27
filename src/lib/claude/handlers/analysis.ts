import type {
  ToolContext,
  ToolResult,
  AnalyzeSentimentInput,
  SentimentAnalysis,
} from '../types'
import { anthropic, COPILOT_MODEL } from '../client'
import { SENTIMENT_ANALYSIS_PROMPT } from '../prompts'

/**
 * Analyze customer sentiment from ticket messages
 */
export async function analyzeSentiment(
  input: AnalyzeSentimentInput,
  context: ToolContext
): Promise<ToolResult> {
  const { supabase } = context

  if (!input.ticket_id) {
    return {
      success: false,
      error: 'ticket_id is required',
    }
  }

  try {
    // Fetch customer messages from the ticket
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('sender_type, content, created_at')
      .eq('ticket_id', input.ticket_id)
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: true })

    if (messagesError) {
      return {
        success: false,
        error: `Failed to fetch messages: ${messagesError.message}`,
      }
    }

    if (!messages || messages.length === 0) {
      return {
        success: true,
        data: {
          score: 3,
          indicators: ['No customer messages to analyze'],
          trend: 'stable',
          riskLevel: 'low',
          summary: 'Unable to determine sentiment - no customer messages found',
          message_count: 0,
        } as SentimentAnalysis & { message_count: number },
      }
    }

    // Format messages for the prompt
    const messagesText = messages
      .map((m, index) => `Message ${index + 1}: ${m.content}`)
      .join('\n\n')

    // Generate sentiment analysis using Claude
    const prompt = SENTIMENT_ANALYSIS_PROMPT.replace('{messages}', messagesText)

    const response = await anthropic.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse the JSON response
    let analysis: SentimentAnalysis
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        analysis = {
          score: parsed.score || 3,
          indicators: parsed.indicators || [],
          trend: parsed.trend || 'stable',
          riskLevel: parsed.riskLevel || 'medium',
          summary: parsed.summary || 'Sentiment analysis complete',
        }
      } else {
        // Fallback if no JSON found
        analysis = inferSentimentFromText(responseText)
      }
    } catch {
      // If JSON parsing fails, infer from text
      analysis = inferSentimentFromText(responseText)
    }

    // Validate and clamp values
    analysis.score = Math.max(1, Math.min(5, analysis.score))
    if (!['improving', 'declining', 'stable'].includes(analysis.trend)) {
      analysis.trend = 'stable'
    }
    if (!['low', 'medium', 'high'].includes(analysis.riskLevel)) {
      analysis.riskLevel = 'medium'
    }

    return {
      success: true,
      data: {
        ...analysis,
        message_count: messages.length,
        ticket_id: input.ticket_id,
      },
    }
  } catch (error) {
    console.error('analyzeSentiment error:', error)
    return {
      success: false,
      error: 'Failed to analyze sentiment',
    }
  }
}

/**
 * Infer sentiment from unstructured text response
 */
function inferSentimentFromText(text: string): SentimentAnalysis {
  const lowerText = text.toLowerCase()

  // Determine score
  let score = 3
  if (lowerText.includes('very frustrated') || lowerText.includes('angry') || lowerText.includes('furious')) {
    score = 1
  } else if (lowerText.includes('frustrated') || lowerText.includes('upset') || lowerText.includes('disappointed')) {
    score = 2
  } else if (lowerText.includes('happy') || lowerText.includes('pleased') || lowerText.includes('satisfied')) {
    score = 4
  } else if (lowerText.includes('very happy') || lowerText.includes('delighted') || lowerText.includes('excellent')) {
    score = 5
  }

  // Determine trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  if (lowerText.includes('improving') || lowerText.includes('better') || lowerText.includes('calming')) {
    trend = 'improving'
  } else if (lowerText.includes('declining') || lowerText.includes('worse') || lowerText.includes('escalating')) {
    trend = 'declining'
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium'
  if (score <= 2 || lowerText.includes('high risk') || lowerText.includes('churn')) {
    riskLevel = 'high'
  } else if (score >= 4 || lowerText.includes('low risk')) {
    riskLevel = 'low'
  }

  // Extract indicators
  const indicators: string[] = []
  const indicatorPatterns = [
    /exclamation marks?/gi,
    /all caps/gi,
    /repeat(ing|ed)? complaints?/gi,
    /thank(s|ing)?/gi,
    /apprec(iate|iation)/gi,
    /frustrat(ed|ion|ing)/gi,
    /urgent/gi,
    /help(ful)?/gi,
  ]

  indicatorPatterns.forEach((pattern) => {
    if (pattern.test(text)) {
      const match = text.match(pattern)
      if (match) {
        indicators.push(match[0])
      }
    }
  })

  return {
    score,
    indicators: indicators.length > 0 ? indicators : ['General tone assessment'],
    trend,
    riskLevel,
    summary: text.length > 200 ? text.substring(0, 200) + '...' : text,
  }
}
