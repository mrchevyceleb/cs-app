'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Copy, Check } from 'lucide-react'

interface WidgetSettings {
  id: string
  company_name: string
  greeting: string
  primary_color: string
  position: 'bottom-right' | 'bottom-left'
  theme: 'light' | 'dark' | 'auto'
  created_at: string
  updated_at: string
}

export default function WidgetSettingsPage() {
  const [settings, setSettings] = useState<WidgetSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedField, setCopiedField] = useState<'embedCode' | null>(null)

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [greeting, setGreeting] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#4F46E5')
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/widget/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(data.settings)
          setCompanyName(data.settings.company_name)
          setGreeting(data.settings.greeting)
          setPrimaryColor(data.settings.primary_color)
          setPosition(data.settings.position)
          setTheme(data.settings.theme)
        }
      } catch (error) {
        console.error('Failed to fetch widget settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/widget/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          greeting,
          primary_color: primaryColor,
          position,
          theme,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setSaveMessage({ type: 'success', text: 'Settings saved successfully' })
      } else {
        const error = await response.json()
        setSaveMessage({ type: 'error', text: error.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const copyToClipboard = useCallback(async (text: string, field: 'embedCode') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }, [])

  const getEmbedCode = () => {
    if (!settings) return ''
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `<script
  src="${baseUrl}/widget/loader.js"
  data-position="${position}"
  data-primary-color="${primaryColor}"
  data-company-name="${companyName}"
  data-theme="${theme}"
></script>`
  }

  const hasChanges = settings && (
    companyName !== settings.company_name ||
    greeting !== settings.greeting ||
    primaryColor !== settings.primary_color ||
    position !== settings.position ||
    theme !== settings.theme
  )

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Widget Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure and embed the support widget on your website
          </p>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3 rounded-md text-sm ${
          saveMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Configuration Card */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Widget Configuration</CardTitle>
          <CardDescription>Customize the appearance of your support widget</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Greeting Message</label>
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Hi! How can we help you today?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex gap-2">
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#4F46E5"
                    className="flex-1"
                  />
                  <div
                    className="w-10 h-10 rounded-md border border-border"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-md cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Position</label>
                  <Select value={position} onValueChange={(v) => setPosition(v as typeof position)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (System)</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="bg-primary-600 hover:bg-primary-700 text-white"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Embed Code Card */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Embed Code</CardTitle>
          <CardDescription>
            Copy this code and paste it before the closing &lt;/body&gt; tag on your website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="relative">
                <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {getEmbedCode()}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-1"
                  onClick={() => copyToClipboard(getEmbedCode(), 'embedCode')}
                >
                  {copiedField === 'embedCode' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                <p className="font-medium">Usage:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Add this script to any page where you want the widget to appear</li>
                  <li>The widget will automatically initialize when the page loads</li>
                  <li>Customers can click the widget to open a support chat</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
