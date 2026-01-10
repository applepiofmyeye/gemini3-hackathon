'use client';

import { useState } from 'react';
import type { MRTLine } from '@/lib/data/mrt-lines';
import type { VocabularyWord } from '@/lib/data/vocabulary';

// ============================================================
// TYPES
// ============================================================

interface MRTMapProps {
  lines: MRTLine[];
  vocabulary: Record<string, VocabularyWord[]>;
  completedWords: Set<string>;
  onSelectWord: (lineId: string, wordId: string) => void;
}

// ============================================================
// COMPONENT
// ============================================================

export default function MRTMap({ lines, vocabulary, completedWords, onSelectWord }: MRTMapProps) {
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const toggleLine = (lineId: string) => {
    setExpandedLine((prev) => (prev === lineId ? null : lineId));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Line</h2>
        <p className="text-gray-600">Select an MRT line and pick a word to practice signing</p>
      </div>

      {/* MRT Lines */}
      <div className="space-y-4">
        {lines.map((line) => {
          const words = vocabulary[line.id] || [];
          const isExpanded = expandedLine === line.id;
          const completedInLine = words.filter((w) => completedWords.has(w.id)).length;

          return (
            <div
              key={line.id}
              className="rounded-2xl overflow-hidden shadow-lg transition-all duration-300"
              style={{
                boxShadow: isExpanded ? `0 8px 30px ${line.color}40` : undefined,
              }}
            >
              {/* Line Header */}
              <button
                onClick={() => toggleLine(line.id)}
                className="w-full flex items-center gap-4 p-4 text-left transition-all hover:brightness-105"
                style={{ backgroundColor: line.color }}
              >
                {/* Line Icon */}
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {line.id.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Line Info */}
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{line.name}</h3>
                  <p className="text-white/80 text-sm">{line.description}</p>
                </div>

                {/* Progress */}
                <div className="text-right">
                  <div className="text-white font-bold">
                    {completedInLine}/{words.length}
                  </div>
                  <div className="text-white/70 text-xs">completed</div>
                </div>

                {/* Expand Arrow */}
                <div
                  className="text-white transition-transform duration-300"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Words List */}
              {isExpanded && (
                <div className="bg-white p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {words.map((word) => {
                      const isCompleted = completedWords.has(word.id);
                      return (
                        <button
                          key={word.id}
                          onClick={() => onSelectWord(line.id, word.id)}
                          className="relative p-4 rounded-xl border-2 text-left transition-all hover:scale-105 active:scale-95"
                          style={{
                            borderColor: isCompleted ? line.color : '#e5e7eb',
                            backgroundColor: isCompleted ? `${line.color}10` : 'white',
                          }}
                        >
                          {/* Completed Check */}
                          {isCompleted && (
                            <div
                              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: line.color }}
                            >
                              <svg
                                className="w-3 h-3 text-white"
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

                          {/* Word */}
                          <div className="font-bold text-lg mb-1" style={{ color: line.color }}>
                            {word.word}
                          </div>

                          {/* Level Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: word.level === 1 ? '#e0f2fe' : '#fef3c7',
                                color: word.level === 1 ? '#0369a1' : '#b45309',
                              }}
                            >
                              {word.level === 1 ? 'Fingerspell' : 'Sign'}
                            </span>
                          </div>

                          {/* Meaning */}
                          <div className="text-gray-500 text-xs mt-2">{word.meaning}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Cultural Notes */}
                  {words.some((w) => w.culturalNote) && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="text-amber-800 text-sm font-medium mb-1">
                        🇸🇬 Singapore Spotlight
                      </div>
                      {words
                        .filter((w) => w.culturalNote)
                        .map((w) => (
                          <p key={w.id} className="text-amber-700 text-sm">
                            <strong>{w.word}:</strong> {w.culturalNote}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
          <span className="text-gray-600">Total Progress:</span>
          <span className="font-bold text-gray-800">
            {completedWords.size} / {Object.values(vocabulary).flat().length} words
          </span>
        </div>
      </div>
    </div>
  );
}
