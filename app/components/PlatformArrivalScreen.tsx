'use client';

/**
 * PlatformArrivalScreen - Full-screen immersive MRT platform results experience.
 *
 * Styled after Singapore MRT PIDS (Passenger Information Display System) boards -
 * the electronic displays at train stations showing arrival info and service alerts.
 * Features dark theme with line-colored accents for an authentic transit feel.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, ArrowRight, Home } from 'lucide-react';
import { playGlobalSfx } from '@/app/hooks/useAudio';
import {
  StationHeader,
  ArrivalStatus,
  ScoreBadge,
  WordComparison,
  FeedbackPanel,
  AnnouncementPlayer,
  type ArrivalScenario,
} from './pids';

// ============================================================
// TYPES
// ============================================================

interface FeedbackResult {
  feedbackText: string;
  encouragement: string;
  technicalTips: string[];
}

export interface AnnounceData {
  success: boolean;
  scenario: ArrivalScenario;
  message: string;
  phonetic?: string;
  audioBase64?: string;
  audioMimeType?: string;
}

interface PlatformArrivalScreenProps {
  /** Score from validation (0-100) */
  score: number | null;
  /** The expected word */
  expectedWord: string;
  /** What the user signed (transcription) */
  transcription: string | null;
  /** Feedback from validation */
  feedback: FeedbackResult | null;
  /** MRT line color */
  lineColor: string;
  /** MRT line abbreviation (e.g., "NS", "EW") */
  lineAbbreviation: string;
  /** Announcement data from TTS API */
  announcementData: AnnounceData | null;
  /** Whether announcement is still loading */
  announcementLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Callback for try again */
  onTryAgain: () => void;
  /** Callback for next word */
  onNextWord: () => void;
  /** Optional callback for going home */
  onGoHome?: () => void;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getScenarioFromScore(score: number | null): ArrivalScenario {
  if (score === null) return 'delayed';
  if (score >= 70) return 'safe';
  if (score >= 40) return 'delayed';
  return 'crash';
}

// ============================================================
// COMPONENT
// ============================================================

/**
 * PlatformArrivalScreen - Full-screen immersive MRT platform results experience.
 *
 * Composes all PIDS sub-components into a unified display that shows:
 * - Station header with line badge
 * - Arrival status (crashed/delayed/arrived)
 * - Score badge
 * - Word comparison (target vs signed)
 * - Announcement player with TTS
 * - Feedback panel with tips
 * - Action buttons
 */
export default function PlatformArrivalScreen({
  score,
  expectedWord,
  transcription,
  feedback,
  lineColor,
  lineAbbreviation,
  announcementData,
  announcementLoading = false,
  error,
  onTryAgain,
  onNextWord,
  onGoHome,
}: PlatformArrivalScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<
    { leftPct: number; delaySec: number; color: string }[]
  >([]);
  const hasPlayedSoundRef = useRef(false);

  // Determine scenario from score or announcement data
  const scenario = announcementData?.scenario ?? getScenarioFromScore(score);

  // Play result sound effect once
  useEffect(() => {
    if (score !== null && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      playGlobalSfx(score >= 70 ? 'correct' : 'wrong');
    }
  }, [score]);

  // Trigger confetti for successful arrivals
  useEffect(() => {
    if (score !== null && score >= 70) {
      let cancelled = false;
      const startTimer = setTimeout(() => {
        if (cancelled) return;
        setShowConfetti(true);
        setConfettiPieces(
          Array.from({ length: 30 }, (_, i) => ({
            leftPct: Math.random() * 100,
            delaySec: Math.random() * 0.5,
            color: ['#D42E12', '#009645', '#FA9E0D', '#9900AA', '#005EC4'][i % 5],
          }))
        );
      }, 0);

      const stopTimer = setTimeout(() => {
        if (cancelled) return;
        setShowConfetti(false);
      }, 4000);

      return () => {
        cancelled = true;
        clearTimeout(startTimer);
        clearTimeout(stopTimer);
      };
    }
  }, [score]);

  const handleAnnouncementComplete = useCallback(() => {
    // Could trigger additional animations or effects here
  }, []);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onTryAgain}
              className="px-6 py-3 rounded-xl font-medium text-white transition-all hover:scale-105"
              style={{ backgroundColor: lineColor }}
            >
              Try Again
            </button>
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-6 py-3 rounded-xl font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all hover:scale-105"
              >
                Go Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50">
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

      {/* Line color accent bar at top */}
      <div className="h-2 w-full" style={{ backgroundColor: lineColor }} />

      {/* Main content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Station Header */}
        <StationHeader
          lineColor={lineColor}
          lineAbbreviation={lineAbbreviation}
          stationName={expectedWord}
          className="mb-6"
        />

        {/* Arrival Status */}
        <ArrivalStatus scenario={scenario} className="mb-6" />

        {/* Score and Word Comparison Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          {/* Score Badge */}
          {score !== null && (
            <div className="flex justify-center md:justify-start shrink-0">
              <ScoreBadge score={score} size="md" />
            </div>
          )}

          {/* Word Comparison */}
          <div className="flex-1">
            <WordComparison
              targetWord={expectedWord}
              recognizedWord={transcription || ''}
              lineColor={lineColor}
            />
          </div>
        </div>

        {/* Announcement Player */}
        {announcementLoading ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-5 h-5 border-2 border-gray-600 rounded-full animate-spin"
                style={{ borderTopColor: lineColor }}
              />
              <span className="text-gray-400 text-sm">Preparing announcement...</span>
            </div>
          </div>
        ) : announcementData?.success ? (
          <AnnouncementPlayer
            audioBase64={announcementData.audioBase64}
            audioMimeType={announcementData.audioMimeType}
            message={announcementData.message}
            phonetic={announcementData.phonetic}
            autoPlay={true}
            onPlayComplete={handleAnnouncementComplete}
            className="mb-6"
          />
        ) : null}

        {/* Feedback Panel */}
        {feedback && (
          <FeedbackPanel
            encouragement={feedback.encouragement}
            tips={feedback.technicalTips}
            className="mb-6"
          />
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 px-6 py-4 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-98 flex items-center justify-center gap-2 shadow-lg"
            style={{ backgroundColor: lineColor }}
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <button
            onClick={onNextWord}
            className="flex-1 px-6 py-4 rounded-xl font-medium bg-gray-800 hover:bg-gray-700 text-white transition-all active:scale-98 flex items-center justify-center gap-2 border border-gray-700"
          >
            Next Word
            <ArrowRight className="w-5 h-5" />
          </button>
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-6 py-4 rounded-xl font-medium bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2 border border-gray-700/50"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle platform pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 20px,
              rgba(255,255,255,0.03) 20px,
              rgba(255,255,255,0.03) 21px
            )
          `,
        }}
      />
    </div>
  );
}
