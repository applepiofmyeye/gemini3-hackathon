'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * StationHeader - MRT-style station header with line badge and station name.
 *
 * Styled after Singapore MRT station signage with teal background,
 * line badge, and MRT branding. Uses official logos.
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
  // Use station name as-is from vocabulary (already in correct casing)
  // e.g., "MBS" stays "MBS", "Raffles Place" stays "Raffles Place"

  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-xl
        bg-[#06424a]
        shadow-lg
        ${className}
      `}
    >
      {/* Left: Station Logo (Yellow hands) */}
      <div className="shrink-0 hidden sm:block">
        <img
          src="/icons/mrt-station-logo.png"
          alt="Station Logo"
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Center: Line Badge + Station Name */}
      <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
        {/* Line Badge */}
        <span
          className="px-3 py-1.5 rounded text-white font-bold text-base shrink-0 shadow-md"
          style={{ backgroundColor: lineColor }}
        >
          {lineAbbreviation}
        </span>
        {/* Station Name */}
        <h1 className="text-2xl md:text-3xl font-bold text-white truncate tracking-wide">
          {stationName}
        </h1>
      </div>

      {/* Right: MRT Signage Logo */}
      <div className="shrink-0 hidden sm:block">
        <img
          src="/icons/mrt-signage.png"
          alt="MRT"
          className="h-14 w-auto object-contain rounded"
        />
      </div>
    </div>
  );
}
