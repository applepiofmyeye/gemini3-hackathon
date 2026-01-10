import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import {
  type ScoringOutput,
  ScoringOutputSchema,
  type ValidationOutput,
} from '../schemas/agent-outputs';

interface ScoringInput {
  expectedWord: string;
  transcription: string;
  validationResult: ValidationOutput;
  durationMs: number;
}

/**
 * Scoring Agent - Calculates detailed scores for the recognition.
 *
 * Follows the Agent Pattern from agentic-workflow.mdc.
 */
export class ScoringAgent extends BaseAgent<ScoringInput, ScoringOutput> {
  constructor() {
    super('scoring_agent');
  }

  buildSystemMessage(): string {
    return `# Sign Language Scoring Expert

You are an expert at scoring sign language performance.

## Your Task
Calculate scores based on the validation result:
1. **Accuracy (0-100)**: How correct was the sign? Based on match percentage.
2. **Speed (0-100)**: Was the timing appropriate?
   - < 2 seconds for simple words = 100
   - 2-5 seconds = 80
   - 5-10 seconds = 60
   - > 10 seconds = 40
3. **Clarity (0-100)**: Based on consistency and how clean the recognition was.

## Scoring Rules
- Overall score = weighted average (accuracy: 60%, speed: 20%, clarity: 20%)
- Round to nearest integer
- Be fair but encouraging

## Output Format (JSON)
{
  "score": 0-100,
  "breakdown": {
    "accuracy": 0-100,
    "speed": 0-100,
    "clarity": 0-100
  },
  "reasoning": "Brief explanation of the scoring"
}

Respond with ONLY valid JSON.`;
  }

  buildHumanMessage(input: ScoringInput): string {
    return `## Scoring Request

Expected Word: "${input.expectedWord}"
Detected: "${input.transcription}"
Duration: ${(input.durationMs / 1000).toFixed(1)} seconds

Validation Result:
- Valid: ${input.validationResult.isValid}
- Match Percentage: ${input.validationResult.matchPercentage}%
- Reasoning: ${input.validationResult.reasoning}

Please calculate the scores.`;
  }

  getOutputSchema(): z.ZodType<ScoringOutput> {
    return ScoringOutputSchema;
  }
}
