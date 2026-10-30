'use client';

/**
 * @fileoverview Skip-to-content accessibility link and ARIA live announcer.
 * Ensures keyboard and screen-reader users can bypass navigation and receive
 * dynamic status announcements.
 */

import React, { useState, useCallback } from 'react';

/**
 * SkipToContent link that appears on keyboard tab focus.
 */
export function SkipToContent(): React.JSX.Element {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-indigo-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-700 transition-all font-medium text-sm"
    >
      Skip to main content
    </a>
  );
}

/**
 * AriaLiveAnnouncer component for announcing status changes to screen readers.
 */
export function AriaLiveAnnouncer({
  message,
  assertive = false,
}: {
  message: string;
  assertive?: boolean;
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage screen reader announcements.
 */
export function useAnnouncer(): {
  message: string;
  announce: (text: string) => void;
} {
  const [message, setMessage] = useState('');

  const announce = useCallback((text: string) => {
    setMessage('');
    setTimeout(() => {
      setMessage(text);
    }, 50);
  }, []);

  return { message, announce };
}

