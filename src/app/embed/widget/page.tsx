'use client'

import { useSearchParams } from 'next/navigation'
import ChatWidget from '@/components/chat/ChatWidget'
import { Suspense } from 'react'

function WidgetWithParams() {
  const searchParams = useSearchParams()

  // Extract optional customer info from URL params
  const customerName = searchParams.get('name') || undefined
  const customerEmail = searchParams.get('email') || undefined
  const language = searchParams.get('lang') || 'en'

  return (
    <ChatWidget
      customerName={customerName}
      customerEmail={customerEmail}
      language={language}
    />
  )
}

export default function WidgetPage() {
  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <WidgetWithParams />
      </Suspense>
    </div>
  )
}
