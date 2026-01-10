'use client';

import { useEffect, useState } from 'react';

// ============================================================
// TYPES
// ============================================================

interface FeedbackResult {
  feedbackText: string;
  encouragement: string;
  technicalTips: string[];
}

interface ResultCardProps {
  score: number | null;
  expectedWord: string;
  transcription: string | null;
  feedback: FeedbackResult | null;
  lineColor: string;
  isLoading?: boolean;
  error?: string | null;
  onTryAgain: () => void;
  onNextWord: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ResultCard({
  score,
  expectedWord,
  transcription,
  feedback,
  lineColor,
  isLoading = false,
  error,
  onTryAgain,
  onNextWord,
}: ResultCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<
    { leftPct: number; delaySec: number; color: string }[]
  >([]);

  // Trigger confetti for high scores
  useEffect(() => {
    if (score !== null && score >= 70) {
      let cancelled = false;
      const startTimer = setTimeout(() => {
        if (cancelled) return;
        setShowConfetti(true);
        setConfettiPieces(
          Array.from({ length: 20 }, (_, i) => ({
            leftPct: Math.random() * 100,
            delaySec: Math.random() * 0.5,
            color: ['#D42E12', '#009645', '#FA9E0D', '#9900AA', '#005EC4'][i % 5],
          }))
        );
      }, 0);

      const stopTimer = setTimeout(() => {
        if (cancelled) return;
        setShowConfetti(false);
      }, 3000);

      return () => {
        cancelled = true;
        clearTimeout(startTimer);
        clearTimeout(stopTimer);
      };
    }
  }, [score]);

  // Score-based styling
  const getScoreColor = () => {
    if (score === null) return '#9ca3af';
    if (score >= 80) return '#22c55e'; // Green
    if (score >= 60) return '#eab308'; // Yellow
    if (score >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getScoreEmoji = () => {
    if (score === null) return '🤔';
    if (score >= 90) return '🌟';
    if (score >= 80) return '🎉';
    if (score >= 70) return '✨';
    if (score >= 50) return '👍';
    return '💪';
  };

  const getScoreMessage = () => {
    if (score === null) return 'Processing...';
    if (score >= 90) return 'Perfect!';
    if (score >= 80) return 'Excellent!';
    if (score >= 70) return 'Great job!';
    if (score >= 50) return 'Good effort!';
    return 'Keep practicing!';
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-xl text-center">
        <div className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mx-auto mb-4" style={{ borderTopColor: lineColor }} />
        <p className="text-gray-600 text-lg">Analyzing your sign...</p>
        <p className="text-gray-400 text-sm mt-2">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">😕</div>
          <h2 className="text-xl font-bold text-gray-800">Something went wrong</h2>
          <p className="text-red-600 mt-2">{error}</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={onTryAgain}
            className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
            style={{ backgroundColor: lineColor }}
          >
            Try Again
          </button>
          <button
            onClick={onNextWord}
            className="px-6 py-3 rounded-xl font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all hover:scale-105"
          >
            Choose Another Word
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {confettiPieces.map((p, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                backgroundColor: p.color,
                left: `${p.leftPct}%`,
                animationDelay: `${p.delaySec}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Score Header */}
        <div
          className="p-6 text-center"
          style={{ backgroundColor: `${getScoreColor()}15` }}
        >
          <div className="text-5xl mb-2">{getScoreEmoji()}</div>
          <div
            className="text-6xl font-bold mb-2"
            style={{ color: getScoreColor() }}
          >
            {score !== null ? score : '--'}
          </div>
          <div className="text-xl font-medium text-gray-700">{getScoreMessage()}</div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Word Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Target</div>
              <div className="font-bold text-lg" style={{ color: lineColor }}>
                {expectedWord}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recognized</div>
              <div className="font-bold text-lg text-gray-800">
                {transcription || 'Nothing detected'}
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <>
              {/* Main Feedback */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: `${lineColor}10` }}>
                <p className="text-gray-700">{feedback.feedbackText}</p>
              </div>

              {/* Encouragement */}
              {feedback.encouragement && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-amber-800 font-medium">{feedback.encouragement}</p>
                </div>
              )}

              {/* Technical Tips */}
              {feedback.technicalTips && feedback.technicalTips.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="text-xs text-blue-600 uppercase tracking-wider mb-2 font-medium">
                    Tips to Improve
                  </div>
                  <ul className="space-y-2">
                    {feedback.technicalTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-blue-800">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-4">
          <button
            onClick={onTryAgain}
            className="flex-1 px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: lineColor }}
          >
            Try Again
          </button>
          <button
            onClick={onNextWord}
            className="flex-1 px-6 py-3 rounded-xl font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all hover:scale-105 active:scale-95"
          >
            Next Word
          </button>
        </div>

        {/* Pass/Fail Indicator */}
        {score !== null && (
          <div
            className="py-2 text-center text-sm font-medium text-white"
            style={{ backgroundColor: score >= 70 ? '#22c55e' : '#9ca3af' }}
          >
            {score >= 70 ? '✓ Word Completed!' : 'Keep practicing to complete this word'}
          </div>
        )}
      </div>
    </div>
  );
}
