/**
 * @fileoverview Token-bucket rate limiter for API request throttling.
 *
 * Limits requests per session/IP to prevent abuse and ensure fair usage.
 * Uses an in-memory token-bucket algorithm with configurable capacity and
 * refill rate derived from the validated environment config.
 *
 * @module lib/security/rateLimiter
 *
 * @example
 * ```ts
 * import { checkRateLimit } from '@/lib/security/rateLimiter';
 *
 * const { allowed, remaining, retryAfterMs } = checkRateLimit(sessionId);
 * if (!allowed) {
 *   return new Response('Too many requests', {
 *     status: 429,
 *     headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
 *   });
 * }
 * ```
 */

import { env } from '@/config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal state of a single token bucket */
interface TokenBucket {
  /** Available tokens (decremented on each allowed request) */
  tokens: number;
  /** Timestamp (ms) of the last token refill calculation */
  lastRefill: number;
}

/** Result of a rate limit check */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests available in the current window */
  remaining: number;
  /** Milliseconds until at least one token becomes available (0 if allowed) */
  retryAfterMs: number;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** In-memory store for rate limit buckets, keyed by session/IP */
const buckets = new Map<string, TokenBucket>();

/** Maximum tokens per bucket (from env config) */
const MAX_TOKENS: number = env.RATE_LIMIT_MAX_REQUESTS;

/** Refill window in milliseconds (from env config) */
const REFILL_WINDOW: number = env.RATE_LIMIT_WINDOW_MS;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check and consume a rate limit token for the given key.
 *
 * Uses a token-bucket algorithm:
 * - Each key starts with {@link MAX_TOKENS} tokens.
 * - Tokens are refilled proportionally based on elapsed time since the
 *   last refill, up to the maximum.
 * - If a token is available it is consumed and the request is allowed.
 * - If no tokens remain, the request is denied and `retryAfterMs`
 *   indicates when the next token will be available.
 *
 * @param key - Unique identifier for the rate limit bucket (session ID or IP)
 * @returns Rate limit check result
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Calculate tokens to add based on elapsed time
  const elapsed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor((elapsed / REFILL_WINDOW) * MAX_TOKENS);

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      retryAfterMs: 0,
    };
  }

  // Calculate time until next token is available
  const timeForOneToken = REFILL_WINDOW / MAX_TOKENS;
  const timeSinceLastRefill = now - bucket.lastRefill;
  const retryAfterMs = Math.max(0, timeForOneToken - timeSinceLastRefill);

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: Math.ceil(retryAfterMs),
  };
}

/**
 * Reset the rate limit bucket for a given key.
 * Useful for testing or administrative reset.
 *
 * @param key - Bucket key to reset
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Clear all rate limit buckets.
 * Primarily useful for testing; in production the buckets naturally
 * refill over time.
 */
export function clearAllRateLimits(): void {
  buckets.clear();
}
