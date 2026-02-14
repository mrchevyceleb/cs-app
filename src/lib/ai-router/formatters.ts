/**
 * Channel Response Formatters
 * Format AI responses appropriately for each channel
 */

import type { ChannelType } from '@/types/channels';

/**
 * Format a response for a specific channel
 */
export function formatResponseForChannel(
  content: string,
  channel: ChannelType
): string {
  switch (channel) {
    case 'email':
      return formatForEmail(content);
    case 'widget':
    case 'portal':
    case 'dashboard':
      return formatForChat(content);
    default:
      return content;
  }
}

/**
 * Format response for email
 * - Keep markdown (will be converted to HTML by email service)
 * - Add greeting if missing
 * - Add sign-off if missing
 */
function formatForEmail(content: string): string {
  let formatted = content.trim();

  // Check for greeting
  const hasGreeting = /^(hi|hello|hey|dear|good morning|good afternoon|good evening)/i.test(formatted);
  if (!hasGreeting) {
    formatted = 'Hello,\n\n' + formatted;
  }

  // Check for sign-off
  const hasSignoff = /(regards|sincerely|thank you|thanks|best|cheers)[\s,]*$/i.test(formatted);
  if (!hasSignoff) {
    formatted = formatted + '\n\nBest regards,\nSupport Team';
  }

  return formatted;
}

/**
 * Format response for chat (widget/portal/dashboard)
 * - Keep basic markdown
 * - Ensure reasonable length
 */
function formatForChat(content: string): string {
  // Chat can handle most markdown, just clean up
  return content
    .replace(/\n{3,}/g, '\n\n')  // Multiple newlines
    .trim();
}

/**
 * Split a long message into multiple parts for channels with size limits
 */
export function splitMessage(
  content: string,
  maxLength: number,
  separator: string = '\n\n'
): string[] {
  if (content.length <= maxLength) {
    return [content];
  }

  const parts: string[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      parts.push(remaining);
      break;
    }

    // Find a good break point
    let breakPoint = remaining.lastIndexOf(separator, maxLength);

    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      // Try other separators
      breakPoint = remaining.lastIndexOf('\n', maxLength);
    }

    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf('. ', maxLength);
      if (breakPoint !== -1) breakPoint++; // Include the period
    }

    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      breakPoint = remaining.lastIndexOf(' ', maxLength);
    }

    if (breakPoint === -1) {
      breakPoint = maxLength;
    }

    parts.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }

  return parts;
}

/**
 * Truncate content with ellipsis
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Try to break at word boundary
  const truncated = content.slice(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength - 20) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Strip all formatting from content
 */
export function stripFormatting(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/>\s+/g, '')
    .replace(/[-*+]\s+/g, '')
    .trim();
}
