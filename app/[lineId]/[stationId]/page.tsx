'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { notFound, useParams } from 'next/navigation';
import MRTMap from '@/app/components/MRTMap';
import SignPractice from '@/app/components/SignPractice';
import PlatformArrivalScreen from '@/app/components/PlatformArrivalScreen';
import type { AnnounceData } from '@/app/components/PlatformArrivalScreen';
import ValidationLoadingScreen from '@/app/components/ValidationLoadingScreen';
import { useGameSession } from '@/app/hooks/useGameSession';
import { useProgress } from '@/app/hooks/useProgress';
import { useStationNavigation } from '@/app/hooks/useStationNavigation';
import { getWordById } from '@/lib/data/vocabulary';
import { getMRTLineById } from '@/lib/data/mrt-lines';
import { MRT_LINES } from '@/lib/data/mrt-lines';
import { VOCABULARY } from '@/lib/data/vocabulary';
import { estimateMatchPercentage } from '@/lib/utils/string-similarity';
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
  const { goToNext, goToHome, goToStation } = useStationNavigation();

  const [announcementData, setAnnouncementData] = useState<AnnounceData | null>(null);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const announcementPromiseRef = useRef<Promise<AnnounceData | null> | null>(null);

  const line = getMRTLineById(lineId);
  const word = getWordById(lineId, stationId);

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
  }, [lineId, stationId, isConfigLoading, line, word, startGame]);

  useEffect(() => {
    if (!validationResult) {
      setAnnouncementData(null);
      setAnnouncementLoading(false);
      announcementPromiseRef.current = null;
    }
  }, [validationResult]);

  const completedWords = new Set(
    Object.entries(progress)
      .filter(([, p]) => p.bestScore >= 70)
      .map(([id]) => id)
  );

  const fetchAnnouncement = useCallback(
    async (
      target: string,
      transcription: string,
      estimatedMatch: number
    ): Promise<AnnounceData | null> => {
      try {
        const response = await fetch('/api/game/announce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, transcription, matchPercentage: estimatedMatch }),
        });
        const data = await response.json();
        return data.success ? (data as AnnounceData) : null;
      } catch (err) {
        console.error('[PracticePage] Failed to fetch announcement:', err);
        return null;
      }
    },
    []
  );

  const handlePracticeComplete = useCallback(
    async (finalTranscription: string, durationMs: number, frameCount?: number) => {
      const updatedSession = endStreaming(finalTranscription, {
        frameCount: frameCount ?? 0,
        transcriptionLength: finalTranscription.length,
        durationMs,
      });
      if (!updatedSession || !currentWord) return;

      const estimatedMatch = estimateMatchPercentage(currentWord.word, finalTranscription);
      setAnnouncementLoading(true);

      const announcementPromise = fetchAnnouncement(
        currentWord.word,
        finalTranscription,
        estimatedMatch
      );
      announcementPromiseRef.current = announcementPromise;

      try {
        const [validationResultData, announcementResultData] = await Promise.all([
          submitForValidation(updatedSession),
          announcementPromise,
        ]);
        if (validationResultData.score !== null) {
          recordAttempt(currentWord.id, validationResultData.score);
        }
        if (announcementResultData) {
          setAnnouncementData(announcementResultData);
        }
      } catch (e) {
        console.error('[PracticePage] Validation/Announcement failed:', e);
      } finally {
        setAnnouncementLoading(false);
      }
    },
    [endStreaming, submitForValidation, recordAttempt, currentWord, fetchAnnouncement]
  );

  const handlePracticeCancel = useCallback(() => {
    resetGame();
    goToHome();
  }, [resetGame, goToHome]);

  const handleTryAgain = useCallback(async () => {
    if (line && word) {
      resetGame();
      await startGame(lineId, stationId);
    }
  }, [lineId, stationId, line, word, startGame, resetGame]);

  const handleNextWord = useCallback(() => {
    resetGame();
    goToNext(lineId, stationId);
  }, [resetGame, goToNext, lineId, stationId]);

  const handleGoHome = useCallback(() => {
    resetGame();
    goToHome();
  }, [resetGame, goToHome]);

  const handleSelectWord = useCallback(
    (selectedLineId: string, selectedWordId: string) => {
      goToStation(selectedLineId, selectedWordId);
    },
    [goToStation]
  );

  if (!line || !word) {
    notFound();
  }

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

  if ((isValidating || session?.status === 'validating') && currentLine) {
    return <ValidationLoadingScreen lineColor={currentLine.color} />;
  }

  if (validationResult !== null && currentWord && currentLine) {
    return (
      <PlatformArrivalScreen
        score={validationResult.score ?? null}
        expectedWord={currentWord.word}
        transcription={session?.finalTranscription ?? null}
        feedback={validationResult.feedback ?? null}
        lineColor={currentLine.color}
        lineAbbreviation={line.abbreviation}
        announcementData={announcementData}
        announcementLoading={announcementLoading}
        error={sessionError}
        onTryAgain={handleTryAgain}
        onNextWord={handleNextWord}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-(--hot-cream)">
      <div className="container mx-auto px-4 py-8 flex flex-col min-h-screen relative z-10">
        <div className="flex flex-col lg:flex-row gap-6 w-full">
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
