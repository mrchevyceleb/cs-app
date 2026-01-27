'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'

type CustomerOption = {
  id: string
  name: string | null
  email: string | null
}

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function NewTicketPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [subject, setSubject] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [priority, setPriority] = useState('normal')

  useEffect(() => {
    let isMounted = true

    const loadCustomers = async () => {
      setIsLoadingCustomers(true)
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Failed to load customers:', error)
          if (isMounted) {
            toast({
              type: 'warning',
              title: 'Unable to load customers',
              description: 'You can still create a ticket by entering an email manually.',
            })
          }
          return
        }

        if (isMounted) {
          setCustomers(data || [])
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false)
        }
      }
    }

    loadCustomers()

    return () => {
      isMounted = false
    }
  }, [supabase, toast])

  const handleEmailChange = (value: string) => {
    setCustomerEmail(value)
    const match = customers.find((c) => c.email?.toLowerCase() === value.trim().toLowerCase())
    if (match) {
      setCustomerName(match.name || '')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const normalizedEmail = customerEmail.trim().toLowerCase()
    const trimmedSubject = subject.trim()

    if (!normalizedEmail || !trimmedSubject) {
      toast({
        type: 'error',
        title: 'Missing required fields',
        description: 'Customer email and subject are required.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      let customerId: string | null = null

      const { data: existingCustomer, error: existingError } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('email', normalizedEmail)
        .single()

      if (existingCustomer && !existingError) {
        customerId = existingCustomer.id
        if (customerName.trim() && customerName.trim() !== (existingCustomer.name || '')) {
          await supabase
            .from('customers')
            .update({ name: customerName.trim() })
            .eq('id', existingCustomer.id)
        }
      } else if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      if (!customerId) {
        const { data: createdCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            email: normalizedEmail,
            name: customerName.trim() || null,
            metadata: { source: 'dashboard' },
          })
          .select('id')
          .single()

        if (createError) {
          const isDuplicate = createError.code === '23505' || createError.message?.includes('duplicate')
          if (isDuplicate) {
            const { data: fallbackCustomer, error: fallbackError } = await supabase
              .from('customers')
              .select('id')
              .eq('email', normalizedEmail)
              .single()

            if (fallbackError || !fallbackCustomer) {
              throw createError
            }

            customerId = fallbackCustomer.id
          } else {
            throw createError
          }
        } else {
          customerId = createdCustomer.id
        }
      }

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subject: trimmedSubject,
          initialMessage: initialMessage.trim() || undefined,
          priority,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create ticket')
      }

      const data = await response.json()
      const ticketId = data.ticket?.id as string | undefined

      toast({
        type: 'success',
        title: 'Ticket created',
        description: 'The ticket is ready for review.',
      })

      if (ticketId) {
        router.push(`/tickets/${ticketId}`)
      } else {
        router.push('/tickets')
      }
    } catch (error) {
      console.error('Create ticket error:', error)
      toast({
        type: 'error',
        title: 'Failed to create ticket',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Ticket</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Create a support request and notify the customer.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/tickets')}>
          Cancel
        </Button>
      </div>

      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-lg">Ticket details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => handleEmailChange(event.target.value)}
                  placeholder="customer@company.com"
                  required
                  list="customer-email-list"
                />
                <datalist id="customer-email-list">
                  {customers
                    .filter((customer) => customer.email)
                    .map((customer) => (
                      <option key={customer.id} value={customer.email ?? ''} />
                    ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  {isLoadingCustomers
                    ? 'Loading recent customers...'
                    : 'Select a recent customer or type a new email.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Brief summary of the issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialMessage">Initial message</Label>
              <Textarea
                id="initialMessage"
                value={initialMessage}
                onChange={(event) => setInitialMessage(event.target.value)}
                placeholder="Add a short message to include with the ticket."
                className="min-h-[140px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create ticket'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/tickets')}
                disabled={isSubmitting}
              >
                Back to tickets
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
