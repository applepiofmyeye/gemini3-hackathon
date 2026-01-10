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
      id: 'ns-bishan',
      word: 'Bishan',
      level: 1,
      meaning: 'Bishan',
    },
    {
      id: 'ns-Yishun',
      word: 'Yishun',
      level: 1,
      meaning: 'Yishun',
      culturalNote: "Singapore's train system",
    },
    {
      id: 'ns-Kranji',
      word: 'Kranji',
      level: 1,
      meaning: 'Kranji',
    },
    {
      id: 'ns-Merlion',
      word: 'Merlion',
      level: 1,
      meaning: 'Raffles Place',
    },
    {
      id: 'ns-Jurong-East',
      word: 'Jurong East',
      level: 1,
      meaning: 'Jurong East',
    }
  ],
  'east-west': [
    {
      id: 'ew-city-hall',
      word: 'City Hall',
      level: 1,
      meaning: 'City Hall',
    },
    {
      id: 'ew-changi-airport',
      word: 'Control Tower',
      level: 2,
      meaning: 'An iconic landmark at Changi Airport!',
    },
    {
      id: 'ew-pasir-ris',
      word: 'Pasir Ris',
      level: 1,
      meaning: 'Pasir Ris',
    },
    {
      id: 'ew-boon-lay',
      word: 'Boon Lay',
      level: 1,
      meaning: 'Boon Lay',
    },
    {
      id: 'ew-redhill',
      word: 'Redhill',
      level: 1,
      meaning: 'Redhill',
    }
  ],
  'north-east': [
    {
      id: 'ne-kovan',
      word: 'Kovan',
      level: 2,
      meaning: 'Kovan',
    },
    {
      id: 'ne-hougang',
      word: 'Hougang',
      level: 2,
      meaning: 'Hougang',
    },
    {
      id: 'ne-woodleigh',
      word: 'Woodleigh',
      level: 1,
      meaning: 'Woodleigh',
    },
    {
      id: 'ne-punggol',
      word: 'Punggol',
      level: 1,
      meaning: 'Punggol',
    },
    {
      id: 'ne-harbourfront',
      word: 'Harbourfront',
      level: 1,
      meaning: 'Harbourfront',
    }
  ],
  circle: [
    {
      id: 'cl-stadium',
      word: 'Stadium',
      level: 1,
      meaning: 'Stadium',
    },
    {
      id: 'cl-tai-seng',
      word: 'Tai Seng',
      level: 2,
      meaning: 'Tai Seng',
    },
    {
      id: 'cl-caldecott',
      word: 'Caldecott',
      level: 2,
      meaning: 'Caldecott',
    },
    {
      id: 'cl-bartley',
      word: 'Bartley',
      level: 2,
      meaning: 'Bartley',
    },
    {
      id: 'cl-bayfront',
      word: 'MBS',
      level: 1,
      meaning: 'To represent our Bayfront Station!',
    }
  ],
  downtown: [
    {
      id: 'dt-ubi',
      word: 'Ubi',
      level: 1,
      meaning: 'Ubi',
    },
    {
      id: 'dt-bugis',
      word: 'Bugis',
      level: 1,
      meaning: 'Bugis',
    },
    {
      id: 'dt-rochor',
      word: 'Rochor',
      level: 1,
      meaning: 'Rochor',
    },
    {
      id: 'dt-newton',
      word: 'Newton',
      level: 1,
      meaning: 'Newton',
    },
    {
      id: 'dt-esplanade',
      word: 'Durian',
      level: 2,
      meaning: 'To represent our Esplanade Mall!',
    },
  ],
  'thomson-east-coast-line': [
    {
      id: 'tecl-gardens-by-the-bay',
      word: 'Gardens by the Bay',
      level: 1,
      meaning: 'Gardens by the Bay',
    },
    {
      id: 'tecl-lentor',
      word: 'Lentor',
      level: 1,
      meaning: 'Lentor',
    },
    {
      id: 'tecl-maxwell',
      word: 'Maxwell',
      level: 1,
      meaning: 'Maxwell',
    },
    {
      id: 'tecl-napier',
      word: 'Napier',
      level: 1,
      meaning: 'Napier',
    },
    {
      id: 'tecl-bright-hill',
      word: 'Bright Hill',
      level: 1,
      meaning: 'Bright Hill',
    }
  ]
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
