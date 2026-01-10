'use client';

import { useState, useEffect, useCallback } from 'react';
import MRTMap from './MRTMap';
import SignPractice from './SignPractice';
import ResultCard from './ResultCard';
import { useGameSession } from '../hooks/useGameSession';
import { useProgress } from '../hooks/useProgress';
import type { MRTLine } from '@/lib/data/mrt-lines';
import type { VocabularyWord } from '@/lib/data/vocabulary';

// ============================================================
// TYPES
// ============================================================

type GamePhase = 'selecting' | 'practicing' | 'results';

interface GameSessionProps {
  apiKey: string;
}

// ============================================================
// COMPONENT
// ============================================================

export default function GameSession({ apiKey }: GameSessionProps) {
  const [phase, setPhase] = useState<GamePhase>('selecting');
  const [lines, setLines] = useState<MRTLine[]>([]);
  const [vocabulary, setVocabulary] = useState<Record<string, VocabularyWord[]>>({});
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

  // Build completed words set from progress
  const completedWords = new Set(
    Object.entries(progress)
      .filter(([, p]) => p.bestScore >= 70)
      .map(([id]) => id)
  );

  // Handle word selection
  const handleSelectWord = useCallback(
    async (lineId: string, wordId: string) => {
      try {
        await startGame(lineId, wordId);
        setPhase('practicing');
      } catch (e) {
        console.error('[GameSession] Failed to start game:', e);
      }
    },
    [startGame]
  );

  // Handle practice completion
  const handlePracticeComplete = useCallback(
    async (finalTranscription: string, durationMs: number, frameCount?: number) => {
      console.log('[GameSession] 📥 handlePracticeComplete called:', {
        finalTranscription: finalTranscription || '(empty)',
        transcriptionLength: finalTranscription?.length ?? 0,
        durationMs,
        frameCount,
      });

      setPhase('results');

      // Update session with final transcription and get updated session
      const updatedSession = endStreaming(finalTranscription, {
        frameCount: frameCount ?? 0,
        transcriptionLength: finalTranscription?.length ?? 0,
        durationMs,
      });

      console.log('[GameSession] 📤 Session after endStreaming:', {
        sessionId: updatedSession?.sessionId,
        finalTranscription: updatedSession?.finalTranscription,
        durationMs: updatedSession?.durationMs,
        status: updatedSession?.status,
      });

      // Submit for validation with the updated session (avoids race condition)
      try {
        const result = await submitForValidation(updatedSession);
        console.log('[GameSession] ✅ Validation result:', {
          success: result.success,
          score: result.score,
        });

        // Record progress if we got a score
        if (result.score !== null && currentWord) {
          recordAttempt(currentWord.id, result.score);
        }
      } catch (e) {
        console.error('[GameSession] ❌ Validation failed:', e);
      }
    },
    [endStreaming, submitForValidation, recordAttempt, currentWord]
  );

  // Handle practice cancellation
  const handlePracticeCancel = useCallback(() => {
    resetGame();
    setPhase('selecting');
  }, [resetGame]);

  // Handle try again
  const handleTryAgain = useCallback(async () => {
    if (currentLine && currentWord) {
      try {
        await startGame(currentLine.id, currentWord.id);
        setPhase('practicing');
      } catch (e) {
        console.error('[GameSession] Failed to restart game:', e);
      }
    }
  }, [currentLine, currentWord, startGame]);

  // Handle next word
  const handleNextWord = useCallback(() => {
    resetGame();
    setPhase('selecting');
  }, [resetGame]);

  // Loading state
  if (isConfigLoading || !isProgressLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div
          className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mb-4"
          style={{ borderTopColor: '#D42E12' }}
        />
        <p className="text-gray-600">Loading game...</p>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 rounded-2xl">
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

  return (
    <div className="w-full">
      {/* Phase: Selecting */}
      {/* {phase === 'selecting' && (
        <MRTMap
          lines={lines}
          vocabulary={vocabulary}
          completedWords={completedWords}
          onSelectWord={handleSelectWord}
        />
      )} */}

      {/* Phase: Practicing */}
      {phase === 'practicing' && currentWord && currentLine && (
        <SignPractice
          apiKey={apiKey}
          expectedWord={currentWord.word}
          lineColor={currentLine.color}
          onComplete={handlePracticeComplete}
          onCancel={handlePracticeCancel}
        />
      )}

      {/* Phase: Results */}
      {phase === 'results' && currentWord && currentLine && (
        <ResultCard
          score={validationResult?.score ?? null}
          expectedWord={currentWord.word}
          transcription={session?.finalTranscription ?? null}
          feedback={validationResult?.feedback ?? null}
          lineColor={currentLine.color}
          isLoading={isValidating}
          error={sessionError}
          onTryAgain={handleTryAgain}
          onNextWord={handleNextWord}
        />
      )}
    </div>
  );
}
