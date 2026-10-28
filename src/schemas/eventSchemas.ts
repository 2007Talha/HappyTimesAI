/**
 * @fileoverview Comprehensive Zod schemas for the HappyTimes domain model.
 *
 * Every schema is exported alongside its inferred TypeScript type so that
 * runtime validation and compile-time type-checking stay in sync.
 *
 * Also exports {@link EVENT_CATEGORY_DEFAULTS} — a lookup table mapping each
 * {@link EventType} to its default budget category names and percentage splits.
 *
 * @module schemas/eventSchemas
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Event Type
// ---------------------------------------------------------------------------

/**
 * The three supported event types.
 * Used to select default budget templates and LLM prompt strategies.
 */
export const EventTypeEnum = z.enum(['wedding', 'birthday', 'community']);

/** Discriminated event type union */
export type EventType = z.infer<typeof EventTypeEnum>;

// ---------------------------------------------------------------------------
// Event Intake
// ---------------------------------------------------------------------------

/**
 * Schema for the event intake form — the primary user-facing input.
 * All string fields accept sanitized user text; arrays accept tags.
 */
export const EventIntakeSchema = z.object({
  /** Type of event to plan */
  eventType: EventTypeEnum,
  /** Human-readable name for the event */
  eventName: z.string().min(1).max(200),
  /** Total budget in dollars (must be a positive number) */
  totalBudget: z.number().positive(),
  /** Expected number of guests (positive integer) */
  guestCount: z.number().int().positive(),
  /** Date of the event in ISO 8601 format (YYYY-MM-DD) */
  eventDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Must be a valid ISO date string (e.g. 2025-06-15)' },
  ),
  /** Preferred location style */
  locationStyle: z.enum(['indoor', 'outdoor', 'hybrid', 'virtual']),
  /** Free-form keywords describing the desired theme */
  themeKeywords: z.array(z.string().min(1).max(100)),
  /** Dietary restrictions and needs to accommodate */
  dietaryNeeds: z.array(z.string().min(1).max(100)),
  /** Cultural or religious considerations */
  culturalConsiderations: z.array(z.string().min(1).max(200)),
  /** Optional free-text notes from the user */
  additionalNotes: z.string().max(2000).optional(),
});

/** Validated event intake form data */
export type EventIntake = z.infer<typeof EventIntakeSchema>;

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/**
 * A single budget category with estimated and actual amounts.
 * All monetary values are in dollars (display currency); the
 * {@link budgetCalculator} works internally in cents.
 */
export const BudgetCategorySchema = z.object({
  /** Display name of the category (e.g. "Venue/Catering") */
  name: z.string().min(1).max(100),
  /** Estimated dollar amount for this category */
  estimatedAmount: z.number().nonnegative(),
  /** Actual amount spent so far */
  actualSpent: z.number().nonnegative(),
  /** Percentage of total budget allocated (0–100) */
  percentage: z.number().min(0).max(100),
  /** Whether this category is locked from auto-rebalancing */
  isLocked: z.boolean(),
  /** Optional planner notes */
  notes: z.string().max(500).optional(),
});

/** Validated budget category */
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

/**
 * Complete budget plan with category breakdown and contingency.
 */
export const BudgetPlanSchema = z.object({
  /** Total budget in dollars */
  totalBudget: z.number().positive(),
  /** Array of budget categories */
  categories: z.array(BudgetCategorySchema),
  /** Percentage of total budget reserved for contingency (0–100) */
  contingencyPercent: z.number().min(0).max(100),
});

/** Validated budget plan */
export type BudgetPlan = z.infer<typeof BudgetPlanSchema>;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/**
 * A single milestone on the pre-event timeline.
 * Milestones are measured in days-before-event for easy sorting.
 */
export const TimelineMilestoneSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Short title (e.g. "Book photographer") */
  title: z.string().min(1).max(200),
  /** Detailed description of what needs to happen */
  description: z.string().max(1000),
  /** Due date in ISO 8601 format */
  dueDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Must be a valid ISO date string' },
  ),
  /** Number of days before the event this should be completed */
  daysBeforeEvent: z.number().int().nonnegative(),
  /** Whether this milestone has been completed */
  isComplete: z.boolean(),
  /** Person or role responsible */
  owner: z.string().max(100),
  /** Planning category this milestone belongs to */
  category: z.string().max(100),
});

/** Validated timeline milestone */
export type TimelineMilestone = z.infer<typeof TimelineMilestoneSchema>;

// ---------------------------------------------------------------------------
// Day-of Schedule
// ---------------------------------------------------------------------------

/**
 * A single item on the day-of-event schedule.
 * Times are stored as HH:mm strings for display simplicity.
 */
export const DayOfScheduleItemSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Start time in HH:mm format */
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  /** End time in HH:mm format */
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format'),
  /** Activity description */
  activity: z.string().min(1).max(300),
  /** Location or area within the venue */
  location: z.string().max(200),
  /** Person or role responsible */
  owner: z.string().max(100),
  /** Additional notes */
  notes: z.string().max(500),
  /** Buffer time in minutes after this activity */
  bufferMinutes: z.number().int().nonnegative(),
});

/** Validated day-of schedule item */
export type DayOfScheduleItem = z.infer<typeof DayOfScheduleItemSchema>;

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

/**
 * A vendor/supplier item on the vendor checklist.
 */
