'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useProgress } from '@/app/hooks/useProgress';
import { getWordsByLine } from '@/lib/data/vocabulary';
import { getMRTLineById } from '@/lib/data/mrt-lines';
import type { VocabularyWord } from '@/lib/data/vocabulary';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const lineId = params.lineId as string;
  
  const { progress, isLoaded } = useProgress();
  const [words, setWords] = useState<VocabularyWord[]>([]);

  const line = getMRTLineById(lineId);

  useEffect(() => {
    if (lineId) {
      setWords(getWordsByLine(lineId));
    }
  }, [lineId]);

  if (!line) {
    notFound();
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-gray-200 rounded-full mb-4" style={{ borderTopColor: line.color }} />
        <p className="text-gray-600">Loading results...</p>
      </div>
    );
  }

  // Calculate statistics
  const completedCount = words.filter((w) => {
    const p = progress[w.id];
    return p && p.bestScore >= 70;
  }).length;

  const totalCount = words.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get average score
  const scores = words
    .map((w) => progress[w.id]?.bestScore)
    .filter((s): s is number => s !== undefined);
  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--hot-cream)]">
      {/* Logo */}
      <div className="absolute top-0 left-0 z-20">
        <Image
          src="/hands-on-track.png"
          alt="HANDS ON TRACK Logo"
          width={500}
          height={500}
          className="h-auto w-auto max-w-[600px] md:max-w-[600px]"
          priority
        />
      </div>

      <div className="container mx-auto px-4 py-8 flex flex-col items-center min-h-screen relative z-10">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Results</h1>
            <h2 className="text-2xl font-semibold mb-4" style={{ color: line.color }}>
              {line.name}
            </h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: line.color }}>
                {completedCount}/{totalCount}
              </div>
              <div className="text-gray-600">Stations Completed</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: line.color }}>
                {completionPercentage}%
              </div>
              <div className="text-gray-600">Completion Rate</div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: line.color }}>
                {averageScore}
              </div>
              <div className="text-gray-600">Average Score</div>
            </div>
          </div>

          {/* Station List */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Station Progress</h3>
            <div className="space-y-3">
              {words.map((word) => {
                const wordProgress = progress[word.id];
                const isCompleted = wordProgress && wordProgress.bestScore >= 70;
                const bestScore = wordProgress?.bestScore ?? null;

                return (
                  <div
                    key={word.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                      isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-lg text-gray-800">{word.word}</div>
                      <div className="text-sm text-gray-600">{word.meaning}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      {bestScore !== null ? (
                        <>
                          <div className="text-right">
                            <div className="font-bold text-lg" style={{ color: line.color }}>
                              {bestScore}
                            </div>
                            <div className="text-xs text-gray-500">Best Score</div>
                          </div>
                          {isCompleted && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400 text-sm">Not attempted</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push(`/${lineId}/${words[0]?.id}`)}
              className="px-8 py-3 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              style={{ backgroundColor: line.color }}
            >
              Practice Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 rounded-full font-bold text-gray-700 bg-white border-2 border-gray-300 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
