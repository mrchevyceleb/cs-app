// Widget postMessage communication utilities

import type {
  WidgetMessage,
  WidgetMessageType,
  WidgetConfig,
  WidgetIdentifyPayload,
} from '@/types/widget'

// Origin verification
let trustedOrigin: string | null = null

/**
 * Set the trusted origin for postMessage communication
 */
export function setTrustedOrigin(origin: string): void {
  trustedOrigin = origin
}

/**
 * Get the trusted origin
 */
export function getTrustedOrigin(): string | null {
  return trustedOrigin
}

/**
 * Send a message to the parent window (from iframe)
 */
export function sendToParent(type: WidgetMessageType, payload?: unknown): void {
  if (typeof window === 'undefined') return

  const message: WidgetMessage = { type, payload }

  // In iframe context, post to parent
  if (window.parent !== window) {
    window.parent.postMessage(message, '*')
  }
}

/**
 * Send a message to the widget iframe (from host page)
 */
export function sendToWidget(
  iframe: HTMLIFrameElement,
  type: WidgetMessageType,
  payload?: unknown,
  targetOrigin: string = '*'
): void {
  if (!iframe.contentWindow) return

  const message: WidgetMessage = { type, payload }
  iframe.contentWindow.postMessage(message, targetOrigin)
}

/**
 * Check if a message is a valid widget message
 */
export function isWidgetMessage(data: unknown): data is WidgetMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  return typeof msg.type === 'string' && msg.type.startsWith('widget:')
}

/**
 * Create a message handler for widget messages
 */
export function createMessageHandler(
  handlers: Partial<Record<WidgetMessageType, (payload: unknown) => void>>
): (event: MessageEvent) => void {
  return (event: MessageEvent) => {
    // Optionally verify origin
    if (trustedOrigin && event.origin !== trustedOrigin) {
      return
    }

    if (!isWidgetMessage(event.data)) {
      return
    }

    const handler = handlers[event.data.type]
    if (handler) {
      handler(event.data.payload)
    }
  }
}

/**
 * Subscribe to widget messages
 */
export function subscribeToMessages(
  handlers: Partial<Record<WidgetMessageType, (payload: unknown) => void>>
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = createMessageHandler(handlers)
  window.addEventListener('message', handler)

  return () => {
    window.removeEventListener('message', handler)
  }
}

// Host page API (window.csWidget)

export interface CSWidgetAPI {
  open: () => void
  close: () => void
  toggle: () => void
  identify: (payload: WidgetIdentifyPayload) => void
  setConfig: (config: Partial<WidgetConfig>) => void
  on: (event: string, callback: (data: unknown) => void) => void
  off: (event: string, callback: (data: unknown) => void) => void
}

/**
 * Create the public widget API for the host page
 */
export function createHostAPI(
  iframe: HTMLIFrameElement,
  targetOrigin: string = '*'
): CSWidgetAPI {
  const eventListeners = new Map<string, Set<(data: unknown) => void>>()

  return {
    open: () => sendToWidget(iframe, 'widget:open', undefined, targetOrigin),
    close: () => sendToWidget(iframe, 'widget:close', undefined, targetOrigin),
    toggle: () => {
      // Toggle is handled by the widget internally
      sendToWidget(iframe, 'widget:open', undefined, targetOrigin)
    },
    identify: (payload: WidgetIdentifyPayload) => {
      sendToWidget(iframe, 'widget:identify', payload, targetOrigin)
    },
    setConfig: (config: Partial<WidgetConfig>) => {
      sendToWidget(iframe, 'widget:init', { config }, targetOrigin)
    },
    on: (event: string, callback: (data: unknown) => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set())
      }
      eventListeners.get(event)!.add(callback)
    },
    off: (event: string, callback: (data: unknown) => void) => {
      const listeners = eventListeners.get(event)
      if (listeners) {
        listeners.delete(callback)
      }
    },
  }
}

// Iframe sizing utilities

export interface WidgetDimensions {
  width: number
  height: number
}

export const WIDGET_DIMENSIONS = {
  launcher: { width: 60, height: 60 },
  collapsed: { width: 60, height: 60 },
  expanded: { width: 400, height: 600 },
  mobile: { width: '100%' as const, height: '100%' as const },
} as const

/**
 * Check if we're on a mobile device
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 640
}

/**
 * Get widget dimensions based on state
 */
export function getWidgetDimensions(
  isOpen: boolean,
  isMobile: boolean = false
): { width: string; height: string } {
  if (!isOpen) {
    return {
      width: `${WIDGET_DIMENSIONS.collapsed.width}px`,
      height: `${WIDGET_DIMENSIONS.collapsed.height}px`,
    }
  }

  if (isMobile) {
    return {
      width: '100%',
      height: '100%',
    }
  }

  return {
    width: `${WIDGET_DIMENSIONS.expanded.width}px`,
    height: `${WIDGET_DIMENSIONS.expanded.height}px`,
  }
}
