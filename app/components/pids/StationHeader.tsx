'use client';

import { Train } from 'lucide-react';

/**
 * StationHeader - MRT-style station header with line badge and station name.
 *
 * Styled after Singapore MRT station signage with teal background,
 * line badge, and MRT branding.
 */

interface StationHeaderProps {
  /** MRT line color (hex) */
  lineColor: string;
  /** Line abbreviation (e.g., "NSL", "EWL", "CCL") */
  lineAbbreviation: string;
  /** Station name / word being practiced */
  stationName: string;
  /** Optional additional CSS classes */
  className?: string;
}

export default function StationHeader({
  lineColor,
  lineAbbreviation,
  stationName,
  className = '',
}: StationHeaderProps) {
  return (
    <div
      className={`
        flex items-center gap-4 px-5 py-4 rounded-xl
        bg-[#0a4a4a]
        border border-[#0d5c5c]
        shadow-lg
        ${className}
      `}
    >
      {/* Sign Language Icon */}
      <div className="shrink-0 hidden sm:block">
        <svg
          viewBox="0 0 48 48"
          className="w-12 h-12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 24C12 20 14 16 18 14C22 12 26 14 28 18C30 14 34 12 38 16C42 20 40 28 36 32C32 36 24 40 24 40C24 40 16 36 12 32C8 28 8 24 12 24Z"
            stroke="#D4A84B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M18 20L22 24M26 20L30 24"
            stroke="#D4A84B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Center Content */}
      <div className="flex-1 text-center min-w-0">
        <div className="text-xs text-gray-300 mb-2 tracking-wide">Sign this station</div>
        <div className="flex items-center justify-center gap-3">
          {/* Line Badge */}
          <span
            className="px-2.5 py-1 rounded text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: lineColor }}
          >
            {lineAbbreviation}
          </span>
          {/* Station Name */}
          <h1 className="text-2xl md:text-3xl font-medium text-white truncate">
            {stationName.charAt(0).toUpperCase() + stationName.slice(1).toLowerCase()}
          </h1>
        </div>
      </div>

      {/* MRT Logo */}
      <div className="shrink-0 hidden sm:flex flex-col items-center bg-[#C41E3A] rounded px-2 py-1.5">
        <Train className="w-5 h-5 text-white" />
        <span className="text-[10px] font-bold text-white tracking-wider">MRT</span>
      </div>
    </div>
  );
}
