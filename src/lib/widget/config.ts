// Widget configuration utilities

import type { WidgetConfig } from '@/types/widget'
import { DEFAULT_WIDGET_CONFIG } from '@/types/widget'

/**
 * Parse widget configuration from data attributes
 */
export function parseWidgetConfig(attributes: Record<string, string | undefined>): Partial<WidgetConfig> {
  const config: Partial<WidgetConfig> = {}

  if (attributes['data-position']) {
    const position = attributes['data-position']
    if (position === 'bottom-right' || position === 'bottom-left') {
      config.position = position
    }
  }

  if (attributes['data-primary-color']) {
    config.primaryColor = attributes['data-primary-color']
  }

  if (attributes['data-greeting']) {
    config.greeting = attributes['data-greeting']
  }

  if (attributes['data-company-name']) {
    config.companyName = attributes['data-company-name']
  }

  if (attributes['data-theme']) {
    const theme = attributes['data-theme']
    if (theme === 'light' || theme === 'dark' || theme === 'auto') {
      config.theme = theme
    }
  }

  if (attributes['data-z-index']) {
    const zIndex = parseInt(attributes['data-z-index'], 10)
    if (!isNaN(zIndex)) {
      config.zIndex = zIndex
    }
  }

  return config
}

/**
 * Merge partial config with defaults
 */
export function mergeWidgetConfig(partial: Partial<WidgetConfig>): WidgetConfig {
  return {
    ...DEFAULT_WIDGET_CONFIG,
    ...partial,
  }
}

/**
 * Generate CSS variables from widget config
 */
export function generateWidgetCSSVariables(config: WidgetConfig): Record<string, string> {
  // Convert hex to RGB for opacity variants
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const primaryRgb = hexToRgb(config.primaryColor)
  const primaryRgbStr = primaryRgb ? `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}` : '79, 70, 229'

  return {
    '--widget-primary': config.primaryColor,
    '--widget-primary-rgb': primaryRgbStr,
    '--widget-z-index': String(config.zIndex || DEFAULT_WIDGET_CONFIG.zIndex),
  }
}

/**
 * Get launcher position styles
 */
export function getLauncherPositionStyles(position: WidgetConfig['position']): {
  bottom: string
  right?: string
  left?: string
} {
  const base = { bottom: '20px' }

  if (position === 'bottom-left') {
    return { ...base, left: '20px' }
  }

  return { ...base, right: '20px' }
}

/**
 * Get widget container position styles
 */
export function getContainerPositionStyles(position: WidgetConfig['position']): {
  bottom: string
  right?: string
  left?: string
} {
  const base = { bottom: '90px' } // Above launcher button

  if (position === 'bottom-left') {
    return { ...base, left: '20px' }
  }

  return { ...base, right: '20px' }
}
