'use client';

/**
 * StationHeader - MRT-style station header with line badge and station name.
 *
 * Reusable component that displays the current station/word in PIDS style.
 * Can be used on results screen, practice mode, or anywhere showing current station.
 */

interface StationHeaderProps {
  /** MRT line color (hex) */
  lineColor: string;
  /** Line abbreviation (e.g., "NS", "EW", "CC") */
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
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Line Badge - circular like MRT line indicators */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0"
        style={{ backgroundColor: lineColor }}
      >
        {lineAbbreviation}
      </div>

      {/* Station Name */}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-widest text-gray-400 mb-1">Station</div>
        <h1
          className="text-3xl md:text-4xl font-bold tracking-wide text-white truncate"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {stationName.toUpperCase()}
        </h1>
      </div>
    </div>
  );
}
