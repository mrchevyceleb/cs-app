'use client'

import ChatWidget from '@/components/chat/ChatWidget'
import { Play, Users, ShoppingCart, Star, Zap } from 'lucide-react'

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      {/* Mock Website Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <span className="text-xl font-bold text-gray-900">R-Link</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-600 hover:text-purple-600 transition">Features</a>
            <a href="#" className="text-gray-600 hover:text-purple-600 transition">Pricing</a>
            <a href="#" className="text-gray-600 hover:text-purple-600 transition">About</a>
            <a href="#" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full mb-4">
            Live Social Selling Platform
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            The Future of Live Commerce
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            R-Link combines live streaming, interactive selling, and community engagement into one powerful platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition flex items-center gap-2">
              <Play className="w-5 h-5" />
              Start Free Trial
            </button>
            <button className="px-6 py-3 border border-gray-300 rounded-xl font-medium hover:border-purple-600 hover:text-purple-600 transition">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Streaming</h3>
            <p className="text-gray-600 text-sm">
              Host unlimited live streams with HD quality and real-time audience engagement.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">In-Stream Commerce</h3>
            <p className="text-gray-600 text-sm">
              Sell products directly during your live streams with one-click checkout.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Digital Rewards</h3>
            <p className="text-gray-600 text-sm">
              Gamify your streams with digital coins, badges, and exclusive rewards.
            </p>
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Star className="w-12 h-12 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Try the AI Support Widget
          </h2>
          <p className="text-gray-600 mb-4">
            Click the chat bubble in the bottom right corner to experience our AI-powered support. Try asking:
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
              "How do I start a live stream?"
            </span>
            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
              "What are digital rewards?"
            </span>
            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
              "How much does R-Link cost?"
            </span>
            <span className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700">
              "I need a refund"
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>This is a demo page showing the R-Link AI support widget integration.</p>
          <p className="mt-2">© 2024 R-Link • AI-Powered Customer Service Demo</p>
        </div>
      </footer>

      {/* The Chat Widget */}
      <ChatWidget
        customerName="Demo User"
        customerEmail="demo@example.com"
        language="en"
      />
    </div>
  )
}
