type Style = 'bold' | 'italic' | 'boldItalic';

const SANS = {
  bold: { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic: { upper: 0x1d608, lower: 0x1d622, digit: null },
  boldItalic: { upper: 0x1d63c, lower: 0x1d656, digit: 0x1d7ec },
} as const;

const URL_PATTERN = /^https?:\/\/\S+/i;
const MENTION_PATTERN = /^@\[[^\]\n]+\]\(urn:li:(?:person|organization):[A-Za-z0-9_-]+\)/;
const MENTION_PATTERN_GLOBAL = /@\[[^\]\n]+\]\(urn:li:(?:person|organization):[A-Za-z0-9_-]+\)/g;
const MARKDOWN_LINK_PATTERN = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/i;

const HEADER_LINE = /^\s{0,3}#{1,6}\s+(.*)$/;
const BULLET_LINE = /^\s{0,3}[-+*]\s+(.*)$/;
const ORDERED_LINE = /^\s{0,3}(\d+[.)])\s+(.*)$/;
const QUOTE_LINE = /^\s{0,3}>\s?(.*)$/;

const LITTLE_TEXT_RESERVED = new Set(['\\', '|', '{', '}', '@', '[', ']', '(', ')', '<', '>', '#', '*', '_', '~']);

export function formatForLinkedIn(text: string): string {
  return text.split('\n').map(formatLine).join('\n');
}

function formatLine(line: string): string {
  const header = HEADER_LINE.exec(line);
  if (header) {

    return applyStyle(formatInline(header[1].trim()), 'bold', { uppercase: true });
  }

  const bullet = BULLET_LINE.exec(line);
  if (bullet) {
    return `• ${formatInline(bullet[1])}`;
  }

  const ordered = ORDERED_LINE.exec(line);
  if (ordered) {
    return `${ordered[1]} ${formatInline(ordered[2])}`;
  }

  const quote = QUOTE_LINE.exec(line);
  if (quote) {
    return applyStyle(formatInline(quote[1]), 'italic');
  }

  return formatInline(line);
}

export function escapeLittleText(text: string): string {
  let output = '';
  let index = 0;

  while (index < text.length) {
    const live = readLiveSpan(text, index);
    if (live !== null) {
      output += text.slice(index, live);
      index = live;
      continue;
    }

    const char = text[index];
    output += LITTLE_TEXT_RESERVED.has(char) ? `\\${char}` : char;
    index += 1;
  }

  return output;
}

export function assertLittleText(text: string): void {
  let index = 0;

  while (index < text.length) {
    const live = readLiveSpan(text, index);
    if (live !== null) {
      index = live;
      continue;
    }

    const char = text[index];
    if (char === '\\') {
      const next = text[index + 1];
      if (next === undefined || !LITTLE_TEXT_RESERVED.has(next)) {
        throw new Error(`little-text: dangling backslash at ${index}: ${context(text, index)}`);
      }
      index += 2;
      continue;
    }

    if (LITTLE_TEXT_RESERVED.has(char)) {
      throw new Error(`little-text: unescaped "${char}" at ${index}: ${context(text, index)}`);
    }

    index += 1;
  }
}

export function truncateCodePoints(text: string, max: number): string {
  if (max <= 0) {
    return '';
  }

  const codePoints = Array.from(text);
  if (codePoints.length <= max) {
    return text;
  }

  if (max <= 3) {
    return '.'.repeat(max);
  }

  let cut = max - 3;
  for (const span of mentionSpansInCodePoints(text)) {
    if (cut > span.start && cut < span.end) {
      cut = span.start;
      break;
    }
  }

  while (cut > 0 && codePoints[cut - 1] === '#') {
    cut -= 1;
  }

  let run = 0;
  while (cut - 1 - run >= 0 && codePoints[cut - 1 - run] === '\\') {
    run += 1;
  }
  if (run % 2 === 1) {
    cut -= 1;
  }

  return codePoints.slice(0, cut).join('').replace(/\s+$/, '') + '...';
}

export function mentionSpansInCodePoints(text: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(MENTION_PATTERN_GLOBAL)) {
    const start = Array.from(text.slice(0, match.index)).length;
    spans.push({ start, end: start + Array.from(match[0]).length });
  }
  return spans;
}

function context(text: string, index: number): string {
  return JSON.stringify(text.slice(Math.max(0, index - 20), index + 20));
}

