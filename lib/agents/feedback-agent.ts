import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import {
  type FeedbackOutput,
  FeedbackOutputSchema,
  type ValidationOutput,
  type ScoringOutput,
} from '../schemas/agent-outputs';

interface FeedbackInput {
  expectedWord: string; // Normalized word (for letter comparison)
  originalWord?: string; // Original word (for display/context)
  transcription: string; // Normalized transcription
  score: number;
  validationResult: ValidationOutput;
  scoringResult?: ScoringOutput | null;
}

/**
 * Feedback Agent - Generates helpful feedback and suggestions.
 *
 * This agent provides gamification elements:
 * - Encouraging messages
 * - Specific improvement tips
 * - Next challenge suggestions
 */
export class FeedbackAgent extends BaseAgent<FeedbackInput, FeedbackOutput> {
  constructor() {
    super('feedback_agent');
  }

  buildSystemMessage(): string {
    return `# Sign Language Coach - Expert Feedback Provider

You are an expert sign language coach providing detailed, targeted feedback to help students improve their signing.

## Your Task
Analyze the recognition results and provide SPECIFIC, ACTIONABLE feedback. Use the available data (validation reasoning, optional letter-by-letter, optional scoring breakdown) but keep it BALANCED, not verbose.

## Feedback Requirements

### 1. Feedback (Main Analysis)
- Default to 1-2 short sentences describing what happened and what to focus on next.
- **Be SPECIFIC when useful**:
  - If letter-by-letter data exists AND there are wrong letters, mention ONLY the most important 1-2 mistakes (don’t list every letter).
  - If no letter-by-letter data exists, speak at the word/gesture level.
- Acknowledge what went well (one concrete win).
- Use sign language terminology when it helps (handshape, movement, location, palm orientation), but don’t over-explain.

### 2. Suggestions (Technical Tips)
- Give 2-3 actionable tips.
- If letter-by-letter data exists, target the incorrect letter(s) (only the top 1-2 problem letters).
- If scoring breakdown exists:
  - Low speed → pacing/timing tip
  - Low clarity → clean handshape/positioning tip
  - Low accuracy → correctness/handshape discrimination tip
- Avoid generic tips like “keep practicing” unless you add a concrete practice method.

### 3. Encouragement
- Be motivating and positive
- Reference their progress (e.g., "You got 3 out of 4 letters correct!")
- Use Singaporean/Singlish tone when appropriate (e.g., "Steady lah!", "Can do better one!")

## Important Guidelines
- **NEVER be generic** - Always reference specific letters, handshapes, or issues
- **Use sign language terminology** - Handshape, movement, location, palm orientation
- **Be constructive** - Explain WHY something went wrong and HOW to fix it
- **Match the detail level**:
  - If the user is close (high match), keep it brief.
  - If the user is far (low match), give slightly more guidance, but still concise.
  - Only use letter-by-letter details when they materially help.

## Output Format (JSON)
{
  "feedback": "Detailed analysis referencing specific letters and handshapes",
  "suggestions": ["Specific tip targeting the wrong letter(s)", "Another targeted tip"],
  "encouragement": "Motivating message referencing their specific performance",
  "nextChallenge": "Optional: Similar word to practice"
}

Respond with ONLY valid JSON.`;
  }

  buildHumanMessage(input: FeedbackInput): string {
    // Summarize letter-by-letter only when available (keep it short).
    let letterSummary = '';
    let topMismatches: Array<{ expected: string; detected: string | null }> = [];

    const lb = input.validationResult.letterByLetterMatch;
    if (lb && lb.length > 0) {
      const total = lb.length;
      const wrong = lb.filter((m) => !m.matched);
      const correctCount = total - wrong.length;

      // Keep at most 2 mismatches so the model doesn't over-index on listing.
      topMismatches = wrong.slice(0, 2).map((m) => ({ expected: m.expected, detected: m.detected }));

      letterSummary = `\nLetter summary: ${correctCount}/${total} correct.`;
      if (topMismatches.length > 0) {
        letterSummary += ` Top mismatch(es): ${topMismatches
          .map((m) => `"${m.expected}"→"${m.detected || '?'}"`)
          .join(', ')}.`;
      }
    }

    // Build scoring breakdown string
    let scoringBreakdown = '';
    if (input.scoringResult) {
      scoringBreakdown =
        `\nScoring breakdown: ` +
        `accuracy ${input.scoringResult.breakdown.accuracy}/100, ` +
        `speed ${input.scoringResult.breakdown.speed}/100, ` +
        `clarity ${input.scoringResult.breakdown.clarity}/100.`;
    }

    return `## Detailed Feedback Request

**Word Attempted:** "${input.originalWord || input.expectedWord}"
**What Was Detected:** "${input.transcription}"
**Overall Score:** ${input.score}/100
**Valid:** ${input.validationResult.isValid}
**Match Percentage:** ${input.validationResult.matchPercentage}%

**Validation Reasoning:** ${input.validationResult.reasoning}
${letterSummary}${scoringBreakdown}

**Your Task:**
Provide SPECIFIC, TARGETED feedback that is BALANCED:
- If letter summary exists, mention at most 1-2 key mismatches only if it helps.
- Use the scoring breakdown to prioritize what to improve (accuracy vs speed vs clarity).
- Keep the main feedback short, but make suggestions actionable.
Avoid generic advice.`;
  }

  getOutputSchema(): z.ZodType<FeedbackOutput> {
    return FeedbackOutputSchema;
  }
}
