/**
 * @fileoverview PII (Personally Identifiable Information) redaction engine.
 *
 * Detects and redacts emails, phone numbers, SSNs, and physical addresses
 * before sending data to external LLM APIs. Each PII class is replaced with
 * a type-specific placeholder (e.g. `[EMAIL_REDACTED]`) so the LLM can
 * still reason about the *presence* of contact info without seeing the
 * actual values.
 *
 * @module lib/security/piiRedactor
 *
 * @example
 * ```ts
 * import { redactPii, containsPii } from '@/lib/security/piiRedactor';
 *
 * const { redactedText, redactedCount } = redactPii(userInput);
 * if (containsPii(userInput)) {
 *   console.warn('PII detected — sending redacted version to LLM');
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of PII redaction including the cleaned text and count of redactions */
export interface PiiRedactionResult {
  /** Text with PII replaced by placeholder tokens */
  redactedText: string;
  /** Total number of PII tokens that were redacted */
  redactedCount: number;
  /** Breakdown of redactions by type */
  redactionDetails: {
    emails: number;
    phones: number;
    ssns: number;
    addresses: number;
  };
}

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

/** Email pattern: standard email format */
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/** Phone patterns: various US and international formats */
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

/** SSN pattern: XXX-XX-XXXX format (with optional separators) */
const SSN_REGEX = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;

/** Street address pattern: number + street name + type */
const ADDRESS_REGEX =
  /\b\d{1,5}\s+(?:[A-Za-z]+\s){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Lane|Ln|Road|Rd|Court|Ct|Place|Pl|Way|Circle|Cir|Trail|Trl|Parkway|Pkwy|Highway|Hwy)\b\.?/gi;

/** Minimum digit count for a string to be considered a real phone number */
const MIN_PHONE_DIGITS = 7;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Redact PII from a text string, replacing matches with type-specific placeholders.
 *
 * Processing order (most-specific patterns first):
 * 1. Emails
 * 2. SSNs (before phones — SSN patterns are a subset of phone patterns)
 * 3. Phone numbers
 * 4. Street addresses
 *
 * @param text - Input text potentially containing PII
 * @returns Object with redacted text and count of redactions
 */
export function redactPii(text: string): PiiRedactionResult {
  if (!text || typeof text !== 'string') {
    return {
      redactedText: '',
      redactedCount: 0,
      redactionDetails: { emails: 0, phones: 0, ssns: 0, addresses: 0 },
    };
  }

  let redacted = text;
  const details = { emails: 0, phones: 0, ssns: 0, addresses: 0 };

  // 1. Redact emails first (most specific)
  redacted = redacted.replace(EMAIL_REGEX, () => {
    details.emails++;
    return '[EMAIL_REDACTED]';
  });

  // 2. Redact SSNs before phone numbers (SSN is a more specific numeric pattern)
  redacted = redacted.replace(SSN_REGEX, (match) => {
    // SSNs don't start with 000, 666, or 9XX per SSA rules
    const digits = match.replace(/[-\s]/g, '');
    const area = parseInt(digits.substring(0, 3), 10);
    if (area === 0 || area === 666 || area >= 900) return match;
    details.ssns++;
    return '[SSN_REDACTED]';
  });

  // 3. Redact phone numbers
  redacted = redacted.replace(PHONE_REGEX, (match) => {
    // Only redact if it looks like a real phone number (7+ digits)
    const digitCount = match.replace(/\D/g, '').length;
    if (digitCount < MIN_PHONE_DIGITS) return match;
    details.phones++;
    return '[PHONE_REDACTED]';
  });

  // 4. Redact street addresses
  redacted = redacted.replace(ADDRESS_REGEX, () => {
    details.addresses++;
    return '[ADDRESS_REDACTED]';
  });

  const totalRedacted =
    details.emails + details.phones + details.ssns + details.addresses;

  return {
    redactedText: redacted,
    redactedCount: totalRedacted,
    redactionDetails: details,
  };
}

/**
 * Check if a string contains any detectable PII.
 *
 * This is a convenience wrapper around {@link redactPii} for use in
 * conditional checks — it does not return the redacted text.
 *
 * @param text - Text to check
 * @returns `true` if PII patterns are detected
 */
export function containsPii(text: string): boolean {
  return redactPii(text).redactedCount > 0;
}
