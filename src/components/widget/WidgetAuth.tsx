'use client'

import { useState } from 'react'
import { Mail, User, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WidgetConfig } from '@/types/widget'

interface WidgetAuthProps {
  config: WidgetConfig
  onAuth: (email: string, name?: string) => Promise<boolean>
}

export function WidgetAuth({ config, onAuth }: WidgetAuthProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Please enter your email')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const success = await onAuth(email.trim(), name.trim() || undefined)
      if (!success) {
        setError('Authentication failed. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-6">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {config.greeting}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your email to start a conversation or view existing ones.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="space-y-4">
          {/* Email field */}
          <div>
            <label
              htmlFor="widget-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="widget-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className={cn(
                  'block w-full pl-10 pr-3 py-2.5',
                  'border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'text-sm'
                )}
                style={{
                  ['--tw-ring-color' as string]: config.primaryColor,
                }}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Name field (optional) */}
          <div>
            <label
              htmlFor="widget-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="widget-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={isLoading}
                className={cn(
                  'block w-full pl-10 pr-3 py-2.5',
                  'border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-white',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'focus:outline-none focus:ring-2 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'text-sm'
                )}
                style={{
                  ['--tw-ring-color' as string]: config.primaryColor,
                }}
                autoComplete="name"
              />
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'px-4 py-3 rounded-lg',
              'text-white font-medium',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !isLoading && 'hover:opacity-90'
            )}
            style={{
              backgroundColor: config.primaryColor,
              ['--tw-ring-color' as string]: config.primaryColor,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Privacy note */}
      <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
        By continuing, you agree to receive support communications.
      </p>
    </div>
  )
}
