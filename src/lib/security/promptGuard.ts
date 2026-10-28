/**
 * @fileoverview Prompt injection and jailbreak detection engine.
 *
 * Analyzes user inputs for common prompt injection patterns and blocks
 * malicious attempts to manipulate LLM behavior. Uses a weighted
 * pattern-matching approach with a configurable risk threshold.
 *
 * @module lib/security/promptGuard
 *
 * @example
 * ```ts
 * import { analyzePromptSafety, isPromptSafe } from '@/lib/security/promptGuard';
 *
 * const result = analyzePromptSafety(userInput);
 * if (!result.isSafe) {
 *   console.warn('Blocked:', result.triggeredPatterns);
 * }
 *
 * // Quick boolean check
 * if (isPromptSafe(userInput)) { processInput(userInput); }
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of prompt guard analysis */
export interface PromptGuardResult {
  /** Whether the input is safe to process */
  isSafe: boolean;
  /** Whether a prompt injection was detected */
  injectionDetected: boolean;
  /** Specific patterns that triggered detection */
  triggeredPatterns: string[];
  /** Risk score from 0 (safe) to 1 (certain injection) */
  riskScore: number;
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/** A single injection detection rule with its weight */
interface InjectionRule {
  /** RegExp to test against user input */
  pattern: RegExp;
  /** Human-readable description for logging / telemetry */
  description: string;
  /** Risk weight from 0 (informational) to 1.0 (critical) */
  weight: number;
}

/**
 * Prompt injection patterns with their descriptions and risk weights.
 *
 * Higher-weight patterns represent more direct/dangerous attacks;
 * lower-weight patterns may be benign depending on context.
 */
const INJECTION_PATTERNS: readonly InjectionRule[] = [
  // --- Direct instruction overrides (critical) ---
  { pattern: /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/i, description: 'Instruction override attempt', weight: 1.0 },
  { pattern: /disregard\s+(all\s+)?prior\s+(instructions|context|rules)/i, description: 'Context disregard attempt', weight: 1.0 },
  { pattern: /forget\s+(everything|all|your)\s*(instructions|rules|training)?/i, description: 'Memory reset attempt', weight: 0.9 },

  // --- Identity manipulation ---
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, description: 'Role reassignment attempt', weight: 0.8 },
  { pattern: /pretend\s+(you\s+are|to\s+be|you're)/i, description: 'Identity spoofing attempt', weight: 0.7 },
  { pattern: /act\s+as\s+(if\s+you\s+are|a|an)/i, description: 'Behavioral override attempt', weight: 0.6 },

  // --- Prompt template / system injection ---
  { pattern: /system\s*:\s*/i, description: 'System prompt injection', weight: 1.0 },
  { pattern: /\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>/i, description: 'Prompt template injection', weight: 1.0 },

  // --- Prompt extraction ---
  { pattern: /output\s+(your|the)\s+(system\s+)?prompt/i, description: 'Prompt extraction attempt', weight: 0.9 },
  { pattern: /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions)/i, description: 'System reveal attempt', weight: 0.9 },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/i, description: 'Prompt disclosure request', weight: 0.7 },

  // --- Safety bypass ---
  { pattern: /bypass\s+(safety|content|security)\s*(filter|policy|rules)?/i, description: 'Safety bypass attempt', weight: 1.0 },
  { pattern: /jailbreak/i, description: 'Explicit jailbreak mention', weight: 0.9 },
  { pattern: /\bDAN\s+mode\b|\bdo\s+anything\s+now\b/i, description: 'DAN mode attempt', weight: 1.0 },
  { pattern: /sudo\s+(mode|access|prompt)/i, description: 'Privilege escalation attempt', weight: 0.8 },

  // --- Code / encoding evasion ---
  { pattern: /execute\s+(code|command|script)/i, description: 'Code execution attempt', weight: 0.7 },
  { pattern: /\bbase64\b.*decode/i, description: 'Encoding evasion attempt', weight: 0.6 },
  { pattern: /translate\s+.*\bto\s+(?:hex|binary|base64)/i, description: 'Encoding evasion request', weight: 0.5 },
] as const;

/**
 * Risk score threshold above which input is considered unsafe.
 * Inputs with a score ≥ this value will be blocked.
 */
const RISK_THRESHOLD = 0.5;

/**
 * Multiplier applied to additional matched patterns beyond the
 * highest-weight match. Keeps the score dominated by the worst
 * pattern while still penalizing multi-vector attacks.
 */
const ADDITIONAL_MATCH_BOOST = 0.1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze user input for prompt injection and jailbreak attempts.
 *
 * The risk score is computed as:
 *   `max(weights) + sum(remaining weights) × ADDITIONAL_MATCH_BOOST`
 * clamped to [0, 1]. This means a single critical pattern is enough
 * to block, but multiple weak patterns can also compound past the
 * threshold.
 *
 * @param input - User input text to analyze
 * @returns Analysis result with safety determination and details
 */
export function analyzePromptSafety(input: string): PromptGuardResult {
  if (!input || typeof input !== 'string') {
    return {
      isSafe: true,
      injectionDetected: false,
      triggeredPatterns: [],
      riskScore: 0,
    };
  }

  const triggeredPatterns: string[] = [];
  let maxWeight = 0;
  let totalWeight = 0;

  for (const { pattern, description, weight } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      triggeredPatterns.push(description);
      totalWeight += weight;
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  // Normalize risk score: max weight + small boost per additional match
  const riskScore = Math.min(
    1,
    maxWeight + (totalWeight - maxWeight) * ADDITIONAL_MATCH_BOOST,
  );
  const injectionDetected = riskScore >= RISK_THRESHOLD;

  return {
    isSafe: !injectionDetected,
    injectionDetected,
    triggeredPatterns,
    riskScore,
  };
}

/**
 * Quick check if input is safe for LLM processing.
 *
 * Convenience wrapper around {@link analyzePromptSafety} for use in
 * guard clauses and conditional logic.
 *
 * @param input - User input to check
 * @returns `true` if input passes prompt safety analysis
 */
export function isPromptSafe(input: string): boolean {
  return analyzePromptSafety(input).isSafe;
}
