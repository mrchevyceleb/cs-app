'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, KeyRound, ArrowRight } from 'lucide-react'

export default function PortalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState('')

  // Check for token in URL on mount
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      validateAndRedirect(token)
    }
  }, [searchParams])

  async function validateAndRedirect(token: string) {
    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Invalid or expired token')
        setIsValidating(false)
        return
      }

      // Token is valid - store it and redirect
      // Set cookie for subsequent requests
      document.cookie = `portal_token=${token}; path=/portal; max-age=${60 * 60 * 24 * 30}; samesite=strict`

      // If token is for a specific ticket, go directly there
      if (data.session?.ticketId) {
        router.push(`/portal/tickets/${data.session.ticketId}`)
      } else {
        // Otherwise, go to ticket list
        router.push('/portal/tickets')
      }
    } catch (err) {
      console.error('Validation error:', err)
      setError('Unable to validate token. Please try again.')
      setIsValidating(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualToken.trim()) {
      validateAndRedirect(manualToken.trim())
    }
  }

  // Show loading while validating token from URL
  if (isValidating && searchParams.get('token')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-400">Validating your access...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <CardTitle className="text-xl">Access Your Tickets</CardTitle>
          <CardDescription>
            Enter your access token to view and manage your support tickets
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  If you continue to have issues, please contact support.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter your access token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                disabled={isValidating}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Your access token was sent to your email when you contacted support.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!manualToken.trim() || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Access Portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Need help? Contact us at{' '}
              <a
                href="mailto:support@r-link.io"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                support@r-link.io
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
