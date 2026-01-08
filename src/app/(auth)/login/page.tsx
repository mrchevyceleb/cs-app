'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signInWithMagicLink } from '@/lib/supabase/actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', email)

    const result = await signInWithMagicLink(formData)

    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    } else {
      setEmailSent(true)
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md mx-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200 dark:border-gray-800 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            We sent a magic link to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            Click the link in the email to sign in to your account.
            The link will expire in 24 hours.
          </p>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEmailSent(false)
              setEmail('')
            }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-gray-200 dark:border-gray-800 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-gray-400">
          Sign in to access the support dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(error || errorParam) && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || errorParam}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="agent@r-link.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending magic link...
              </div>
            ) : (
              'Continue with Email'
            )}
          </Button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            We&apos;ll send you a magic link to sign in instantly.
            <br />
            No password required.
          </p>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <p className="text-xs text-center text-gray-400">
            Or try the demo without signing in
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-primary-200 text-primary-600 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-400 dark:hover:bg-primary-950"
            onClick={() => {
              document.cookie = 'demo_mode=true; path=/; max-age=86400'
              window.location.href = '/'
            }}
          >
            <span className="mr-2">🚀</span>
            Enter Demo Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
