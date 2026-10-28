/**
 * @fileoverview Efficiency Test Suite for EventForge AI.
 * Validates deterministic SHA-256 LRU cache operations, penny-accurate budget math,
 * percentage rebalancing with category locking, and variance tracking.
 */

import { describe, it, expect } from 'vitest';
import { ResponseCache } from '@/lib/efficiency/responseCache';
import {
  calculateBudget,
  rebalanceBudget,
  calculateVariance,
  centsToDollars,
  dollarsToCents,
  BudgetCategory,
} from '@/lib/efficiency/budgetCalculator';
import { EVENT_CATEGORY_DEFAULTS } from '@/schemas/eventSchemas';

describe('Efficiency: Response LRU Cache Engine', () => {
  it('should store and retrieve cached values with deterministic keys', () => {
    const cache = new ResponseCache<string>(10, 60000);
    const keyA = { eventType: 'wedding', budget: 25000, theme: 'rustic' };
    const keyB = { theme: 'rustic', budget: 25000, eventType: 'wedding' }; // different key ordering

    cache.set(keyA, 'wedding-plan-output');

    // Key order should not matter for hash generation
    expect(cache.get(keyB)).toBe('wedding-plan-output');

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(0);
    expect(metrics.hitRate).toBe(100);
    expect(metrics.estimatedLatencySavedMs).toBe(2000);
  });

  it('should track cache misses correctly', () => {
    const cache = new ResponseCache<string>(10, 60000);
    const result = cache.get({ nonExistent: true });

    expect(result).toBeUndefined();
    const metrics = cache.getMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.hits).toBe(0);
    expect(metrics.hitRate).toBe(0);
  });

  it('should evict the least recently used item when capacity is exceeded', () => {
    const smallCache = new ResponseCache<number>(2, 60000);

    smallCache.set({ id: 1 }, 100);
    smallCache.set({ id: 2 }, 200);

    // Access id 1 so id 2 becomes the least recently used
    smallCache.get({ id: 1 });

    // Add id 3, should evict id 2
    smallCache.set({ id: 3 }, 300);

    expect(smallCache.get({ id: 1 })).toBe(100);
    expect(smallCache.get({ id: 2 })).toBeUndefined();
    expect(smallCache.get({ id: 3 })).toBe(300);
  });

  it('should expire items after TTL elapsed', async () => {
    const shortTtlCache = new ResponseCache<string>(5, 50); // 50ms TTL
    shortTtlCache.set({ key: 'fast' }, 'data');

    expect(shortTtlCache.get({ key: 'fast' })).toBe('data');

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(shortTtlCache.get({ key: 'fast' })).toBeUndefined();
  });
});

describe('Efficiency: Penny-Accurate Budget Arithmetic Engine', () => {
  it('should allocate budget such that categories sum EXACTLY to total budget in cents', () => {
    const testBudgets = [28000, 3500, 12000, 10001.33, 99.99, 1000000];

    for (const total of testBudgets) {
      const weddingDefaults = EVENT_CATEGORY_DEFAULTS.wedding;
      const percentages: Record<string, number> = {};
      weddingDefaults.forEach((d) => {
        percentages[d.name] = d.percentage;
      });

      const result = calculateBudget(total, percentages);
      const expectedTotalCents = dollarsToCents(total);

      // Sum of estimated cents across categories must be exactly equal to total cents
      const sumAllocatedCents = result.categories.reduce((acc, c) => acc + c.estimatedCents, 0);
      expect(sumAllocatedCents).toBe(expectedTotalCents);
      expect(result.remainingCents).toBe(0);
    }
  });

  it('should handle odd percentage remainder splits without penny loss', () => {
    const total = 100.00;
    // 3 categories: 33.33%, 33.33%, 33.34% -> sums to 100%
    const oddPercentages = {
      'Category A': 33.33,
      'Category B': 33.33,
      'Category C': 33.34,
    };

    const result = calculateBudget(total, oddPercentages);
    const sumCents = result.categories.reduce((acc, c) => acc + c.estimatedCents, 0);

    expect(sumCents).toBe(10000); // 10000 cents = $100.00
    expect(result.totalAllocatedCents).toBe(10000);
  });

  it('should rebalance unlocked categories proportionally when a category allocation changes', () => {
    const totalDollars = 10000;
    const totalCents = dollarsToCents(totalDollars);
    const percentages = {
      Venue: 50,
      Catering: 30,
      Decor: 20,
    };

    const initial = calculateBudget(totalDollars, percentages);

    // Lock "Venue" at 50%, increase "Catering" from 30% to 40%
    // "Decor" (unlocked) should absorb the 10% delta and drop from 20% to 10%
    initial.categories[0].isLocked = true; // Venue is locked

    const rebalanced = rebalanceBudget(initial.categories, totalCents, 1, 40);

    expect(rebalanced[0].percentage).toBe(50); // Locked, unchanged
    expect(rebalanced[1].percentage).toBe(40); // User adjusted
    expect(rebalanced[2].percentage).toBe(10); // Unlocked absorbed delta

    const totalPct = rebalanced.reduce((sum, c) => sum + c.percentage, 0);
    expect(Math.round(totalPct)).toBe(100);
  });

  it('should calculate budget variances correctly', () => {
    const categories: BudgetCategory[] = [
      { name: 'Venue', estimatedCents: 500000, actualCents: 550000, percentage: 50, isLocked: false }, // $500 over
      { name: 'Catering', estimatedCents: 300000, actualCents: 250000, percentage: 30, isLocked: false }, // $500 under
      { name: 'Music', estimatedCents: 200000, actualCents: 200000, percentage: 20, isLocked: false }, // on budget
    ];

    const variance = calculateVariance(categories);
    expect(variance.totalVarianceCents).toBe(0);
    expect(variance.hasOverBudget).toBe(true); // Venue is over
    expect(variance.categoryVariances[0].varianceCents).toBe(50000);
    expect(variance.categoryVariances[0].isOver).toBe(true);
    expect(variance.categoryVariances[1].varianceCents).toBe(-50000);
    expect(variance.categoryVariances[1].isOver).toBe(false);
  });
});

