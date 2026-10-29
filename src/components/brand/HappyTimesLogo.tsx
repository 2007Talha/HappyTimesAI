import React from 'react';

interface HappyTimesLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * HappyTimes Official Brand Mark.
 * Features an authentic SaaS squircle with the calendar planner,
 * celebration magic wand with radiant star burst, and event clock timer.
 */
export function HappyTimesIcon({ className = 'w-6 h-6' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Calendar Planner Board */}
      <rect
        x="6"
        y="9"
        width="20"
        height="19"
        rx="3.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="white"
        fillOpacity="0.12"
      />
      {/* Calendar Top Header Divider */}
      <path
        d="M6 14.5H26"
        stroke="white"
        strokeWidth="1.8"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
      {/* Calendar Top Binder Rings */}
      <path d="M11 6.5V9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21 6.5V9.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />

      {/* Diagonal Magic Celebration Wand */}
      <path
        d="M7 27L17.5 16.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M8.5 25.5L11 28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />

      {/* Radiant Star Burst Sparkle at Wand Tip */}
      <path
        d="M21 7.5L22.2 10.8L25.8 11.2L23 13.5L23.8 17L20.8 15.2L17.8 17L18.6 13.5L15.8 11.2L19.4 10.8L21 7.5Z"
        fill="#ffffff"
      />
      {/* Celebration Sparkle Accents */}
      <circle cx="26.5" cy="8.5" r="1" fill="#fef08a" />
      <circle cx="16" cy="7.5" r="1" fill="#fef08a" />
      <circle cx="27" cy="15" r="1.1" fill="#fef08a" />

      {/* Round Clock Timer at Bottom-Right */}
      <circle
        cx="23.5"
        cy="23.5"
        r="4.8"
        stroke="white"
        strokeWidth="2"
        fill="#5c3beb"
      />
      <path
        d="M23.5 21V23.5L25.5 24.8"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HappyTimesBrand({
  size = 'md',
  showText = true,
  className = '',
}: HappyTimesLogoProps): React.JSX.Element {
  const containerClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-11 h-11 rounded-2xl shadow-lg shadow-[#5c3beb]/25',
    lg: 'w-14 h-14 rounded-3xl shadow-xl shadow-[#5c3beb]/30',
  }[size];

  const iconClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[size];

  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      <div
        className={`${containerClasses} bg-gradient-to-tr from-[#5c3beb] via-[#6d46f5] to-[#8c67fa] flex items-center justify-center text-white ring-1 ring-white/40 shrink-0 transition-transform hover:scale-105`}
      >
        <HappyTimesIcon className={iconClasses} />
      </div>

      {showText && (
        <div>
          <span className="text-2xl font-bold tracking-tight text-[#171520] font-editorial block leading-none">
            HappyTimes
          </span>
          <span className="text-xs text-slate-500 font-sans font-medium block mt-1 tracking-normal">
            Event Planning Studio
          </span>
        </div>
      )}
    </div>
  );
}

