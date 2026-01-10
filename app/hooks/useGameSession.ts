'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  GameSessionState,
  TranscriptionEvent,
  SessionStatus,
} from '@/lib/schemas/game-session';
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
  validation: unknown;
  scoring: unknown;
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
  const [currentLine, setCurrentLine] = useState<{ id: string; name: string; color: string } | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to always have latest session for validation
  const sessionRef = useRef<GameSessionState | null>(null);

  // Keep ref in sync with state
  const updateSession = useCallback((updater: (prev: GameSessionState | null) => GameSessionState | null) => {
    setSession((prev) => {
      const next = updater(prev);
      sessionRef.current = next;
      return next;
    });
  }, []);

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
  const startGame = useCallback(async (lineId: string, wordId: string): Promise<StartGameResponse> => {
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
  }, []);

  /**
   * Update session status.
   */
  const updateStatus = useCallback((status: SessionStatus) => {
    updateSession((prev) => (prev ? { ...prev, status } : null));
  }, [updateSession]);

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
  const addTranscription = useCallback((text: string, isFinal = false) => {
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
  }, [updateSession]);

  /**
   * End streaming and record final transcription.
   * Returns the updated session for immediate use.
   */
  const endStreaming = useCallback((
    finalTranscription: string,
    streamingStats?: StreamingStats
  ): GameSessionState | null => {
    const now = Date.now();
    let updatedSession: GameSessionState | null = null;

    updateSession((prev) => {
      if (!prev) return null;
      const duration = streamingStats?.durationMs ?? (prev.streamStartedAt ? now - prev.streamStartedAt : 0);
      
      updatedSession = {
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
              model: 'gemini-2.5-flash',
              sessionDurationMs: duration,
              estimatedInputTokens: streamingStats.frameCount * 258, // ~258 tokens per frame
              estimatedOutputTokens: streamingStats.transcriptionLength,
              estimatedCost: 
                (streamingStats.frameCount * 258 * 0.3 / 1_000_000) + 
                (streamingStats.transcriptionLength * 2.5 / 1_000_000),
              frameCount: streamingStats.frameCount,
              transcriptionCount: 1,
            },
          },
        }),
      };
      return updatedSession;
    });

    return updatedSession;
  }, [updateSession]);

  /**
   * Submit session for validation.
   * Accepts optional session override to avoid race conditions.
   */
  const submitForValidation = useCallback(async (
    sessionOverride?: GameSessionState | null
  ): Promise<ValidationResponse> => {
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
  }, [session, updateSession]);

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
