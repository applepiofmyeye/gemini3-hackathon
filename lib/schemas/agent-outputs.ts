import { z } from 'zod';

// ============================================================
// VALIDATION AGENT OUTPUT
// ============================================================

export const ValidationOutputSchema = z.object({
  isValid: z.boolean(),
  matchPercentage: z.number().min(0).max(100),
  letterByLetterMatch: z
    .array(
      z.object({
        expected: z.string(),
        detected: z.string().nullable(),
        matched: z.boolean(),
      })
    )
    .optional(),
  reasoning: z.string(),
});
export type ValidationOutput = z.infer<typeof ValidationOutputSchema>;

// ============================================================
// SCORING AGENT OUTPUT
// ============================================================

export const ScoringOutputSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    accuracy: z.number().min(0).max(100),
    speed: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
  }),
  reasoning: z.string(),
});
export type ScoringOutput = z.infer<typeof ScoringOutputSchema>;

// ============================================================
// FEEDBACK AGENT OUTPUT
// ============================================================

export const FeedbackOutputSchema = z.object({
  feedback: z.string(),
  suggestions: z.array(z.string()),
  encouragement: z.string(),
  nextChallenge: z.string().optional(),
});
export type FeedbackOutput = z.infer<typeof FeedbackOutputSchema>;

// ============================================================
// COMBINED GAME RESULT
// ============================================================

export const GameResultSchema = z.object({
  sessionId: z.string(),
  word: z.string(),
  level: z.number(),

  // Final outcome
  success: z.boolean(),
  score: z.number(),

  // Individual results
  validation: ValidationOutputSchema.optional(),
  scoring: ScoringOutputSchema.optional(),
  feedback: FeedbackOutputSchema.optional(),

  // Metrics
  durationMs: z.number(),
  totalCost: z.number(),
});
export type GameResult = z.infer<typeof GameResultSchema>;
