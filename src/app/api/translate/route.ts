import { NextRequest, NextResponse } from 'next/server'
import { detectLanguage, translateText } from '@/lib/openai/chat'

// POST /api/translate - Translate text between languages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      text,
      sourceLanguage,
      targetLanguage,
      autoDetect = false,
    } = body

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text' },
        { status: 400 }
      )
    }

    if (!autoDetect && (!sourceLanguage || !targetLanguage)) {
      return NextResponse.json(
        { error: 'Missing sourceLanguage or targetLanguage (or set autoDetect=true)' },
        { status: 400 }
      )
    }

    let detectedLanguage = sourceLanguage

    // Auto-detect source language if not provided
    if (autoDetect || !sourceLanguage) {
      detectedLanguage = await detectLanguage(text)
    }

    // Default target language to English if not provided
    const target = targetLanguage || 'en'

    // Skip translation if source and target are the same
    if (detectedLanguage === target) {
      return NextResponse.json({
        translatedText: text,
        sourceLanguage: detectedLanguage,
        targetLanguage: target,
        wasTranslated: false,
      })
    }

    // Perform translation
    const translatedText = await translateText(text, detectedLanguage, target)

    return NextResponse.json({
      translatedText,
      sourceLanguage: detectedLanguage,
      targetLanguage: target,
      wasTranslated: true,
    })
  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/translate/detect - Detect language only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const text = searchParams.get('text')

    if (!text) {
      return NextResponse.json(
        { error: 'Missing text parameter' },
        { status: 400 }
      )
    }

    const detectedLanguage = await detectLanguage(text)

    // Language names for display
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      tl: 'Tagalog',
      hi: 'Hindi',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
    }

    return NextResponse.json({
      language: detectedLanguage,
      languageName: languageNames[detectedLanguage] || detectedLanguage,
    })
  } catch (error) {
    console.error('Language detection API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
