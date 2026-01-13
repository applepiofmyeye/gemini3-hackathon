'use client';

import { MessageCircle } from 'lucide-react';

/**
 * FeedbackPanel - Encouragement display in a clean light theme style.
 *
 * Shows the encouragement message with tips embedded.
 * Styled to fit the light theme results screen.
 */

interface FeedbackPanelProps {
  /** Encouragement message */
  encouragement?: string;
  /** Array of tips (optional, will be shown inline) */
  tips?: string[];
  /** Optional additional CSS classes */
  className?: string;
}

export default function FeedbackPanel({ encouragement, tips, className = '' }: FeedbackPanelProps) {
  const hasFeedback = encouragement || (tips && tips.length > 0);

  if (!hasFeedback) return null;

  return (
    <div
      className={`
        bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <MessageCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          {encouragement && <p className="text-amber-800 text-sm">{encouragement}</p>}
          {tips && tips.length > 0 && (
            <p className="text-amber-700 text-sm mt-1">
              <span className="font-medium">Tip:</span> {tips[0]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
