/**
 * @fileoverview Deterministic penny-accurate budget math engine.
 *
 * All budget arithmetic is performed in **integer cents** to avoid
 * floating-point rounding errors. Dollar amounts are only produced at
 * the display boundary via {@link centsToDollars}.
 *
 * The {@link calculateBudget} function uses the **largest-remainder
 * method** (Hamilton's method) to distribute cents so that the sum of
 * all categories equals the total budget *exactly* — no phantom penny
 * is created or lost.
 *
 * @module lib/efficiency/budgetCalculator
 *
 * @example
 * ```ts
 * import {
 *   calculateBudget,
 *   rebalanceBudget,
 *   centsToDollars,
 * } from '@/lib/efficiency/budgetCalculator';
 *
 * const result = calculateBudget(10_000, { 'Venue': 40, 'Food': 30, 'Decor': 30 });
 * console.log(centsToDollars(result.categories[0].estimatedCents)); // 4000.00
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Budget category with penny-accurate amounts (all in integer cents) */
export interface BudgetCategory {
  /** Display name of the category */
  name: string;
  /** Estimated amount in cents (integer) */
  estimatedCents: number;
  /** Actual spent in cents (integer) */
  actualCents: number;
  /** Percentage allocation (0–100, up to 2 decimal places) */
  percentage: number;
  /** Whether this category is locked from automatic rebalancing */
  isLocked: boolean;
}

/** Complete budget calculation result */
export interface BudgetResult {
  /** Total budget in cents */
  totalCents: number;
  /** Budget categories with calculated amounts */
  categories: BudgetCategory[];
  /** Total allocated in cents (should equal totalCents when balanced) */
  totalAllocatedCents: number;
  /** Remaining unallocated cents (should be 0 when balanced) */
  remainingCents: number;
  /** Whether any category's actual spend exceeds its estimate */
  hasOverBudget: boolean;
  /** Total variance (actual − estimated) in cents */
  totalVarianceCents: number;
}

/** Per-category variance detail */
export interface CategoryVariance {
  /** Category name */
  name: string;
  /** Variance in cents (positive = over budget) */
  varianceCents: number;
  /** Whether this category is over its estimate */
  isOver: boolean;
}

/** Result of a variance calculation */
export interface VarianceResult {
  /** Sum of all category variances in cents */
  totalVarianceCents: number;
  /** Whether *any* category is over its estimate */
  hasOverBudget: boolean;
  /** Per-category breakdown */
  categoryVariances: CategoryVariance[];
}

// ---------------------------------------------------------------------------
// Dollar ↔ Cents conversion
// ---------------------------------------------------------------------------

/**
 * Convert a dollar amount to cents (integer).
 *
 * Uses `Math.round` to handle inputs that already have sub-cent
 * precision (e.g. from division).
 *
 * @param dollars - Amount in dollars
 * @returns Amount in integer cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars with exactly 2 decimal places.
 *
 * @param cents - Amount in integer cents
 * @returns Amount in dollars
 */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

// ---------------------------------------------------------------------------
// Budget calculation
// ---------------------------------------------------------------------------

/**
 * Calculate budget allocation from total budget and percentage splits.
 *
 * Uses the **largest-remainder method** (Hamilton's method) to ensure
 * the allocated cents sum **exactly** to the total — no rounding gap.
 *
 * @param totalBudgetDollars - Total budget in dollars
 * @param percentages        - Record mapping category name → percentage (should sum ≈ 100)
 * @returns {@link BudgetResult} with penny-accurate allocations
 */
