/**
 * String similarity utilities for early match percentage estimation.
 * Used to determine announcement scenario before full validation completes.
 */

/**
 * Calculate Levenshtein distance between two strings.
 * Returns the minimum number of single-character edits needed
 * to transform one string into another.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity percentage between two strings.
 * Returns a value between 0 and 100.
 *
 * @param target - The expected/target string
 * @param actual - The actual/recognized string
 * @returns Percentage similarity (0-100)
 */
export function calculateSimilarity(target: string, actual: string): number {
  // Normalize both strings: uppercase and remove spaces
  const normalizedTarget = target.toUpperCase().replace(/\s+/g, '');
  const normalizedActual = actual.toUpperCase().replace(/\s+/g, '');

  // Handle edge cases
  if (normalizedTarget === normalizedActual) return 100;
  if (normalizedTarget.length === 0 || normalizedActual.length === 0) return 0;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedTarget, normalizedActual);
  const maxLength = Math.max(normalizedTarget.length, normalizedActual.length);

  // Convert distance to similarity percentage
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.round(Math.max(0, Math.min(100, similarity)));
}

/**
 * Estimate match percentage for announcement scenario determination.
 * This is a quick estimation used to start TTS generation in parallel
 * with the full validation pipeline.
 *
 * @param expectedWord - The target word the user should sign
 * @param transcription - The recognized transcription from the user's sign
 * @returns Estimated match percentage (0-100)
 */
export function estimateMatchPercentage(expectedWord: string, transcription: string): number {
  return calculateSimilarity(expectedWord, transcription);
}

/**
 * Determine the arrival scenario based on match percentage.
 *
 * @param matchPercentage - The match percentage (0-100)
 * @returns The scenario type
 */
export function getScenarioFromMatch(matchPercentage: number): 'crash' | 'delayed' | 'safe' {
  if (matchPercentage >= 70) return 'safe';
  if (matchPercentage >= 40) return 'delayed';
  return 'crash';
}
