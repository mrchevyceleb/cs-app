'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquareHeart,
  Copy,
  Check,
  Mail,
  ExternalLink,
  Loader2,
  Star,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackRequestProps {
  ticketId: string
  ticketSubject?: string
  customerEmail?: string | null
  customerName?: string | null
  variant?: 'button' | 'icon' | 'compact'
  className?: string
  onFeedbackRequested?: (feedbackUrl: string) => void
}

interface FeedbackRequestResult {
  feedbackId: string
  feedbackToken: string
  feedbackUrl: string
  expiresAt?: string
  existing?: boolean
}

export function FeedbackRequest({
  ticketId,
  ticketSubject,
  customerEmail,
  customerName,
  variant = 'button',
  className,
  onFeedbackRequested,
}: FeedbackRequestProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FeedbackRequestResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRequestFeedback = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          expiresInDays: 7,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate feedback link')
      }

      setResult(data)
      onFeedbackRequested?.(data.feedbackUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!result?.feedbackUrl) return

    try {
      await navigator.clipboard.writeText(result.feedbackUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy link to clipboard')
    }
  }

  const handleOpenLink = () => {
    if (result?.feedbackUrl) {
      window.open(result.feedbackUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setResult(null)
      setError(null)
      setCopied(false)
    }, 200)
  }

  const renderTrigger = () => {
    switch (variant) {
      case 'icon':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', className)}
                >
                  <MessageSquareHeart className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Request Feedback</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )

      case 'compact':
        return (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-1.5', className)}
          >
            <Star className="h-3.5 w-3.5" />
            Feedback
          </Button>
        )

      default:
        return (
          <Button
            variant="outline"
            className={cn('gap-2', className)}
          >
            <MessageSquareHeart className="h-4 w-4" />
            Request Feedback
          </Button>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-blue-500" />
            Request Customer Feedback
          </DialogTitle>
          <DialogDescription>
            Generate a feedback link to send to the customer for this ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket info */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Ticket
              </span>
              <Badge variant="secondary" className="text-xs">
                #{ticketId.slice(0, 8).toUpperCase()}
              </Badge>
            </div>
            {ticketSubject && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {ticketSubject}
              </p>
            )}
            {customerName && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customer: {customerName}
                {customerEmail && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {' '}({customerEmail})
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Result state */}
          {result && (
            <div className="space-y-3">
              {result.existing && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    A feedback link already exists for this ticket.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Feedback Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
                    {result.feedbackUrl}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCopyLink}
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied ? 'Copied!' : 'Copy link'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleOpenLink}
                          className="flex-shrink-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open in new tab</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {result.expiresAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This link expires on {new Date(result.expiresAt).toLocaleDateString()}
                </p>
              )}

              {/* Instructions */}
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 space-y-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  How to use this link:
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Copy and paste into a message to the customer</li>
                  <li>Include in a follow-up email</li>
                  <li>Send via your preferred communication channel</li>
                </ul>
              </div>
            </div>
          )}

          {/* Initial state - show generate button */}
          {!result && !error && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Generate a unique link to collect customer feedback about their support experience.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRequestFeedback} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageSquareHeart className="h-4 w-4 mr-2" />
                    Generate Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              {customerEmail && (
                <Button
                  onClick={() => {
                    window.location.href = `mailto:${customerEmail}?subject=We'd love your feedback&body=Hi ${customerName || 'there'},%0D%0A%0D%0AWe hope your support experience was helpful! Please take a moment to share your feedback:%0D%0A%0D%0A${encodeURIComponent(result.feedbackUrl)}%0D%0A%0D%0AThank you!`
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send via Email
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