export function calculateBudget(
  totalBudgetDollars: number,
  percentages: Record<string, number>,
): BudgetResult {
  const totalCents = dollarsToCents(totalBudgetDollars);
  const entries = Object.entries(percentages);

  // Step 1: Compute raw (fractional) cent allocations and their floors
  const rawAllocations = entries.map(([name, pct]) => ({
    name,
    percentage: pct,
    rawCents: (pct / 100) * totalCents,
    floorCents: Math.floor((pct / 100) * totalCents),
  }));

  // Step 2: Sort by fractional remainder descending for tie-breaking
  const remainders = rawAllocations.map((a, i) => ({
    index: i,
    remainder: a.rawCents - a.floorCents,
  }));
  remainders.sort((a, b) => b.remainder - a.remainder);

  // Step 3: Distribute leftover cents to entries with the largest remainders
  const floorSum = rawAllocations.reduce((sum, a) => sum + a.floorCents, 0);
  let remaining = totalCents - floorSum;

  const finalCents = rawAllocations.map((a) => a.floorCents);
  for (const { index } of remainders) {
    if (remaining <= 0) break;
    finalCents[index]++;
    remaining--;
  }

  // Step 4: Build category objects
  const categories: BudgetCategory[] = rawAllocations.map((a, i) => ({
    name: a.name,
    estimatedCents: finalCents[i],
    actualCents: 0,
    percentage: a.percentage,
    isLocked: false,
  }));

  const totalAllocatedCents = finalCents.reduce((sum, c) => sum + c, 0);

  return {
    totalCents,
    categories,
    totalAllocatedCents,
    remainingCents: totalCents - totalAllocatedCents,
    hasOverBudget: false,
    totalVarianceCents: 0,
  };
}

// ---------------------------------------------------------------------------
// Rebalancing
// ---------------------------------------------------------------------------

/**
 * Rebalance budget when a category's percentage allocation changes.
 *
 * The delta (new − old percentage) is redistributed **proportionally**
 * among all unlocked categories (excluding the changed one). Locked
 * categories retain their current percentage.
 *
 * After redistribution a rounding correction is applied so the
 * percentages still sum to exactly 100.
 *
 * @param categories   - Current budget categories
 * @param totalCents   - Total budget in cents
 * @param changedIndex - Index of the category whose percentage was changed
 * @param newPercentage - New percentage for the changed category
 * @returns New array of categories with rebalanced percentages and amounts
 */
export function rebalanceBudget(
  categories: BudgetCategory[],
  totalCents: number,
  changedIndex: number,
  newPercentage: number,
): BudgetCategory[] {
  const updated = categories.map((c) => ({ ...c }));
  const oldPercentage = updated[changedIndex].percentage;
  const delta = newPercentage - oldPercentage;

  updated[changedIndex].percentage = newPercentage;
  updated[changedIndex].estimatedCents = Math.round((newPercentage / 100) * totalCents);

  // Collect unlocked categories (excluding the changed one)
  const unlocked = updated
    .map((c, i) => ({ category: c, index: i }))
    .filter(({ category, index }) => !category.isLocked && index !== changedIndex);

  if (unlocked.length === 0) return updated;

  const totalUnlockedPercentage = unlocked.reduce(
    (sum, { category }) => sum + category.percentage,
    0,
  );

  if (totalUnlockedPercentage <= 0) return updated;

  // Distribute delta proportionally among unlocked categories
  for (const { category } of unlocked) {
    const proportion = category.percentage / totalUnlockedPercentage;
    category.percentage = Math.max(0, category.percentage - delta * proportion);
    category.percentage = Math.round(category.percentage * 100) / 100;
    category.estimatedCents = Math.round((category.percentage / 100) * totalCents);
  }

  // Rounding correction: ensure percentages sum to exactly 100
  const totalPct = updated.reduce((sum, c) => sum + c.percentage, 0);
  const pctDiff = 100 - totalPct;
  if (Math.abs(pctDiff) > 0.001 && unlocked.length > 0) {
    unlocked[0].category.percentage += Math.round(pctDiff * 100) / 100;
    unlocked[0].category.estimatedCents = Math.round(
      (unlocked[0].category.percentage / 100) * totalCents,
    );
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Variance
// ---------------------------------------------------------------------------

/**
 * Calculate budget variance between estimated and actual spending.
 *
 * A positive variance means over-budget; negative means under-budget.
 *
 * @param categories - Budget categories with actual spending recorded
 * @returns Variance result with per-category and aggregate figures
 */
export function calculateVariance(categories: BudgetCategory[]): VarianceResult {
  const categoryVariances: CategoryVariance[] = categories.map((c) => ({
    name: c.name,
    varianceCents: c.actualCents - c.estimatedCents,
    isOver: c.actualCents > c.estimatedCents,
  }));

  const totalVarianceCents = categoryVariances.reduce(
    (sum, v) => sum + v.varianceCents,
    0,
  );
  const hasOverBudget = categoryVariances.some((v) => v.isOver);

  return { totalVarianceCents, hasOverBudget, categoryVariances };
}
