'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  GameSessionState,
  TranscriptionEvent,
  SessionStatus,
} from '@/lib/schemas/game-session';
import type { ValidationOutput, ScoringOutput } from '@/lib/schemas/agent-outputs';
import type { VocabularyWord } from '@/lib/data/vocabulary';
import type { MRTLine } from '@/lib/data/mrt-lines';

// ============================================================
// TYPES
// ============================================================

export interface StartGameResponse {
  session: GameSessionState;
  word: VocabularyWord;
  line: {
    id: string;
    name: string;
    color: string;
  };
}

export interface ValidationResponse {
  success: boolean;
  sessionId: string;
  score: number | null;
  validation: ValidationOutput | null;
  scoring: ScoringOutput | null;
  feedback: {
    feedbackText: string;
    encouragement: string;
    technicalTips: string[];
  } | null;
  metrics: {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    durationMs: number;
  };
  error?: string;
}

export interface GameConfig {
  lines: MRTLine[];
  vocabulary: Record<string, VocabularyWord[]>;
}

export interface StreamingStats {
  frameCount: number;
  transcriptionLength: number;
  durationMs: number;
}

// ============================================================
// HOOK
// ============================================================

export function useGameSession() {
  const [session, setSession] = useState<GameSessionState | null>(null);
  const [currentWord, setCurrentWord] = useState<VocabularyWord | null>(null);
  const [currentLine, setCurrentLine] = useState<{
    id: string;
    name: string;
    color: string;
  } | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to always have latest session for validation
  const sessionRef = useRef<GameSessionState | null>(null);

  // Keep ref in sync with state
  const updateSession = useCallback(
    (updater: (prev: GameSessionState | null) => GameSessionState | null) => {
      setSession((prev) => {
        const next = updater(prev);
        sessionRef.current = next;
        return next;
      });
    },
    []
  );

  /**
   * Fetch available game configuration (lines + vocabulary).
   */
  const fetchConfig = useCallback(async (): Promise<GameConfig> => {
    const res = await fetch('/api/game/start');
    if (!res.ok) throw new Error('Failed to fetch game config');
    return res.json();
  }, []);

  /**
   * Start a new game session with a selected word.
   */
  const startGame = useCallback(
    async (lineId: string, wordId: string): Promise<StartGameResponse> => {
      setIsLoading(true);
      setError(null);
      setValidationResult(null);

      try {
        const res = await fetch('/api/game/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId, wordId }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to start game');
        }

        const data: StartGameResponse = await res.json();
        sessionRef.current = data.session;
        setSession(data.session);
        setCurrentWord(data.word);
        setCurrentLine(data.line);
        return data;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update session status.
   */
  const updateStatus = useCallback(
    (status: SessionStatus) => {
      updateSession((prev) => (prev ? { ...prev, status } : null));
    },
    [updateSession]
  );

  /**
   * Record stream start time.
   */
  const startStreaming = useCallback(() => {
    const now = Date.now();
    updateSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'streaming',
            streamStartedAt: now,
          }
        : null
    );
  }, [updateSession]);

  /**
   * Add a transcription event.
   */
  const addTranscription = useCallback(
    (text: string, isFinal = false) => {
      const event: TranscriptionEvent = {
        timestamp: Date.now(),
        text,
        isFinal,
      };
      updateSession((prev) =>
        prev
          ? {
              ...prev,
              transcriptionEvents: [...prev.transcriptionEvents, event],
            }
          : null
      );
    },
    [updateSession]
  );

  /**
   * End streaming and record final transcription.
   * Returns the updated session for immediate use.
   *
   * NOTE: We compute the session synchronously using sessionRef to avoid
   * React's async state batching issues.
   */
  const endStreaming = useCallback(
    (finalTranscription: string, streamingStats?: StreamingStats): GameSessionState | null => {
      console.log('[useGameSession] 📥 endStreaming called:', {
        finalTranscription: finalTranscription || '(empty)',
        transcriptionLength: finalTranscription?.length ?? 0,
        streamingStats,
      });

      // Get current session from ref (synchronous, not affected by React batching)
      const prev = sessionRef.current;

      console.log('[useGameSession] 🔄 Current session from ref:', {
        prevExists: !!prev,
        prevSessionId: prev?.sessionId,
        prevFinalTranscription: prev?.finalTranscription,
      });

      if (!prev) {
        console.error('[useGameSession] ❌ No session in sessionRef!');
        return null;
      }

      const now = Date.now();
      const duration =
        streamingStats?.durationMs ?? (prev.streamStartedAt ? now - prev.streamStartedAt : 0);

      // Compute updated session synchronously
      const updatedSession: GameSessionState = {
        ...prev,
        status: 'validating',
        streamEndedAt: now,
        durationMs: duration,
        finalTranscription,
        // Add streaming cost estimation if stats provided
        ...(streamingStats && {
          costTracking: {
            ...prev.costTracking,
            live_stream_0: {
              model: 'gemini-2.0-flash-exp',
              sessionDurationMs: duration,
              estimatedInputTokens: streamingStats.frameCount * 258, // ~258 tokens per frame
              estimatedOutputTokens: streamingStats.transcriptionLength,
              estimatedCost:
                (streamingStats.frameCount * 258 * 0.1) / 1_000_000 +
                (streamingStats.transcriptionLength * 0.4) / 1_000_000,
              frameCount: streamingStats.frameCount,
              transcriptionCount: 1,
            },
          },
        }),
      };

      console.log('[useGameSession] ✅ Session computed:', {
        sessionId: updatedSession.sessionId,
        finalTranscription: updatedSession.finalTranscription,
        durationMs: updatedSession.durationMs,
        status: updatedSession.status,
      });

      // Update ref immediately (synchronous)
      sessionRef.current = updatedSession;

      // Also update React state (may be batched, but that's OK for UI)
      setSession(updatedSession);

      console.log('[useGameSession] 📤 endStreaming returning session:', updatedSession.sessionId);

      return updatedSession;
    },
    []
  );

  /**
   * Submit session for validation.
   * Accepts optional session override to avoid race conditions.
   */
  const submitForValidation = useCallback(
    async (sessionOverride?: GameSessionState | null): Promise<ValidationResponse> => {
      // Use override, ref, or state (in that order of preference)
      const sessionToSubmit = sessionOverride ?? sessionRef.current ?? session;

      if (!sessionToSubmit) throw new Error('No active session');

      console.log('[useGameSession] Submitting session:', {
        sessionId: sessionToSubmit.sessionId,
        finalTranscription: sessionToSubmit.finalTranscription,
        durationMs: sessionToSubmit.durationMs,
      });

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/game/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: sessionToSubmit }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Validation failed');
        }

        const result: ValidationResponse = await res.json();
        setValidationResult(result);

        // Update session with results
        updateSession((prev) =>
          prev
            ? {
                ...prev,
                status: result.success ? 'complete' : 'error',
                score: result.score,
                validationResult: result.validation,
                scoringResult: result.scoring,
                feedbackResult: result.feedback,
                error: result.error || null,
              }
            : null
        );

        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        updateSession((prev) => (prev ? { ...prev, status: 'error', error: msg } : null));
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [session, updateSession]
  );

  /**
   * Reset the game state for a new round.
   */
  const resetGame = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    setCurrentWord(null);
    setCurrentLine(null);
    setValidationResult(null);
    setError(null);
  }, []);

  return {
    // State
    session,
    currentWord,
    currentLine,
    validationResult,
    isLoading,
    error,

    // Actions
    fetchConfig,
    startGame,
    updateStatus,
    startStreaming,
    addTranscription,
    endStreaming,
    submitForValidation,
    resetGame,
  };
}
