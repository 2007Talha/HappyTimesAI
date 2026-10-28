/**
 * @fileoverview XSS and control-character sanitization for user inputs.
 *
 * Removes potentially dangerous HTML, script injections, and control
 * characters while preserving legitimate content. All user-facing text
 * passes through {@link sanitizeInput} before being forwarded to the
 * LLM or stored in application state.
 *
 * @module lib/security/sanitizer
 *
 * @example
 * ```ts
 * import { sanitizeInput, sanitizeObject } from '@/lib/security/sanitizer';
 *
 * const clean = sanitizeInput(rawUserString);
 * const cleanForm = sanitizeObject(formValues);
 * ```
 */

/** Characters and patterns to strip from user input */
const DANGEROUS_PATTERNS: RegExp[] = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
  /<\s*embed\b/gi,
  /<\s*object\b/gi,
  /<\s*applet\b/gi,
  /<\s*form\b/gi,
  /<\s*meta\b/gi,
  /<\s*link\b[^>]*\bhref\b/gi,
];

/**
 * Control characters to remove.
 * Preserves newline (0x0A), carriage return (0x0D), and tab (0x09).
 */
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Maximum allowed length for a single sanitized string (DoS protection) */
const MAX_INPUT_LENGTH = 5000;

/** Threshold for collapsing excessive consecutive whitespace */
const MAX_CONSECUTIVE_WHITESPACE = 10;

/**
 * Sanitize a user input string by removing XSS vectors and control characters.
 *
 * Processing order:
 * 1. Strip control characters (preserve \\n, \\r, \\t)
 * 2. Remove dangerous HTML/script patterns
 * 3. HTML-entity-encode remaining angle brackets and quotes
 * 4. Collapse excessive whitespace runs
 * 5. Truncate to {@link MAX_INPUT_LENGTH}
 *
 * @param input - Raw user input string
 * @returns Sanitized string safe for processing and display
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  // 1. Remove control characters (preserving newline, CR, tab)
  sanitized = sanitized.replace(CONTROL_CHAR_REGEX, '');

  // 2. Strip dangerous HTML/script patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // 3. Encode remaining HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  // 4. Trim excessive whitespace (10+ consecutive → single space)
  const whitespacePattern = new RegExp(`\\s{${MAX_CONSECUTIVE_WHITESPACE},}`, 'g');
  sanitized = sanitized.replace(whitespacePattern, ' ').trim();

  // 5. Limit length to prevent DoS
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }

  return sanitized;
}

/**
 * Sanitize all string values in an object recursively.
 *
 * Walks the object tree and applies {@link sanitizeInput} to every
 * string leaf. Arrays of strings are mapped; nested objects are
 * recursed into. Non-string, non-object values are passed through
 * unchanged.
 *
 * @typeParam T - Shape of the input object (preserved in return type)
 * @param obj - Object with potentially unsafe string values
 * @returns New object with all string values sanitized
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: unknown) =>
        typeof item === 'string' ? sanitizeInput(item) : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
