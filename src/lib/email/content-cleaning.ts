/**
 * Utilities for cleaning inbound email content so dashboard messages read like chat.
 */

const QUOTE_BOUNDARY_PATTERNS = [
  /^\s*>?\s*On .+wrote:\s*$/i,
  /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i,
  /^\s*Begin forwarded message:\s*$/i,
  /^\s*-{2,}\s*Forwarded message\s*-{2,}\s*$/i,
  /^\s*_{5,}\s*$/,
];

const OUTLOOK_HEADER_LINE = /^\s*(from|sent|to|subject):\s+.+/i;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function htmlToPlainText(html: string): string {
  return normalizeNewlines(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/(p|div|li|tr|h1|h2|h3|h4|h5|h6)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasVisibleContentAbove(lines: string[], index: number): boolean {
  for (let i = 0; i < index; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!line.startsWith('>')) return true;
  }
  return false;
}

function looksLikeOutlookHeaderBlock(lines: string[], start: number): boolean {
  const window = lines.slice(start, start + 8);
  const headerKeys = new Set<string>();

  for (const line of window) {
    const match = line.match(/^\s*(from|sent|to|subject):/i);
    if (match) {
      headerKeys.add(match[1].toLowerCase());
    }
  }

  return headerKeys.has('from') && (headerKeys.has('sent') || headerKeys.has('to') || headerKeys.has('subject'));
}

export function extractLatestEmailReply(content: string): string {
  const normalized = normalizeNewlines(content).replace(/\u00a0/g, ' ');
  const lines = normalized.split('\n').map(line => line.replace(/[ \t]+$/g, ''));

  let splitAt = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (!hasVisibleContentAbove(lines, i)) {
      continue;
    }

    if (trimmed.startsWith('>')) {
      splitAt = i;
      break;
    }

    if (QUOTE_BOUNDARY_PATTERNS.some(pattern => pattern.test(trimmed))) {
      splitAt = i;
      break;
    }

    if (OUTLOOK_HEADER_LINE.test(trimmed) && looksLikeOutlookHeaderBlock(lines, i)) {
      splitAt = i;
      break;
    }
  }

  const cleaned = lines
    .slice(0, splitAt)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || normalized.trim();
}

export function getCleanInboundEmailBody(text?: string, html?: string): string {
  const plain = text && text.trim() ? normalizeNewlines(text).trim() : html ? htmlToPlainText(html) : '';
  if (!plain) return '';
  return extractLatestEmailReply(plain);
}

