'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================

export interface WordProgress {
  bestScore: number;
  attempts: number;
  lastPlayed: string; // ISO date string
}

export interface ProgressData {
  [wordId: string]: WordProgress;
}

const STORAGE_KEY = 'hands-on-track-progress';

// ============================================================
// HOOK
// ============================================================

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      try {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setProgress(JSON.parse(stored));
        }
      } catch (e) {
        console.error('[useProgress] Failed to load progress:', e);
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Save to localStorage whenever progress changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (e) {
        console.error('[useProgress] Failed to save progress:', e);
      }
    }
  }, [progress, isLoaded]);

  /**
   * Record a completed attempt for a word.
   */
  const recordAttempt = useCallback((wordId: string, score: number) => {
    setProgress((prev) => {
      const existing = prev[wordId];
      return {
        ...prev,
        [wordId]: {
          bestScore: existing ? Math.max(existing.bestScore, score) : score,
          attempts: existing ? existing.attempts + 1 : 1,
          lastPlayed: new Date().toISOString(),
        },
      };
    });
  }, []);

  /**
   * Get progress for a specific word.
   */
  const getWordProgress = useCallback(
    (wordId: string): WordProgress | null => {
      return progress[wordId] || null;
    },
    [progress]
  );

  /**
   * Check if a word has been completed (score >= 70).
   */
  const isWordCompleted = useCallback(
    (wordId: string): boolean => {
      const p = progress[wordId];
      return p ? p.bestScore >= 70 : false;
    },
    [progress]
  );

  /**
   * Get total completed words count.
   */
  const getCompletedCount = useCallback((): number => {
    return Object.values(progress).filter((p) => p.bestScore >= 70).length;
  }, [progress]);

  /**
   * Reset all progress.
   */
  const resetProgress = useCallback(() => {
    setProgress({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    progress,
    isLoaded,
    recordAttempt,
    getWordProgress,
    isWordCompleted,
    getCompletedCount,
    resetProgress,
  };
}
