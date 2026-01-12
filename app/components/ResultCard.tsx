'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, Target, Hand, Lightbulb, RefreshCw, ArrowRight } from 'lucide-react';
import { playGlobalSfx } from '@/app/hooks/useAudio';
import ArrivalToast, { type ArrivalScenario } from './ArrivalToast';

// ============================================================
// TYPES
// ============================================================

interface FeedbackResult {
  feedbackText: string;
  encouragement: string;
  technicalTips: string[];
}

export interface AnnounceResponse {
  success: boolean;
  scenario: ArrivalScenario;
  message: string;
  phonetic?: string;
  audioBase64?: string;
  audioMimeType?: string;
  error?: string;
}

interface ResultCardProps {
  score: number | null;
  expectedWord: string;
  transcription: string | null;
  feedback: FeedbackResult | null;
  lineColor: string;
  isLoading?: boolean;
  error?: string | null;
  matchPercentage?: number; // From validation result
  announcementData?: AnnounceResponse | null; // Passed from parent
  announcementLoading?: boolean; // Passed from parent
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
  matchPercentage: _matchPercentage,
  announcementData,
  announcementLoading = false,
  onTryAgain,
  onNextWord,
}: ResultCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<
    { leftPct: number; delaySec: number; color: string }[]
  >([]);
  const hasPlayedSoundRef = useRef(false);

  // Toast visibility - controlled by local state, but initialized when data arrives
  const [toastDismissed, setToastDismissed] = useState(false);

  // Handle toast dismiss
  const handleToastDismiss = useCallback(() => {
    setToastDismissed(true);
  }, []);

  // Derive toast visibility: show if we have data AND it hasn't been dismissed
  const showToast = !!(announcementData?.success && !toastDismissed);

  // Play result sound effect once when score is received
  useEffect(() => {
    if (score !== null && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      // Play correct sound for passing scores (>=70), wrong sound otherwise
      playGlobalSfx(score >= 70 ? 'correct' : 'wrong');
    }
  }, [score]);

  // Reset sound ref when component unmounts or score becomes null
  useEffect(() => {
    if (score === null) {
      hasPlayedSoundRef.current = false;
    }
  }, [score]);

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
        <div
          className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mx-auto mb-4"
          style={{ borderTopColor: lineColor }}
        />
        <p className="text-gray-600 text-lg">Analysing your sign...</p>
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
      {/* Arrival Toast (top-right) */}
      {showToast && announcementData && (
        <ArrivalToast
          scenario={announcementData.scenario}
          message={announcementData.message}
          recognizedWord={transcription || '???'}
          phonetic={announcementData.phonetic}
          targetWord={expectedWord}
          audioBase64={announcementData.audioBase64}
          audioMimeType={announcementData.audioMimeType}
          onDismiss={handleToastDismiss}
        />
      )}

      {/* Loading indicator for announcement */}
      {announcementLoading && (
        <div className="fixed top-4 right-4 z-40 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div
            className="w-4 h-4 border-2 border-gray-200 rounded-full animate-spin"
            style={{ borderTopColor: lineColor }}
          />
          <span className="text-sm text-gray-600">Loading announcement...</span>
        </div>
      )}

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

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Score Header - Clean MRT signage style */}
        <div
          className="p-5 flex items-center gap-4"
          style={{
            backgroundColor: `${getScoreColor()}10`,
            borderBottom: `3px solid ${getScoreColor()}`,
          }}
        >
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
            style={{ backgroundColor: getScoreColor() }}
          >
            {score !== null ? score : '--'}
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-800">{getScoreMessage()}</div>
            <div className="text-sm text-gray-500">
              {score !== null && score >= 70 ? 'Word completed' : 'Keep practicing'}
            </div>
          </div>
          {score !== null && (
            <div className="shrink-0">
              {score >= 70 ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <XCircle className="w-8 h-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Word Comparison Panel */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Target Word */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Target
                </span>
              </div>
              <div className="font-bold text-lg" style={{ color: lineColor }}>
                {expectedWord}
              </div>
            </div>
            {/* Recognized Word */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Hand className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  You Signed
                </span>
              </div>
              <div className="font-bold text-lg text-gray-800 font-mono">
                {transcription || '—'}
              </div>
            </div>
          </div>

          {/* Feedback Section - Compact style */}
          {feedback && (
            <div className="space-y-3">
              {/* Encouragement */}
              {feedback.encouragement && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                  {feedback.encouragement}
                </div>
              )}

              {/* Technical Tips */}
              {feedback.technicalTips && feedback.technicalTips.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-blue-600 uppercase tracking-wider font-medium">
                      Tips
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-sm text-blue-800">
                    {feedback.technicalTips.slice(0, 3).map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions - Clean button style */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-all hover:opacity-90 active:scale-98 flex items-center justify-center gap-2"
            style={{ backgroundColor: lineColor }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onNextWord}
            className="flex-1 px-4 py-3 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            Next Word
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
