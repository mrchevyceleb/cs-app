'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketInfo {
  ticketId: string
  ticketSubject: string
  customerName: string | null
  customerId: string | null
}

type FeedbackState = 'loading' | 'ready' | 'submitting' | 'submitted' | 'error' | 'expired' | 'already_submitted'

export default function FeedbackPage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<FeedbackState>('loading')
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null)
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/feedback/${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 410 || data.error?.includes('expired')) {
            setState('expired')
          } else if (response.status === 409 || data.error?.includes('already')) {
            setState('already_submitted')
          } else {
            setState('error')
            setErrorMessage(data.error || 'Invalid feedback link')
          }
          return
        }

        setTicketInfo(data)
        setState('ready')
      } catch {
        setState('error')
        setErrorMessage('Failed to validate feedback link')
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async () => {
    if (rating === 0) return

    setState('submitting')

    try {
      const response = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setState('submitted')
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit feedback')
    }
  }

  const displayRating = hoveredRating || rating

  // Render different states
  if (state === 'loading') {
    return (
      <FeedbackLayout>
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading feedback form...</p>
          </CardContent>
        </Card>
      </FeedbackLayout>
    )
  }

  if (state === 'expired') {
    return (
      <FeedbackLayout>
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Feedback Link Expired
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              This feedback link has expired. Please contact support if you still wish to provide feedback.
            </p>
          </CardContent>
        </Card>
      </FeedbackLayout>
    )
  }

  if (state === 'already_submitted') {
    return (
      <FeedbackLayout>
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Feedback Already Submitted
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              You have already submitted feedback for this support request. Thank you for your input!
            </p>
          </CardContent>
        </Card>
      </FeedbackLayout>
    )
  }

  if (state === 'error') {
    return (
      <FeedbackLayout>
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              {errorMessage || 'Unable to load the feedback form. Please try again later.'}
            </p>
          </CardContent>
        </Card>
      </FeedbackLayout>
    )
  }

  if (state === 'submitted') {
    return (
      <FeedbackLayout>
        <Card className="w-full max-w-lg overflow-hidden">
          {/* Success animation background */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-transparent dark:from-green-900/20 dark:to-transparent pointer-events-none" />

          <CardContent className="flex flex-col items-center justify-center py-12 text-center relative">
            {/* Animated checkmark */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 animate-in zoom-in duration-500 delay-150" />
              </div>
              {/* Celebration dots */}
              <div className="absolute -top-2 -left-2 w-3 h-3 rounded-full bg-green-400 animate-ping" />
              <div className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-green-300 animate-ping delay-100" />
              <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-green-500 animate-ping delay-200" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2 animate-in slide-in-from-bottom duration-300 delay-200">
              Thank You!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm animate-in slide-in-from-bottom duration-300 delay-300">
              Your feedback helps us improve our service. We truly appreciate you taking the time to share your experience.
            </p>

            {/* Display the rating they gave */}
            <div className="mt-6 flex items-center gap-1 animate-in fade-in duration-500 delay-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-6 w-6',
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 animate-in fade-in duration-500 delay-500">
              You rated your experience {rating} out of 5 stars
            </p>
          </CardContent>
        </Card>
      </FeedbackLayout>
    )
  }

  // Ready state - show the feedback form
  return (
    <FeedbackLayout>
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">How was your experience?</CardTitle>
          <CardDescription className="text-base">
            {ticketInfo?.ticketSubject && (
              <span className="block mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Regarding: {ticketInfo.ticketSubject}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Star Rating */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    className={cn(
                      'h-10 w-10 sm:h-12 sm:w-12 transition-colors duration-150',
                      star <= displayRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Rating description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 h-5">
              {displayRating === 1 && 'Very Unsatisfied'}
              {displayRating === 2 && 'Unsatisfied'}
              {displayRating === 3 && 'Neutral'}
              {displayRating === 4 && 'Satisfied'}
              {displayRating === 5 && 'Very Satisfied'}
            </p>
          </div>

          {/* Comment textarea */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional comments (optional)
            </label>
            <Textarea
              id="comment"
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
              {comment.length}/500 characters
            </p>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || state === 'submitting'}
            className="w-full h-12 text-base font-medium"
          >
            {state === 'submitting' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>

          {rating === 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Please select a star rating to continue
            </p>
          )}
        </CardContent>
      </Card>
    </FeedbackLayout>
  )
}

function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo/Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            R-Link Support
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customer Satisfaction Survey
          </p>
        </div>

        {children}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Your feedback is anonymous and helps us improve our service.
        </p>
      </div>
    </div>
  )
}
