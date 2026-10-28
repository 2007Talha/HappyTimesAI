/**
 * @fileoverview Export utilities for HappyTimes.
 * Provides CSV budget export, .ics iCalendar file generation for timelines,
 * and browser file download helpers.
 */

import type { BudgetCategory, TimelineMilestone, DayOfScheduleItem } from '@/schemas/eventSchemas';

/**
 * Clean a string for safe CSV inclusion (escaping quotes, commas, newlines).
 * @param str - Value to sanitize for CSV
 * @returns Escaped CSV cell string
 */
function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate a CSV string from budget categories.
 * @param categories - Array of budget categories
 * @param totalBudget - Total event budget
 * @returns Formatted CSV content string
 */
export function exportBudgetToCsv(
  categories: BudgetCategory[],
  totalBudget: number
): string {
  const headers = [
    'Category',
    'Percentage (%)',
    'Estimated ($)',
    'Actual Spent ($)',
    'Variance ($)',
    'Status',
    'Locked',
    'Notes',
  ];

  const rows = categories.map((cat) => {
    const variance = cat.actualSpent - cat.estimatedAmount;
    const status =
      cat.actualSpent === 0
        ? 'Not Started'
        : variance > 0
        ? 'Over Budget'
        : variance < 0
        ? 'Under Budget'
        : 'On Budget';

    return [
      escapeCsvCell(cat.name),
      escapeCsvCell(cat.percentage.toFixed(2)),
      escapeCsvCell(cat.estimatedAmount.toFixed(2)),
      escapeCsvCell(cat.actualSpent.toFixed(2)),
      escapeCsvCell(variance.toFixed(2)),
      escapeCsvCell(status),
      escapeCsvCell(cat.isLocked ? 'Yes' : 'No'),
      escapeCsvCell(cat.notes ?? ''),
    ].join(',');
  });

  const totalActual = categories.reduce((sum, c) => sum + c.actualSpent, 0);
  const totalEstimated = categories.reduce((sum, c) => sum + c.estimatedAmount, 0);
  const totalVariance = totalActual - totalEstimated;

  const summaryRow = [
    'TOTAL',
    '100.00',
    escapeCsvCell(totalBudget.toFixed(2)),
    escapeCsvCell(totalActual.toFixed(2)),
    escapeCsvCell(totalVariance.toFixed(2)),
    totalActual > totalBudget ? 'OVER TOTAL BUDGET' : 'WITHIN BUDGET',
    '-',
    '-',
  ].join(',');

  return [headers.join(','), ...rows, summaryRow].join('\r\n');
}

/**
 * Format a Date or date string to iCalendar UTC format (YYYYMMDDTHHmmssZ).
 * @param dateStr - Date string or Date object
 * @param timeStr - Optional HH:mm time string
 * @returns iCalendar timestamp
 */
function formatIcsDateTime(dateStr: string, timeStr?: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return `${cleanDate}T090000Z`;
  }
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}Z`;
}

/**
 * Generate a valid .ics iCalendar file string for event milestones and day-of schedule.
 * @param eventName - Name of the event
 * @param eventDate - Date of the event (YYYY-MM-DD)
 * @param milestones - Pre-event milestones
 * @param dayOfSchedule - Day-of run-of-show schedule items
 * @returns RFC 5545 compliant iCalendar string
 */
export function exportTimelineToIcs(
  eventName: string,
  eventDate: string,
  milestones: TimelineMilestone[],
  dayOfSchedule: DayOfScheduleItem[]
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HappyTimes//Event Planning Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${eventName} Schedule`,
  ];

  const nowIcs = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // Add Pre-Event Milestones as VEVENTs
  milestones.forEach((m) => {
    const dtStart = formatIcsDateTime(m.dueDate, '09:00');
    const dtEnd = formatIcsDateTime(m.dueDate, '10:00');
    lines.push(
      'BEGIN:VEVENT',
      `UID:milestone-${m.id}@happytimes.app`,
      `DTSTAMP:${nowIcs}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:[Milestone] ${m.title}`,
      `DESCRIPTION:${m.description.replace(/\n/g, '\\n')} (Owner: ${m.owner || 'Unassigned'})`,
      `CATEGORIES:${m.category || 'Planning'}`,
      `STATUS:${m.isComplete ? 'COMPLETED' : 'CONFIRMED'}`,
      'END:VEVENT'
    );
  });

  // Add Day-Of Run-of-Show Items as VEVENTs
  dayOfSchedule.forEach((item) => {
    const dtStart = formatIcsDateTime(eventDate, item.time);
    const dtEnd = formatIcsDateTime(eventDate, item.endTime || item.time);
    lines.push(
      'BEGIN:VEVENT',
      `UID:dayof-${item.id}@happytimes.app`,
      `DTSTAMP:${nowIcs}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:[Day-Of] ${item.activity}`,
      `LOCATION:${item.location || 'Main Venue'}`,
      `DESCRIPTION:${item.notes ? item.notes.replace(/\n/g, '\\n') : ''} (Lead: ${item.owner || 'Lead'}, Buffer: ${item.bufferMinutes}m)`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Triggers browser download of text content as a file.
 * @param content - File content as string
 * @param filename - Target filename (e.g. "budget.csv")
 * @param mimeType - File MIME type (e.g. "text/csv;charset=utf-8;")
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

