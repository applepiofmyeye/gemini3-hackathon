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

const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16',
    score: 'text-xl',
  },
  md: {
    container: 'w-24 h-24',
    score: 'text-3xl',
  },
  lg: {
    container: 'w-32 h-32',
    score: 'text-4xl',
  },
};

export default function ScoreBadge({ score, size = 'md', className = '' }: ScoreBadgeProps) {
  const scoreColor = getScoreColor(score);
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={`
        ${sizeConfig.container}
        rounded-full flex items-center justify-center
        font-bold text-white shadow-xl
        ring-4 ring-white/20
        ${className}
      `}
      style={{
        backgroundColor: scoreColor,
        boxShadow: `0 0 20px ${scoreColor}40`,
      }}
    >
      <span className={sizeConfig.score}>{score}</span>
    </div>
  );
}
