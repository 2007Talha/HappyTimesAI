/**
 * @fileoverview Validated environment configuration with safe fallback mode.
 * Uses Zod to validate environment variables at startup and provides
 * type-safe access to configuration values throughout the application.
 *
 * @module config/env
 *
 * @example
 * ```ts
 * import { env, isLLMAvailable } from '@/config/env';
 *
 * if (isLLMAvailable) {
 *   // Safe to call Gemini API
 *   callGemini(env.GEMINI_API_KEY!);
 * }
 * ```
 */

import { z } from 'zod';

/**
 * Schema for validating environment variables.
 * Provides sensible defaults for all optional values so the app
 * can run in a degraded (demo) mode without any `.env` file.
 */
const envSchema = z.object({
  /** Google Gemini API key — optional to support deterministic-only mode */
  GEMINI_API_KEY: z.string().min(1).optional(),
  /** Current Node environment */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Max API requests per rate-limit window */
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  /** Rate-limit sliding window duration in milliseconds */
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  /** Maximum entries in the LLM response cache */
  CACHE_MAX_SIZE: z.coerce.number().int().positive().default(100),
  /** Time-to-live for cache entries in milliseconds */
  CACHE_TTL_MS: z.coerce.number().int().positive().default(300000),
});

/** Validated environment configuration type inferred from the Zod schema */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables with safe defaults.
 *
 * If validation fails (e.g. malformed numeric env var), a warning is
 * logged and a fully-safe default configuration is returned so the
 * application can still start in demo / deterministic-fallback mode.
 *
 * @returns Validated environment configuration
 */
function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    CACHE_MAX_SIZE: process.env.CACHE_MAX_SIZE,
    CACHE_TTL_MS: process.env.CACHE_TTL_MS,
  });

  if (!result.success) {
    console.warn(
      '[EventForge] Environment validation warnings:',
      result.error.flatten().fieldErrors,
    );
    // Return safe defaults so the app can still boot in demo mode
    return {
      GEMINI_API_KEY: undefined,
      NODE_ENV: 'development',
      RATE_LIMIT_MAX_REQUESTS: 20,
      RATE_LIMIT_WINDOW_MS: 60000,
      CACHE_MAX_SIZE: 100,
      CACHE_TTL_MS: 300000,
    };
  }

  return result.data;
}

/** Singleton validated environment config — parsed once at module load time */
export const env: EnvConfig = loadEnvConfig();

/** Whether the Gemini API is available (key is configured) */
export const isLLMAvailable: boolean = Boolean(env.GEMINI_API_KEY);
