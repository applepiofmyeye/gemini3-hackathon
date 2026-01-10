'use client';

import { useEffect, useState, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import MRTMap from '@/app/components/MRTMap';
import SignPractice from '@/app/components/SignPractice';
import ResultCard from '@/app/components/ResultCard';
import { useGameSession } from '@/app/hooks/useGameSession';
import { useProgress } from '@/app/hooks/useProgress';
import { useStationNavigation } from '@/app/hooks/useStationNavigation';
import { getWordById } from '@/lib/data/vocabulary';
import { getMRTLineById } from '@/lib/data/mrt-lines';
import { MRT_LINES } from '@/lib/data/mrt-lines';
import { VOCABULARY } from '@/lib/data/vocabulary';
import type { MRTLine } from '@/lib/data/mrt-lines';
import type { VocabularyWord } from '@/lib/data/vocabulary';

export default function PracticePage() {
  const params = useParams();
  const lineId = params.lineId as string;
  const stationId = params.stationId as string;

  const [lines, setLines] = useState<MRTLine[]>(MRT_LINES);
  const [vocabulary, setVocabulary] = useState<Record<string, VocabularyWord[]>>(VOCABULARY);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const {
    session,
    currentWord,
    currentLine,
    validationResult,
    isLoading: isValidating,
    error: sessionError,
    fetchConfig,
    startGame,
    endStreaming,
    submitForValidation,
    resetGame,
  } = useGameSession();

  const { progress, isLoaded: isProgressLoaded, recordAttempt } = useProgress();
  const { goToNext, goToHome } = useStationNavigation();

  // Validate route params
  const line = getMRTLineById(lineId);
  const word = getWordById(lineId, stationId);

  // Load game configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchConfig();
        setLines(config.lines);
        setVocabulary(config.vocabulary);
      } catch (e) {
        setConfigError(e instanceof Error ? e.message : 'Failed to load game configuration');
      } finally {
        setIsConfigLoading(false);
      }
    };
    loadConfig();
  }, [fetchConfig]);

  // Start game session when component mounts or params change
  useEffect(() => {
    if (!line || !word || isConfigLoading) return;

    const initializeGame = async () => {
      try {
        await startGame(lineId, stationId);
      } catch (e) {
        console.error('[PracticePage] Failed to start game:', e);
        setConfigError(e instanceof Error ? e.message : 'Failed to start game');
      }
    };

    initializeGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId, stationId, isConfigLoading]);

  // Build completed words set from progress
  const completedWords = new Set(
    Object.entries(progress)
      .filter(([, p]) => p.bestScore >= 70)
      .map(([id]) => id)
  );

  // Handle practice completion
  const handlePracticeComplete = useCallback(
    async (finalTranscription: string, durationMs: number, frameCount?: number) => {
      // Update session with final transcription and get updated session
      const updatedSession = endStreaming(finalTranscription, {
        frameCount: frameCount ?? 0,
        transcriptionLength: finalTranscription.length,
        durationMs,
      });

      // Submit for validation with the updated session (avoids race condition)
      try {
        const result = await submitForValidation(updatedSession);

        // Record progress if we got a score
        if (result.score !== null && currentWord) {
          recordAttempt(currentWord.id, result.score);
        }
      } catch (e) {
        console.error('[PracticePage] Validation failed:', e);
      }
    },
    [endStreaming, submitForValidation, recordAttempt, currentWord]
  );

  // Handle practice cancellation
  const handlePracticeCancel = useCallback(() => {
    resetGame();
    goToHome();
  }, [resetGame, goToHome]);

  // Handle try again
  const handleTryAgain = useCallback(async () => {
    if (line && word) {
      try {
        resetGame();
        await startGame(lineId, stationId);
      } catch (e) {
        console.error('[PracticePage] Failed to restart game:', e);
      }
    }
  }, [lineId, stationId, line, word, startGame, resetGame]);

  // Handle next word
  const handleNextWord = useCallback(() => {
    resetGame();
    goToNext(lineId, stationId);
  }, [resetGame, goToNext, lineId, stationId]);

  // Handle word selection from map (shouldn't happen in practice mode, but handle gracefully)
  const handleSelectWord = useCallback((selectedLineId: string, selectedWordId: string) => {
    // Navigate to the selected station
    window.location.href = `/${selectedLineId}/${selectedWordId}`;
  }, []);

  // Invalid route params
  if (!line || !word) {
    notFound();
  }

  // Loading state
  if (isConfigLoading || !isProgressLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-screen">
        <div
          className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mb-4"
          style={{ borderTopColor: line?.color || '#D42E12' }}
        />
        <p className="text-gray-600">Loading game...</p>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-2xl min-h-screen">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to load game</h2>
        <p className="text-red-600">{configError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show results if validation is complete
  if (validationResult !== null && currentWord && currentLine) {
    return (
      <div className="min-h-screen bg-[var(--hot-cream)]">
        <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen relative z-10">
          <div className="w-full max-w-3xl">
            <ResultCard
              score={validationResult.score ?? null}
              expectedWord={currentWord.word}
              transcription={session?.finalTranscription ?? null}
              feedback={validationResult.feedback ?? null}
              lineColor={currentLine.color}
              isLoading={isValidating}
              error={sessionError}
              onTryAgain={handleTryAgain}
              onNextWord={handleNextWord}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show practice interface
  return (
    <div className="min-h-screen bg-[var(--hot-cream)]">
      <div className="container mx-auto px-4 py-8 flex flex-col min-h-screen relative z-10">
        {/* Side-by-side layout */}
        <div className="flex flex-col lg:flex-row gap-6 w-full">
          {/* Left: MRT Map */}
          <div className="w-full lg:w-1/3 lg:max-w-md">
            <MRTMap
              lines={lines}
              vocabulary={vocabulary}
              completedWords={completedWords}
              currentLineId={lineId}
              currentStationId={stationId}
              onSelectWord={handleSelectWord}
            />
          </div>

          {/* Right: Sign Practice */}
          <div className="flex-1">
            {currentWord && line && (
              <SignPractice
                apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''}
                expectedWord={currentWord.word}
                lineColor={line.color}
                lineId={line.id}
                lineAbbreviation={line.abbreviation}
                stationId={currentWord.id}
                onComplete={handlePracticeComplete}
                onCancel={handlePracticeCancel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
