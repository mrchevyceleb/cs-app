'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function SettingsPage() {
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
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input defaultValue="Agent Demo" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input defaultValue="agent@r-link.com" disabled />
            </div>
          </div>
          <Button className="bg-primary-600 hover:bg-primary-700 text-white">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500">Switch between light and dark themes</p>
            </div>
<ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sounds</p>
              <p className="text-sm text-gray-500">Enable notification sounds</p>
            </div>
            <Button variant="outline" size="sm">
              Disabled
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Nova AI Settings */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Nova AI Copilot</CardTitle>
          <CardDescription>Configure your AI assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-suggestions</p>
              <p className="text-sm text-gray-500">Show response suggestions automatically</p>
            </div>
            <Button variant="outline" size="sm">
              Enabled
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Confidence threshold</p>
              <p className="text-sm text-gray-500">Minimum AI confidence for auto-responses</p>
            </div>
            <Input type="number" defaultValue="70" className="w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
