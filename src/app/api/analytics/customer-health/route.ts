import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { CustomerHealthScore, Customer, HealthRiskLevel, HealthTrend } from '@/types/database'

// Get admin Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
  const serviceKey = process.env.SB_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SB_SERVICE_ROLE_KEY is required')
  }

  return createAdminClient(supabaseUrl, serviceKey)
}

interface HealthScoreWithCustomer extends CustomerHealthScore {
  customer: Pick<Customer, 'id' | 'name' | 'email'>
}

interface HealthMetrics {
  totalCustomers: number
  avgScore: number
  distribution: {
    healthy: number
    atRisk: number
    critical: number
  }
  trends: {
    improving: number
    stable: number
    declining: number
  }
  recentChanges: HealthScoreWithCustomer[]
  criticalCustomers: HealthScoreWithCustomer[]
  decliningCustomers: HealthScoreWithCustomer[]
}

/**
 * GET /api/analytics/customer-health
 * Get customer health analytics and dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      console.error('[CustomerHealth] Auth error:', authError || 'No user session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()
    const { searchParams } = new URL(request.url)

    const view = searchParams.get('view') || 'summary' // 'summary', 'list', 'critical', 'declining'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const riskLevel = searchParams.get('riskLevel') as HealthRiskLevel | null
    const trend = searchParams.get('trend') as HealthTrend | null
    const sortBy = searchParams.get('sortBy') || 'score' // 'score', 'trend', 'updated'
    const sortOrder = searchParams.get('sortOrder') || 'asc' // 'asc', 'desc'

    // Summary view - aggregate metrics
    if (view === 'summary') {
      // Get all health scores
      const { data: healthScores, error: scoresError } = await supabase
        .from('customer_health_scores')
        .select(`
          *,
          customer:customers(id, name, email)
        `)

      if (scoresError) {
        console.error('[CustomerHealth] Error fetching scores:', scoresError)
        return NextResponse.json(
          { error: 'Failed to fetch health scores' },
          { status: 500 }
        )
      }

      const scores = healthScores as HealthScoreWithCustomer[] || []

      // Calculate metrics
      const totalCustomers = scores.length
      const avgScore = totalCustomers > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalCustomers)
        : 0

      const distribution = {
        healthy: scores.filter((s) => s.risk_level === 'healthy').length,
        atRisk: scores.filter((s) => s.risk_level === 'at_risk').length,
        critical: scores.filter((s) => s.risk_level === 'critical').length,
      }

      const trends = {
        improving: scores.filter((s) => s.trend === 'improving').length,
        stable: scores.filter((s) => s.trend === 'stable').length,
        declining: scores.filter((s) => s.trend === 'declining').length,
      }

      // Get recently changed scores (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentChanges = scores
        .filter((s) => s.updated_at && new Date(s.updated_at) > yesterday && s.score_change !== 0)
        .sort((a, b) => Math.abs(b.score_change || 0) - Math.abs(a.score_change || 0))
        .slice(0, 10)

      // Get critical customers
      const criticalCustomers = scores
        .filter((s) => s.risk_level === 'critical')
        .sort((a, b) => a.score - b.score)
        .slice(0, 10)

      // Get declining customers
      const decliningCustomers = scores
        .filter((s) => s.trend === 'declining')
        .sort((a, b) => (a.score_change || 0) - (b.score_change || 0))
        .slice(0, 10)

      const metrics: HealthMetrics = {
        totalCustomers,
        avgScore,
        distribution,
        trends,
        recentChanges,
        criticalCustomers,
        decliningCustomers,
      }

      return NextResponse.json(metrics)
    }

    // List view - paginated list of health scores
    if (view === 'list' || view === 'critical' || view === 'declining') {
      let query = supabase
        .from('customer_health_scores')
        .select(`
          *,
          customer:customers(id, name, email)
        `, { count: 'exact' })

      // Apply filters based on view
      if (view === 'critical') {
        query = query.eq('risk_level', 'critical')
      } else if (view === 'declining') {
        query = query.eq('trend', 'declining')
      } else {
        // Generic list - apply optional filters
        if (riskLevel) {
          query = query.eq('risk_level', riskLevel)
        }
        if (trend) {
          query = query.eq('trend', trend)
        }
      }

      // Apply sorting
      if (sortBy === 'score') {
        query = query.order('score', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'trend') {
        query = query.order('score_change', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'updated') {
        query = query.order('updated_at', { ascending: sortOrder === 'asc' })
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data: healthScores, error: listError, count } = await query

      if (listError) {
        console.error('[CustomerHealth] Error fetching list:', listError)
        return NextResponse.json(
          { error: 'Failed to fetch health scores' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        customers: healthScores || [],
        total: count,
        limit,
        offset,
      })
    }

    return NextResponse.json(
      { error: 'Invalid view parameter' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[CustomerHealth] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analytics/customer-health/[customerId]
 * Get detailed health info for a specific customer
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user }, error: authError } = await authClient.auth.getUser()

    if (authError || !user) {
      console.error('[CustomerHealth] Auth error:', authError || 'No user session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = getServiceClient()
    const body = await request.json()
    const { customerId } = body

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      )
    }

    // Get health score
    const { data: healthScore, error: scoreError } = await supabase
      .from('customer_health_scores')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('customer_id', customerId)
      .single()

    if (scoreError && scoreError.code !== 'PGRST116') {
      console.error('[CustomerHealth] Error fetching score:', scoreError)
      return NextResponse.json(
        { error: 'Failed to fetch health score' },
        { status: 500 }
      )
    }

    // Get recent tickets for context
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('id, subject, status, priority, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent feedback
    const { data: recentFeedback } = await supabase
      .from('ticket_feedback')
      .select(`
        *,
        ticket:tickets(id, subject)
      `)
      .in('ticket_id', recentTickets?.map((t) => t.id) || [])
      .not('rating', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(5)

    // Get proactive outreach history
    const { data: outreachHistory } = await supabase
      .from('proactive_outreach_log')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10)

    // If no health score exists, calculate one
    if (!healthScore) {
      // Calculate basic health score from available data
      const ticketCount = recentTickets?.length || 0
      const openTickets = recentTickets?.filter((t) => t.status === 'open' || t.status === 'pending').length || 0
      const escalatedTickets = recentTickets?.filter((t) => t.status === 'escalated').length || 0
      const feedbackScores = recentFeedback?.map((f) => f.rating).filter(Boolean) || []
      const avgCsat = feedbackScores.length > 0
        ? feedbackScores.reduce((a, b) => a + b, 0) / feedbackScores.length
        : null

      // Simple score calculation
      let score = 70
      if (avgCsat !== null) score += Math.round((avgCsat - 3) * 10)
      score -= Math.min(openTickets * 5, 25)
      score -= Math.min(escalatedTickets * 10, 30)
      score = Math.max(0, Math.min(100, score))

      return NextResponse.json({
        healthScore: {
          customer_id: customerId,
          score,
          risk_level: score >= 60 ? 'healthy' : score >= 40 ? 'at_risk' : 'critical',
          trend: 'stable',
          factors: {
            ticket_count: ticketCount,
            open_tickets: openTickets,
            escalation_count: escalatedTickets,
            avg_csat: avgCsat,
          },
          calculated_on_demand: true,
        },
        recentTickets: recentTickets || [],
        recentFeedback: recentFeedback || [],
        outreachHistory: outreachHistory || [],
      })
    }

    return NextResponse.json({
      healthScore,
      recentTickets: recentTickets || [],
      recentFeedback: recentFeedback || [],
      outreachHistory: outreachHistory || [],
    })
  } catch (error) {
    console.error('[CustomerHealth] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
