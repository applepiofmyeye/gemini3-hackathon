'use client';

import { Lightbulb, MessageCircle } from 'lucide-react';

/**
 * FeedbackPanel - Tips and encouragement display in info-board style.
 *
 * Styled as an MRT info board with helpful feedback.
 * Can be used anywhere tips or encouragement need to be shown.
 */

interface FeedbackPanelProps {
  /** Encouragement message */
  encouragement?: string;
  /** Array of tips */
  tips?: string[];
  /** Optional additional CSS classes */
  className?: string;
}

export default function FeedbackPanel({ encouragement, tips, className = '' }: FeedbackPanelProps) {
  const hasFeedback = encouragement || (tips && tips.length > 0);

  if (!hasFeedback) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Encouragement */}
      {encouragement && (
        <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-200 text-sm">{encouragement}</p>
          </div>
        </div>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400 uppercase tracking-wider font-medium">
              Tips for Next Time
            </span>
          </div>
          <ul className="space-y-2">
            {tips.slice(0, 3).map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-200">
                <span className="text-blue-400 mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
