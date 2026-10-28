/**
 * @fileoverview Event planner orchestration service.
 * Coordinates the full pipeline: input validation -> sanitization ->
 * PII redaction -> prompt guard -> rate limiting -> cache check ->
 * LLM/deterministic generation -> schema validation -> response.
 */

import { EventIntakeSchema } from '@/schemas/eventSchemas';
import type { EventIntake, EventPlan, Telemetry } from '@/schemas/eventSchemas';
import { sanitizeInput } from '@/lib/security/sanitizer';
import { redactPii } from '@/lib/security/piiRedactor';
import { analyzePromptSafety } from '@/lib/security/promptGuard';
import { checkRateLimit } from '@/lib/security/rateLimiter';
import { eventPlanCache } from '@/lib/efficiency/responseCache';
import { generateEventPlan } from '@/services/llmGateway';

/** Complete result from the event planner service */
export interface PlannerResult {
  /** Whether the request was successful */
  success: boolean;
  /** Generated event plan (null if failed) */
  plan: EventPlan | null;
  /** Telemetry data for the security/efficiency panel */
  telemetry: Telemetry;
  /** Error message if failed */
  error?: string;
}

/**
 * Generate an event plan through the full security and efficiency pipeline.
 * @param rawInput - Raw user input (unsanitized)
 * @param sessionId - Session identifier for rate limiting
 * @returns Complete planner result with telemetry
 */
export async function planEvent(
  rawInput: Record<string, unknown>,
  sessionId: string = 'default'
): Promise<PlannerResult> {
  const startTime = Date.now();
  const telemetry: Telemetry = {
    inputSanitized: false,
    piiTokensRedacted: 0,
    promptInjectionBlocked: false,
    cacheHit: false,
    latencyMs: 0,
    schemaValid: false,
    source: 'deterministic',
  };

  try {
    // Step 1: Rate limiting
    const rateCheck = checkRateLimit(sessionId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        plan: null,
        telemetry: { ...telemetry, latencyMs: Date.now() - startTime },
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)} seconds.`,
      };
    }

    // Step 2: Input sanitization
    const sanitizedInput: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawInput)) {
      if (typeof value === 'string') {
        sanitizedInput[key] = sanitizeInput(value);
      } else if (Array.isArray(value)) {
        sanitizedInput[key] = value.map((item) =>
          typeof item === 'string' ? sanitizeInput(item) : item
        );
      } else {
        sanitizedInput[key] = value;
      }
    }
    telemetry.inputSanitized = true;

    // Step 3: Schema validation
    const parseResult = EventIntakeSchema.safeParse(sanitizedInput);
    if (!parseResult.success) {
      return {
        success: false,
        plan: null,
        telemetry: { ...telemetry, latencyMs: Date.now() - startTime },
        error: `Validation failed: ${parseResult.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
      };
    }
    telemetry.schemaValid = true;
    const intake: EventIntake = parseResult.data;

    // Step 4: PII redaction (on text fields that go to LLM)
    const textToCheck = [
      intake.eventName,
      intake.additionalNotes ?? '',
      ...intake.themeKeywords,
      ...intake.dietaryNeeds,
      ...intake.culturalConsiderations,
    ].join(' ');

    const piiResult = redactPii(textToCheck);
    telemetry.piiTokensRedacted = piiResult.redactedCount;

    // If PII was found, create a redacted copy of intake for LLM
    let safeIntake = intake;
    if (piiResult.redactedCount > 0) {
      safeIntake = {
        ...intake,
        eventName: redactPii(intake.eventName).redactedText,
        additionalNotes: intake.additionalNotes
          ? redactPii(intake.additionalNotes).redactedText
          : undefined,
      };
    }

    // Step 5: Prompt injection detection
    const promptCheck = analyzePromptSafety(textToCheck);
    if (!promptCheck.isSafe) {
      telemetry.promptInjectionBlocked = true;
      return {
        success: false,
        plan: null,
        telemetry: { ...telemetry, latencyMs: Date.now() - startTime },
        error: `Input rejected: potentially unsafe content detected (${promptCheck.triggeredPatterns.join(', ')}).`,
      };
    }

    // Step 6: Cache check
    const cacheKey = {
      eventType: safeIntake.eventType,
      totalBudget: safeIntake.totalBudget,
      guestCount: safeIntake.guestCount,
      locationStyle: safeIntake.locationStyle,
      themeKeywords: [...safeIntake.themeKeywords].sort(),
    };

    const cached = eventPlanCache.get(cacheKey);
    if (cached) {
      telemetry.cacheHit = true;
      telemetry.source = 'cache';
      telemetry.latencyMs = Date.now() - startTime;
      return {
        success: true,
        plan: cached as EventPlan,
        telemetry,
      };
    }

    // Step 7: Generate plan (LLM or deterministic)
    const result = await generateEventPlan(safeIntake);
    telemetry.source = result.source;
    telemetry.latencyMs = Date.now() - startTime;

    // Step 8: Cache the result
    eventPlanCache.set(cacheKey, result.plan);

    return {
      success: true,
      plan: result.plan,
      telemetry,
    };
  } catch (error) {
    console.error('[HappyTimes] Planning error:', error);
    return {
      success: false,
      plan: null,
      telemetry: { ...telemetry, latencyMs: Date.now() - startTime },
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }
}
