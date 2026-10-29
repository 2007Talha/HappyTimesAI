/**
 * @fileoverview Browser LocalStorage Event History Manager for HappyTimes.
 * Automatically persists generated and edited event plans, allowing users
 * to browse past events, switch active projects, export files, or delete old events.
 */

import type { EventIntake, EventPlan, Telemetry } from '@/schemas/eventSchemas';

export interface SavedEventRecord {
  id: string;
  savedAt: string;
  updatedAt: string;
  intake: EventIntake;
  plan: EventPlan;
  telemetry?: Telemetry | null;
}

const STORAGE_KEY = 'happytimes_saved_events_v1';
const MAX_SAVED_EVENTS = 25;

/** In-memory fallback if localStorage is disabled or running on server */
let memoryStorage: SavedEventRecord[] = [];

/**
 * Retrieve all saved events from storage, sorted by most recently updated.
 */
export function getSavedEvents(): SavedEventRecord[] {
  if (typeof window === 'undefined') {
    return memoryStorage;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (err) {
    console.warn('[HappyTimes] Failed to load saved events from localStorage:', err);
    return memoryStorage;
  }
}

/**
 * Save or update an event in history.
 * If an event with matching name and date already exists, it is updated in place.
 * Otherwise, a new record is prepended.
 */
export function saveEventToHistory(
  intake: EventIntake,
  plan: EventPlan,
  telemetry?: Telemetry | null
): SavedEventRecord {
  const existingEvents = getSavedEvents();
  const now = new Date().toISOString();

  // Find if event with same name and date exists
  const existingIndex = existingEvents.findIndex(
    (e) =>
      e.intake.eventName.trim().toLowerCase() === intake.eventName.trim().toLowerCase() &&
      e.intake.eventDate === intake.eventDate
  );

  let updatedRecord: SavedEventRecord;

  if (existingIndex >= 0) {
    // Update existing record
    updatedRecord = {
      ...existingEvents[existingIndex],
      updatedAt: now,
      intake,
      plan,
      telemetry: telemetry || existingEvents[existingIndex].telemetry,
    };
    existingEvents[existingIndex] = updatedRecord;
  } else {
    // Create new record
    const id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    updatedRecord = {
      id,
      savedAt: now,
      updatedAt: now,
      intake,
      plan,
      telemetry: telemetry ?? null,
    };
    existingEvents.unshift(updatedRecord);
  }

  // Cap storage to maximum allowed records
  const trimmed = existingEvents.slice(0, MAX_SAVED_EVENTS);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('[HappyTimes] Failed to write saved events to localStorage:', err);
    }
  } else {
    memoryStorage = trimmed;
  }

  return updatedRecord;
}

/**
 * Delete a saved event by its unique ID.
 */
export function deleteSavedEvent(id: string): boolean {
  const existingEvents = getSavedEvents();
  const filtered = existingEvents.filter((e) => e.id !== id);

  if (filtered.length === existingEvents.length) {
    return false;
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('[HappyTimes] Failed to delete event from localStorage:', err);
    }
  } else {
    memoryStorage = filtered;
  }

  return true;
}

/**
 * Clear all saved event history.
 */
export function clearAllSavedEvents(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('[HappyTimes] Failed to clear localStorage:', err);
    }
  }
  memoryStorage = [];
}
