/**
 * @fileoverview Storage Test Suite for HappyTimes Event History.
 * Validates local history persistence, updates, limits, and deletion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveEventToHistory,
  getSavedEvents,
  deleteSavedEvent,
  clearAllSavedEvents,
} from '@/lib/storage/eventHistory';
import type { EventIntake, EventPlan } from '@/schemas/eventSchemas';

const mockIntake: EventIntake = {
  eventType: 'wedding',
  eventName: 'Summer Vineyard Wedding',
  totalBudget: 25000,
  guestCount: 100,
  eventDate: '2027-07-20',
  locationStyle: 'outdoor',
  themeKeywords: ['vineyard', 'rustic'],
  dietaryNeeds: ['vegetarian'],
  culturalConsiderations: [],
  additionalNotes: '',
};

const mockPlan: EventPlan = {
  budget: {
    totalBudget: 25000,
    categories: [
      {
        name: 'Venue/Catering',
        percentage: 50,
        estimatedAmount: 12500,
        actualSpent: 0,
        isLocked: false,
        notes: '',
      },
    ],
    contingencyPercent: 10,
  },
  preEventTimeline: [],
  dayOfSchedule: [],
  vendors: [],
  ideas: [],
};

describe('Event History Storage', () => {
  beforeEach(() => {
    clearAllSavedEvents();
  });

  it('saves an event and retrieves it in list', () => {
    const saved = saveEventToHistory(mockIntake, mockPlan);
    expect(saved.id).toBeDefined();
    expect(saved.intake.eventName).toBe('Summer Vineyard Wedding');

    const all = getSavedEvents();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(saved.id);
  });

  it('updates an existing event when matching name and date are re-saved', () => {
    const first = saveEventToHistory(mockIntake, mockPlan);
    const updatedIntake = { ...mockIntake, totalBudget: 30000 };
    const second = saveEventToHistory(updatedIntake, mockPlan);

    expect(second.id).toBe(first.id);
    expect(second.intake.totalBudget).toBe(30000);

    const all = getSavedEvents();
    expect(all).toHaveLength(1);
    expect(all[0].intake.totalBudget).toBe(30000);
  });

  it('deletes an event by ID', () => {
    const saved = saveEventToHistory(mockIntake, mockPlan);
    expect(getSavedEvents()).toHaveLength(1);

    const deleted = deleteSavedEvent(saved.id);
    expect(deleted).toBe(true);
    expect(getSavedEvents()).toHaveLength(0);
  });
});

