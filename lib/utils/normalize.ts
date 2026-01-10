/**
 * Shared normalization utilities for practice words.
 * Used by both client (SignPractice) and server (validation agents).
 */

/**
 * Normalize a word for practice/validation: lowercase, only a-z letters.
 * This ensures consistency between the UI tiles, recognition loop, and scoring.
 *
 * Examples:
 * - "Tai Seng" → "taiseng"
 * - "City Hall" → "cityhall"
 * - "Raffles Place" → "rafflesplace"
 */
export function normalizePracticeWord(word: string): string {
  return word
    .toLowerCase()
    .split('')
    .filter((char) => /[a-z]/.test(char))
    .join('');
}
