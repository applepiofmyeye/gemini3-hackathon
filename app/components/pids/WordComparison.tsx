'use client';

import { Target, Hand } from 'lucide-react';

/**
 * WordComparison - Side-by-side target vs recognized word display.
 *
 * Light-themed panel showing what was expected vs what was signed.
 * Used in results screen to show comparison.
 */

interface WordComparisonProps {
  /** The expected/target word */
  targetWord: string;
  /** The recognized/signed word */
  recognizedWord: string;
  /** MRT line color for accent */
  lineColor: string;
  /** Optional additional CSS classes */
  className?: string;
}

export default function WordComparison({
  targetWord,
  recognizedWord,
  lineColor,
  className = '',
}: WordComparisonProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {/* Target Word */}
      <div className="bg-white/90 backdrop-blur rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Target</span>
        </div>
        <div className="font-bold text-xl font-mono tracking-wide" style={{ color: lineColor }}>
          {targetWord.toUpperCase()}
        </div>
      </div>

      {/* Recognized Word */}
      <div className="bg-white/90 backdrop-blur rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Hand className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
            You Signed
          </span>
        </div>
        <div className="font-bold text-xl font-mono tracking-wide text-gray-800">
          {recognizedWord || '—'}
        </div>
      </div>
    </div>
  );
}