function readLiveSpan(text: string, index: number): number | null {
  const rest = text.slice(index);

  const url = URL_PATTERN.exec(rest);
  if (url) {
    return index + url[0].length;
  }

  const mention = MENTION_PATTERN.exec(rest);
  if (mention) {
    return index + mention[0].length;
  }

  if (isHashtagStart(text, index)) {
    return index + 1;
  }

  return null;
}

function isHashtagStart(text: string, index: number): boolean {
  if (text[index] !== '#') {
    return false;
  }
  const prev = index === 0 ? ' ' : text[index - 1];
  const next = text[index + 1] ?? '';
  return /\s/.test(prev) && /\p{L}/u.test(next);
}

function formatInline(text: string): string {
  let output = '';
  let index = 0;

  while (index < text.length) {
    const protectedEnd = getProtectedSpanEnd(text, index);
    if (protectedEnd !== null) {
      output += text.slice(index, protectedEnd);
      index = protectedEnd;
      continue;
    }

    const link = MARKDOWN_LINK_PATTERN.exec(text.slice(index));
    if (link) {
      output += `${formatInline(link[1])}: ${link[2]}`;
      index += link[0].length;
      continue;
    }

    const escaped = readEscape(text, index);
    if (escaped !== null) {
      output += escaped.value;
      index = escaped.end;
      continue;
    }

    const marker = readMarker(text, index);
    if (marker !== null) {
      const closingIndex = findClosingMarker(text, index + marker.token.length, marker.token);
      if (closingIndex === -1) {
        output += marker.token;
        index += marker.token.length;
        continue;
      }

      output += applyStyle(text.slice(index + marker.token.length, closingIndex), marker.style);
      index = closingIndex + marker.token.length;
      continue;
    }

    output += text[index];
    index += 1;
  }

  return output;
}

function readMarker(text: string, index: number): { token: string; style: Style } | null {
  if (text.startsWith('***', index)) {
    return { token: '***', style: 'boldItalic' };
  }

  if (text.startsWith('**', index)) {
    return { token: '**', style: 'bold' };
  }

  if (text[index] === '*') {
    return { token: '*', style: 'italic' };
  }

  return null;
}

function findClosingMarker(text: string, start: number, marker: string): number {
  let index = start;

  while (index < text.length) {
    const protectedEnd = getProtectedSpanEnd(text, index);
    if (protectedEnd !== null) {
      index = protectedEnd;
      continue;
    }

    const escaped = readEscape(text, index);
    if (escaped !== null) {
      index = escaped.end;
      continue;
    }

    if (text.startsWith(marker, index)) {
      return index;
    }

    index += 1;
  }

  return -1;
}

function applyStyle(text: string, style: Style, options: { uppercase?: boolean } = {}): string {
  let output = '';
  let index = 0;

  while (index < text.length) {
    const protectedEnd = getProtectedSpanEnd(text, index);
    if (protectedEnd !== null) {
      output += text.slice(index, protectedEnd);
      index = protectedEnd;
      continue;
    }

    const escaped = readEscape(text, index);
    if (escaped !== null) {
      output += escaped.value;
      index = escaped.end;
      continue;
    }

    const char = options.uppercase ? text[index].toUpperCase() : text[index];
    output += convertChar(char, style);
    index += 1;
  }

  return output;
}

function convertChar(char: string, style: Style): string {
  const code = char.charCodeAt(0);
  const block = SANS[style];

  if (code >= 0x41 && code <= 0x5a) {
    return String.fromCodePoint(block.upper + (code - 0x41));
  }

  if (code >= 0x61 && code <= 0x7a) {
    return String.fromCodePoint(block.lower + (code - 0x61));
  }

  if (code >= 0x30 && code <= 0x39 && block.digit !== null) {
    return String.fromCodePoint(block.digit + (code - 0x30));
  }

  return char;
}

function getProtectedSpanEnd(text: string, index: number): number | null {
  const rest = text.slice(index);

  const url = URL_PATTERN.exec(rest);
  if (url) {
    return index + url[0].length;
  }

  const mention = MENTION_PATTERN.exec(rest);
  if (mention) {
    return index + mention[0].length;
  }

  if (text[index] === '`') {
    const end = text.indexOf('`', index + 1);
    if (end === -1) {
      return text.length;
    }

    return end + 1;
  }

  return null;
}

function readEscape(text: string, index: number): { value: string; end: number } | null {
  if (text[index] !== '\\') {
    return null;
  }

  if (index + 1 >= text.length) {
    return { value: '\\', end: index + 1 };
  }

  const next = text[index + 1];
  if (next === '*' || next === '\\') {
    return { value: next, end: index + 2 };
  }

  return { value: `\\${next}`, end: index + 2 };
}
