/**
 * Vocabulary definitions for each MRT line.
 * Singapore-themed with cultural notes.
 */

export interface VocabularyWord {
  id: string;
  word: string;
  level: 1 | 2; // 1 = fingerspelling, 2 = word sign
  meaning: string;
  culturalNote?: string; // Singapore-specific context
}

export type VocabularyByLine = Record<string, VocabularyWord[]>;

export const VOCABULARY: VocabularyByLine = {
  'north-south': [
    {
      id: 'ns-hello',
      word: 'HELLO',
      level: 1,
      meaning: 'Greeting',
    },
    {
      id: 'ns-mrt',
      word: 'MRT',
      level: 1,
      meaning: 'Mass Rapid Transit',
      culturalNote: "Singapore's train system",
    },
    {
      id: 'ns-thanks',
      word: 'THANK YOU',
      level: 2,
      meaning: 'Expression of gratitude',
    },
    {
      id: 'ns-yes',
      word: 'YES',
      level: 1,
      meaning: 'Affirmative',
    },
  ],
  'east-west': [
    {
      id: 'ew-food',
      word: 'FOOD',
      level: 1,
      meaning: 'Sustenance',
    },
    {
      id: 'ew-eat',
      word: 'EAT',
      level: 2,
      meaning: 'To consume food',
      culturalNote: 'Hawker culture is UNESCO heritage!',
    },
    {
      id: 'ew-good',
      word: 'GOOD',
      level: 1,
      meaning: 'Quality indicator',
    },
    {
      id: 'ew-water',
      word: 'WATER',
      level: 1,
      meaning: 'H2O',
    },
  ],
  'north-east': [
    {
      id: 'ne-help',
      word: 'HELP',
      level: 2,
      meaning: 'Assistance',
    },
    {
      id: 'ne-love',
      word: 'LOVE',
      level: 2,
      meaning: 'Affection',
    },
    {
      id: 'ne-name',
      word: 'NAME',
      level: 1,
      meaning: 'Identifier',
    },
  ],
  circle: [
    {
      id: 'cl-nice',
      word: 'NICE',
      level: 1,
      meaning: 'Pleasant',
    },
    {
      id: 'cl-friend',
      word: 'FRIEND',
      level: 2,
      meaning: 'Companion',
    },
    {
      id: 'cl-happy',
      word: 'HAPPY',
      level: 2,
      meaning: 'Joyful',
    },
  ],
  downtown: [
    {
      id: 'dt-sorry',
      word: 'SORRY',
      level: 2,
      meaning: 'Apology',
    },
    {
      id: 'dt-please',
      word: 'PLEASE',
      level: 2,
      meaning: 'Polite request',
    },
    {
      id: 'dt-no',
      word: 'NO',
      level: 1,
      meaning: 'Negative',
    },
  ],
};

/**
 * Get all words for a specific MRT line.
 */
export function getWordsByLine(lineId: string): VocabularyWord[] {
  return VOCABULARY[lineId] ?? [];
}

/**
 * Get a specific word by line and word ID.
 */
export function getWordById(lineId: string, wordId: string): VocabularyWord | undefined {
  const words = VOCABULARY[lineId];
  if (!words) return undefined;
  return words.find((w) => w.id === wordId);
}

/**
 * Get all vocabulary as a flat array.
 */
export function getAllWords(): VocabularyWord[] {
  return Object.values(VOCABULARY).flat();
}
