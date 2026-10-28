/**
 * @fileoverview Deterministic hash-keyed LRU cache with TTL and hit metrics.
 *
 * Caches LLM responses for identical event configurations to avoid
 * redundant API calls and reduce latency. Uses a simple string-based
 * hash for browser compatibility (no Web Crypto API required).
 *
 * @module lib/efficiency/responseCache
 *
 * @example
 * ```ts
 * import { eventPlanCache, ResponseCache } from '@/lib/efficiency/responseCache';
 *
 * // Use the singleton
 * const cached = eventPlanCache.get(intakeFormValues);
 * if (!cached) {
 *   const plan = await generatePlan(intakeFormValues);
 *   eventPlanCache.set(intakeFormValues, plan);
 * }
 *
 * // Or create a dedicated cache
 * const myCache = new ResponseCache<string>(50, 60_000);
 * ```
 */

import { env } from '@/config/env';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal cache entry with metadata */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp (ms) when the entry was created */
  createdAt: number;
  /** Number of times this entry has been accessed since creation */
  accessCount: number;
}

/** Cache performance metrics (returned as a snapshot, not a live reference) */
export interface CacheMetrics {
  /** Total cache lookups (hits + misses) */
  totalLookups: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of entries in the cache */
  size: number;
  /** Hit rate as a percentage (0–100) */
  hitRate: number;
  /** Estimated latency saved in ms (assuming 2 000 ms per LLM call avoided) */
  estimatedLatencySavedMs: number;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/** Estimated average latency of a single LLM API call in milliseconds */
const ESTIMATED_LLM_LATENCY_MS = 2000;

/**
 * Generate a deterministic hash key from an object.
 *
 * Uses a djb2-style string hash over the JSON-serialized (sorted-key)
 * representation. Browser-compatible — no Web Crypto needed.
 *
 * @param obj - Object to hash
 * @returns Deterministic hash string prefixed with `cache_`
 */
function generateCacheKey(obj: unknown): string {
  const str = JSON.stringify(
    obj,
    Object.keys((obj ?? {}) as Record<string, unknown>).sort(),
  );
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cache_${Math.abs(hash).toString(36)}`;
}

// ---------------------------------------------------------------------------
// ResponseCache class
// ---------------------------------------------------------------------------

/**
 * LRU Cache with TTL support and hit/miss telemetry.
 *
 * The underlying `Map` preserves insertion order, which doubles as the
 * LRU eviction order — the *first* key is the least-recently-used.
 *
 * @typeParam T - Type of the cached values
 */
export class ResponseCache<T> {
  /** Ordered map serving as both storage and LRU queue */
  private readonly cache = new Map<string, CacheEntry<T>>();

  /** Maximum number of entries before LRU eviction */
  private readonly maxSize: number;

  /** Time-to-live for each entry in milliseconds */
  private readonly ttlMs: number;

  /** Mutable metrics accumulator */
  private metrics: CacheMetrics = {
    totalLookups: 0,
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    estimatedLatencySavedMs: 0,
  };

  /**
   * Create a new ResponseCache instance.
   *
   * @param maxSize - Maximum number of entries (defaults to `CACHE_MAX_SIZE` env var)
   * @param ttlMs  - Time-to-live in milliseconds (defaults to `CACHE_TTL_MS` env var)
   */
  constructor(maxSize?: number, ttlMs?: number) {
    this.maxSize = maxSize ?? env.CACHE_MAX_SIZE;
    this.ttlMs = ttlMs ?? env.CACHE_TTL_MS;
  }

  /**
   * Get a cached value by its configuration key object.
   *
   * On a cache hit the entry is promoted to most-recently-used.
   * Expired entries are transparently evicted.
   *
   * @param keyObj - The configuration object used as the cache key
   * @returns Cached value, or `undefined` if not found / expired
   */
  get(keyObj: unknown): T | undefined {
    const key = generateCacheKey(keyObj);
    this.metrics.totalLookups++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.misses++;
      this.updateMetrics();
      return undefined;
    }

    // Check TTL expiration
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateMetrics();
      return undefined;
    }

    // Promote to most-recently-used (delete + re-insert)
    this.cache.delete(key);
    entry.accessCount++;
    this.cache.set(key, entry);

    this.metrics.hits++;
    this.metrics.estimatedLatencySavedMs += ESTIMATED_LLM_LATENCY_MS;
    this.updateMetrics();

    return entry.value;
  }

  /**
   * Store a value in the cache.
   *
   * If the cache is at capacity and the key is new, the
   * least-recently-used entry is evicted first.
   *
   * @param keyObj - The configuration object used as the cache key
   * @param value  - Value to cache
   */
  set(keyObj: unknown, value: T): void {
    const key = generateCacheKey(keyObj);

    // Evict LRU entry if at capacity (and key is not already present)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      accessCount: 0,
    });
    this.updateMetrics();
  }

  /**
   * Get a snapshot of current cache performance metrics.
   *
   * @returns Shallow copy of the metrics object
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all cache entries and reset metrics to zero.
   */
  clear(): void {
    this.cache.clear();
    this.metrics = {
      totalLookups: 0,
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      estimatedLatencySavedMs: 0,
    };
  }

  /**
   * Recalculate derived metric fields (`size`, `hitRate`).
   * Called after every mutation or lookup.
   */
  private updateMetrics(): void {
    this.metrics.size = this.cache.size;
    this.metrics.hitRate =
      this.metrics.totalLookups > 0
        ? (this.metrics.hits / this.metrics.totalLookups) * 100
        : 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/**
 * Singleton cache instance for event plan responses.
 *
 * Uses `unknown` as the value type because the cached payloads are
 * validated via {@link LLMResponseSchema} at retrieval time.
 */
export const eventPlanCache = new ResponseCache<unknown>();