export const VendorItemSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Vendor name */
  name: z.string().min(1).max(200),
  /** Vendor category (e.g. "Catering", "Photography") */
  category: z.string().min(1).max(100),
  /** Booking priority */
  priority: z.enum(['high', 'medium', 'low']),
  /** Whether this vendor has been contacted/booked */
  isChecked: z.boolean(),
  /** Estimated cost in dollars */
  estimatedCost: z.number().nonnegative(),
  /** Optional contact information */
  contactInfo: z.string().max(300).optional(),
  /** Questions to ask during initial contact */
  questionsToAsk: z.array(z.string().min(1).max(300)),
  /** Additional notes */
  notes: z.string().max(500),
  /** Due date for contacting/booking */
  dueDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Must be a valid ISO date string' },
  ),
});

/** Validated vendor item */
export type VendorItem = z.infer<typeof VendorItemSchema>;

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

/**
 * A creative idea generated by the AI or added by the user.
 */
export const IdeaSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Idea category */
  category: z.enum(['theme', 'decor', 'menu', 'activity', 'sustainability', 'inclusivity']),
  /** Short title */
  title: z.string().min(1).max(200),
  /** Detailed description */
  description: z.string().max(1000),
  /** Optional estimated cost in dollars */
  estimatedCost: z.number().nonnegative().optional(),
  /** Searchable tags */
  tags: z.array(z.string().min(1).max(50)),
});

/** Validated idea */
export type Idea = z.infer<typeof IdeaSchema>;

// ---------------------------------------------------------------------------
// Event Plan (composite)
// ---------------------------------------------------------------------------

/**
 * The complete event plan — the primary output of the planning engine.
 * Aggregates budget, timeline, schedule, vendors, and ideas.
 */
export const EventPlanSchema = z.object({
  /** Budget plan with category breakdown */
  budget: BudgetPlanSchema,
  /** Pre-event timeline milestones */
  preEventTimeline: z.array(TimelineMilestoneSchema),
  /** Day-of schedule items */
  dayOfSchedule: z.array(DayOfScheduleItemSchema),
  /** Vendor checklist */
  vendors: z.array(VendorItemSchema),
  /** Creative ideas and suggestions */
  ideas: z.array(IdeaSchema),
});

/** Validated complete event plan */
export type EventPlan = z.infer<typeof EventPlanSchema>;

// ---------------------------------------------------------------------------
// LLM Response Wrapper
// ---------------------------------------------------------------------------

/**
 * Wrapper around {@link EventPlanSchema} with metadata about the generation.
 */
export const LLMResponseSchema = z.object({
  /** The generated event plan */
  plan: EventPlanSchema,
  /** Generation metadata */
  metadata: z.object({
    /** ISO timestamp when the plan was generated */
    generatedAt: z.string(),
    /** Name/version of the model used (e.g. "gemini-2.0-flash") */
    modelUsed: z.string(),
    /** Whether this response was served from cache */
    cached: z.boolean(),
  }),
});

/** Validated LLM response with metadata */
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

/**
 * Per-request telemetry record for the security & efficiency dashboard.
 */
export const TelemetrySchema = z.object({
  /** Whether the input was sanitized */
  inputSanitized: z.boolean(),
  /** Number of PII tokens that were redacted */
  piiTokensRedacted: z.number().int().nonnegative(),
  /** Whether a prompt injection attempt was blocked */
  promptInjectionBlocked: z.boolean(),
  /** Whether the response was served from cache */
  cacheHit: z.boolean(),
  /** End-to-end latency in milliseconds */
  latencyMs: z.number().nonnegative(),
  /** Whether the LLM output passed schema validation */
  schemaValid: z.boolean(),
  /** Source of the response */
  source: z.enum(['llm', 'deterministic', 'cache']),
});

/** Validated telemetry record */
export type Telemetry = z.infer<typeof TelemetrySchema>;

// ---------------------------------------------------------------------------
// Default Budget Templates
// ---------------------------------------------------------------------------

/** Shape of a single default category allocation */
export interface DefaultCategoryAllocation {
  /** Display name of the budget category */
  name: string;
  /** Default percentage of total budget (0–100) */
  percentage: number;
}

/**
 * Default budget category names and percentage allocations for each event type.
 *
 * These percentages are based on industry-standard planning guides and
 * sum to 100% for each event type (including contingency).
 *
 * @remarks
 * - **Wedding**: 10 categories totaling 100%
 * - **Birthday**: 6 categories totaling 100%
 * - **Community**: 7 categories totaling 100%
 */
export const EVENT_CATEGORY_DEFAULTS: Record<EventType, DefaultCategoryAllocation[]> = {
  wedding: [
    { name: 'Venue/Catering', percentage: 40 },
    { name: 'Photography/Videography', percentage: 12 },
    { name: 'Attire/Beauty', percentage: 8 },
    { name: 'Florals/Decor', percentage: 10 },
    { name: 'Entertainment', percentage: 8 },
    { name: 'Officiant/Licenses', percentage: 2 },
    { name: 'Stationery/Invitations', percentage: 3 },
    { name: 'Transportation', percentage: 3 },
    { name: 'Favors/Gifts', percentage: 2 },
    { name: 'Contingency', percentage: 12 },
  ],
  birthday: [
    { name: 'Venue/Rentals', percentage: 25 },
    { name: 'Food/Cake/Beverages', percentage: 30 },
    { name: 'Entertainment/Activities', percentage: 15 },
    { name: 'Decor/Party Favors', percentage: 10 },
    { name: 'Invitations/Media', percentage: 5 },
    { name: 'Contingency', percentage: 15 },
  ],
  community: [
    { name: 'Permits/Insurance/Security', percentage: 10 },
    { name: 'Venue/Staging/AV', percentage: 25 },
    { name: 'Marketing/Outreach', percentage: 10 },
    { name: 'Food/Refreshments', percentage: 20 },
    { name: 'Volunteer Operations', percentage: 10 },
    { name: 'Accessibility/Sanitation', percentage: 10 },
    { name: 'Contingency', percentage: 15 },
  ],
};
