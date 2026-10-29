import React from 'react';

/**
 * Budget Tracker Icon: Dollar circle with ascending bar chart bars.
 * Matches the reference design.
 */
export function BudgetTrackerIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Coin with dollar */}
      <circle cx="9" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M9 8.5V15.5M7.5 10C7.5 9.2 8.2 8.8 9 8.8C10 8.8 10.5 9.3 10.5 10.2C10.5 11.5 7.5 11.8 7.5 13.2C7.5 14.1 8.2 14.7 9 14.7C9.8 14.7 10.5 14.2 10.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Ascending Chart Bars */}
      <path d="M17 17V14M19.5 17V11M22 17V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Dual Timelines Icon: Branching and connected timeline milestones.
 * Matches the reference design.
 */
export function DualTimelinesIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="5" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="19" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      {/* Connecting pathway */}
      <path d="M7.5 8H11C13.5 8 14.5 12 16.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 16H11C13.5 16 14.5 12 16.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Vendor Checklist Icon: Clipboard with checkmark lines.
 * Matches the reference design.
 */
export function VendorChecklistIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
      {/* Top clip */}
      <path d="M9 3H15V6H9V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Checkmarks & lines */}
      <path d="M8 10.5L9.5 12L12 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11H16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 15.5L9.5 17L12 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 16H16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Ideas Studio Icon: Radiant lightbulb with rays.
 * Matches the reference design.
 */
export function IdeasStudioIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M9 18H15M10 21H14M12 3V5M4 11H6M18 11H20M6.3 5.3L7.7 6.7M16.3 17.7L17.7 19.1M17.7 5.3L16.3 6.7M7.7 17.7L6.3 19.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 7C9.2 7 7 9.2 7 12C7 13.8 8 15.3 9.5 16.2V17C9.5 17.6 9.9 18 10.5 18H13.5C14.1 18 14.5 17.6 14.5 17V16.2C16 15.3 17 13.8 17 12C17 9.2 14.8 7 12 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Party Burst Icon: Party horn shooting confetti and sparkles.
 * Matches the reference design.
 */
export function PartyBurstIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Popper cone */}
      <path d="M3 21L9.5 14.5M4.5 19.5C3.8 18.8 4 17.5 5 16.5L13 8.5C14 7.5 15.3 7.7 16 8.5L16.5 9C17.3 9.7 17.1 11 16.1 12L8.1 20C7.1 21 5.8 20.8 5 20L4.5 19.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Streamers & stars */}
      <path d="M18 3L19 5L21 6L19 7L18 9L17 7L15 6L17 5L18 3Z" fill="currentColor" />
      <circle cx="20.5" cy="13.5" r="1.3" fill="currentColor" />
      <circle cx="12.5" cy="4.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
