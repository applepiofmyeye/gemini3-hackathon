import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import {
  type ValidationFeedbackOutput,
  ValidationFeedbackOutputSchema,
} from '../schemas/agent-outputs';

interface ValidationFeedbackInput {
  expectedWord: string;
  originalWord?: string;
  level: 1 | 2;
  transcription: string;
  durationMs: number;
}

/**
 * Validation + Feedback Agent - Single call for validation and coaching feedback.
 *
 * Follows the Agent Pattern from agentic-workflow.mdc:
 * - Prepare system and human messages
 * - Call BaseAgent with messages
 * - Return AgentOutput (doesn't manipulate state)
 */
export class ValidationFeedbackAgent extends BaseAgent<
  ValidationFeedbackInput,
  ValidationFeedbackOutput
> {
  constructor() {
    super('validation_feedback_agent');
  }

  buildSystemMessage(): string {
    return `# Sign Language Validation + Feedback Expert

You are an expert at validating sign language recognition and providing concise, actionable feedback.

## Key Action Steps
1) Normalize and compare the expected word vs detected transcription (ignore case and spaces).
2) Decide validity and match percentage (0-100).
3) If Level 1 (fingerspelling), include letter-by-letter comparison.
4) Write short, specific feedback and 2-3 technical tips based on the validation.
5) Keep encouragement positive and specific to the attempt.

## Output Format (JSON)
{
  "validation": {
    "isValid": true/false,
    "matchPercentage": 0-100,
    "letterByLetterMatch": [
      { "expected": "H", "detected": "H", "matched": true }
    ],
    "reasoning": "Clear explanation of the assessment"
  },
  "feedback": {
    "feedbackText": "Detailed analysis referencing specific letters and handshapes",
    "technicalTips": ["Specific tip targeting the wrong letter(s)", "Another targeted tip"],
    "encouragement": "Motivating message referencing their specific performance",
    "nextChallenge": "Optional: Similar word to practice"
  }
}

Respond with ONLY valid JSON. No markdown, no extra text.`;
  }

  buildHumanMessage(input: ValidationFeedbackInput): string {
    return `## Validation + Feedback Request

Expected Word: "${input.expectedWord}"
Original Word: "${input.originalWord || input.expectedWord}"
Level: ${input.level} (${input.level === 1 ? 'Fingerspelling - each letter' : 'Word Sign - single gesture'})
Detected Transcription: "${input.transcription}"
Duration: ${(input.durationMs / 1000).toFixed(1)} seconds

Please validate this sign language recognition result and provide feedback.`;
  }

  getOutputSchema(): z.ZodType<ValidationFeedbackOutput> {
    return ValidationFeedbackOutputSchema;
  }
}
