'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton'
import { BookMarked, ChevronRight, Code2, Zap } from 'lucide-react'
import type { Agent } from '@/types/database'

interface Preferences {
  sounds: boolean
  autoSuggestions: boolean
  confidenceThreshold: number
}

const PREFERENCES_KEY = 'cs-app-preferences'

const defaultPreferences: Preferences = {
  sounds: false,
  autoSuggestions: true,
  confidenceThreshold: 70,
}

export default function SettingsPage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)

  // Load agent data
  useEffect(() => {
    async function fetchAgent() {
      try {
        const response = await fetch('/api/agents/me')
        if (response.ok) {
          const data = await response.json()
          setAgent(data.agent)
          setName(data.agent.name || '')
        }
      } catch (error) {
        console.error('Failed to fetch agent:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAgent()
  }, [])

  // Load preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPreferences({ ...defaultPreferences, ...parsed })
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  // Save preferences to localStorage
  const savePreferences = (newPrefs: Preferences) => {
    setPreferences(newPrefs)
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs))
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setSaveMessage({ type: 'error', text: 'Name cannot be empty' })
      return
    }

    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/agents/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setAgent(data.agent)
        setSaveMessage({ type: 'success', text: 'Profile updated successfully' })
      } else {
        const error = await response.json()
        setSaveMessage({ type: 'error', text: error.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      setSaveMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setIsSaving(false)
      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={agent?.email || ''} disabled />
                </div>
              </div>
              {saveMessage && (
                <p className={`text-sm ${saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {saveMessage.text}
                </p>
              )}
              <Button
                className="bg-primary-600 hover:bg-primary-700 text-white"
                onClick={handleSaveProfile}
                disabled={isSaving || name === agent?.name}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sounds</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable notification sounds</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => savePreferences({ ...preferences, sounds: !preferences.sounds })}
            >
              {preferences.sounds ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Canned Responses */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Canned Responses</CardTitle>
          <CardDescription>Manage pre-written responses for quick replies</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/canned-responses">
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <BookMarked className="h-4 w-4" />
                Manage Canned Responses
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Workflow Automation */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Workflow Automation</CardTitle>
          <CardDescription>Automate ticket routing and actions with custom rules</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/workflows">
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Manage Workflow Rules
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Widget Embed */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Widget Embed</CardTitle>
          <CardDescription>Configure and embed the support widget on your website</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/widget">
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-indigo-500" />
                Widget Settings
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Nova AI Settings */}
      <Card className="bg-card border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Nova AI Copilot</CardTitle>
          <CardDescription>Configure your AI assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-suggestions</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Show response suggestions automatically</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => savePreferences({ ...preferences, autoSuggestions: !preferences.autoSuggestions })}
            >
              {preferences.autoSuggestions ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Confidence threshold</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Minimum AI confidence for auto-responses</p>
            </div>
            <Input
              type="number"
              min="0"
              max="100"
              value={preferences.confidenceThreshold}
              onChange={(e) => {
                const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                savePreferences({ ...preferences, confidenceThreshold: value })
              }}
              className="w-20"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

