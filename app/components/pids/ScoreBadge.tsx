'use client';

/**
 * ScoreBadge - MRT-style score display badge.
 *
 * Displays the score in a prominent circular badge with color
 * indicating performance level. Can be used in results, progress views,
 * or leaderboards.
 */

interface ScoreBadgeProps {
  /** Score value (0-100) */
  score: number;
  /** MRT line color for accent */
  lineColor: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional additional CSS classes */
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // Green
  if (score >= 60) return '#eab308'; // Yellow
  if (score >= 40) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Perfect!';
  if (score >= 80) return 'Excellent!';
  if (score >= 70) return 'Great!';
  if (score >= 50) return 'Good effort';
  return 'Keep trying';
}

const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16',
    score: 'text-xl',
    label: 'text-xs',
  },
  md: {
    container: 'w-24 h-24',
    score: 'text-3xl',
    label: 'text-sm',
  },
  lg: {
    container: 'w-32 h-32',
    score: 'text-4xl',
    label: 'text-base',
  },
};

export default function ScoreBadge({
  score,
  lineColor,
  size = 'md',
  className = '',
}: ScoreBadgeProps) {
  const scoreColor = getScoreColor(score);
  const label = getScoreLabel(score);
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* Score Circle */}
      <div
        className={`
          ${sizeConfig.container}
          rounded-full flex items-center justify-center
          font-bold text-white shadow-xl
          ring-4 ring-white/20
        `}
        style={{
          backgroundColor: scoreColor,
          boxShadow: `0 0 20px ${scoreColor}40`,
        }}
      >
        <span className={sizeConfig.score}>{score}</span>
      </div>

      {/* Label */}
      <div className={`${sizeConfig.label} font-medium tracking-wide`} style={{ color: lineColor }}>
        {label}
      </div>
    </div>
  );
}
