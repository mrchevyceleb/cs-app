import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, verifyCronRequest, unauthorizedResponse, logCronExecution } from '@/lib/cron/auth'

const JOB_NAME = 'volume-forecast'

interface ForecastResult {
  forecastFor: string
  forecastHours: number
  predictedVolume: number
  confidenceLower: number
  confidenceUpper: number
  factors: {
    dayOfWeek: string
    historicalAvg: number
    recentTrend: number
    seasonality: number
  }
}

/**
 * POST /api/cron/volume-forecast
 * Predict ticket volume for next 24/48/168 hours
 */
export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  logCronExecution(JOB_NAME, 'started')

  try {
    const supabase = getServiceClient()
    const now = new Date()

    // Get historical ticket data (last 12 weeks for seasonal patterns)
    const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000)

    const { data: historicalTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('created_at')
      .gte('created_at', twelveWeeksAgo.toISOString())
      .order('created_at', { ascending: true })

    if (ticketsError) {
      logCronExecution(JOB_NAME, 'failed', { error: ticketsError.message })
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    if (!historicalTickets || historicalTickets.length < 7) {
      logCronExecution(JOB_NAME, 'completed', { message: 'Insufficient historical data' })
      return NextResponse.json({
        success: true,
        message: 'Insufficient historical data for forecasting',
        forecasts: [],
      })
    }

    // Group tickets by day and hour
    const dailyCounts = new Map<string, number>()
    const hourlyByDay = new Map<number, number[]>() // day of week -> hourly counts

    for (const ticket of historicalTickets) {
      const date = new Date(ticket.created_at)
      const dayKey = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      const hour = date.getHours()

      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1)

      if (!hourlyByDay.has(dayOfWeek)) {
        hourlyByDay.set(dayOfWeek, new Array(24).fill(0))
      }
      hourlyByDay.get(dayOfWeek)![hour]++
    }

    // Calculate daily averages by day of week
    const dayOfWeekAvg = new Map<number, number>()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    for (let dow = 0; dow < 7; dow++) {
      const daysOfThisType = [...dailyCounts.entries()].filter(([dateStr]) => {
        return new Date(dateStr).getDay() === dow
      })
      if (daysOfThisType.length > 0) {
        const avg = daysOfThisType.reduce((sum, [, count]) => sum + count, 0) / daysOfThisType.length
        dayOfWeekAvg.set(dow, avg)
      }
    }

    // Calculate recent trend (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    let lastWeekCount = 0
    let prevWeekCount = 0

    for (const [dateStr, count] of dailyCounts) {
      const date = new Date(dateStr)
      if (date >= sevenDaysAgo) {
        lastWeekCount += count
      } else if (date >= fourteenDaysAgo) {
        prevWeekCount += count
      }
    }

    const recentTrend = prevWeekCount > 0
      ? (lastWeekCount - prevWeekCount) / prevWeekCount
      : 0

    // Generate forecasts for 24, 48, and 168 hours
    const forecasts: ForecastResult[] = []
    const forecastHours = [24, 48, 168]

    for (const hours of forecastHours) {
      const forecastEnd = new Date(now.getTime() + hours * 60 * 60 * 1000)

      // Calculate expected volume based on day-of-week patterns
      let predictedVolume = 0
      const currentDate = new Date(now)

      while (currentDate < forecastEnd) {
        const dayOfWeek = currentDate.getDay()
        const dayAvg = dayOfWeekAvg.get(dayOfWeek) || (lastWeekCount / 7)

        // Add daily average (prorated for partial days)
        const hoursRemaining = Math.min(
          24,
          (forecastEnd.getTime() - currentDate.getTime()) / (60 * 60 * 1000)
        )
        predictedVolume += (dayAvg / 24) * hoursRemaining

        currentDate.setDate(currentDate.getDate() + 1)
        currentDate.setHours(0, 0, 0, 0)
      }

      // Apply trend adjustment
      const trendAdjustment = 1 + (recentTrend * 0.5) // Dampen trend effect
      predictedVolume = Math.round(predictedVolume * trendAdjustment)

      // Calculate confidence interval (simple approach: +/- 20-30%)
      const variability = hours <= 24 ? 0.2 : hours <= 48 ? 0.25 : 0.3
      const confidenceLower = Math.round(predictedVolume * (1 - variability))
      const confidenceUpper = Math.round(predictedVolume * (1 + variability))

      const forecast: ForecastResult = {
        forecastFor: forecastEnd.toISOString(),
        forecastHours: hours,
        predictedVolume,
        confidenceLower,
        confidenceUpper,
        factors: {
          dayOfWeek: dayNames[now.getDay()],
          historicalAvg: Math.round(lastWeekCount / 7),
          recentTrend: Math.round(recentTrend * 100) / 100,
          seasonality: 1.0, // Placeholder for more complex seasonality
        },
      }

      forecasts.push(forecast)

      // Save forecast to database
      await supabase
        .from('volume_forecasts')
        .upsert({
          forecast_for: forecastEnd.toISOString(),
          forecast_hours: hours,
          predicted_volume: predictedVolume,
          confidence_lower: confidenceLower,
          confidence_upper: confidenceUpper,
          contributing_factors: forecast.factors,
        }, {
          onConflict: 'forecast_for,forecast_hours',
        })
    }

    // Update accuracy of previous forecasts
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: pastForecasts } = await supabase
      .from('volume_forecasts')
      .select('id, forecast_for, predicted_volume')
      .lte('forecast_for', now.toISOString())
      .gte('forecast_for', twentyFourHoursAgo.toISOString())
      .is('actual_volume', null)

    if (pastForecasts && pastForecasts.length > 0) {
      for (const forecast of pastForecasts) {
        const forecastDate = new Date(forecast.forecast_for)
        const forecastStart = new Date(forecastDate.getTime() - 24 * 60 * 60 * 1000)

        // Count actual tickets in that period
        const { count: actualCount } = await supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', forecastStart.toISOString())
          .lt('created_at', forecastDate.toISOString())

        if (actualCount !== null) {
          const accuracy = forecast.predicted_volume > 0
            ? Math.round((1 - Math.abs(actualCount - forecast.predicted_volume) / forecast.predicted_volume) * 100)
            : 0

          await supabase
            .from('volume_forecasts')
            .update({
              actual_volume: actualCount,
              accuracy_percentage: Math.max(0, accuracy),
            })
            .eq('id', forecast.id)
        }
      }
    }

    logCronExecution(JOB_NAME, 'completed', {
      historicalDays: dailyCounts.size,
      lastWeekVolume: lastWeekCount,
      recentTrend: `${Math.round(recentTrend * 100)}%`,
      forecasts: forecasts.map((f) => ({
        hours: f.forecastHours,
        predicted: f.predictedVolume,
        range: `${f.confidenceLower}-${f.confidenceUpper}`,
      })),
    })

    return NextResponse.json({
      success: true,
      historicalDays: dailyCounts.size,
      lastWeekVolume: lastWeekCount,
      recentTrend: Math.round(recentTrend * 100),
      forecasts,
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
