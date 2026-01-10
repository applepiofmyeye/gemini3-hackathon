import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import { type ValidationOutput, ValidationOutputSchema } from '../schemas/agent-outputs';

interface ValidationInput {
  expectedWord: string;
  level: 1 | 2;
  transcription: string;
  durationMs: number;
}

/**
 * Validation Agent - Compares transcription against expected word.
 *
 * Follows the Agent Pattern from agentic-workflow.mdc:
 * - Prepare system and human messages
 * - Call BaseAgent with messages
 * - Return AgentOutput (doesn't manipulate state)
 */
export class ValidationAgent extends BaseAgent<ValidationInput, ValidationOutput> {
  constructor() {
    super('validation_agent');
  }

  buildSystemMessage(): string {
    return `# Sign Language Validation Expert

You are an expert at validating sign language recognition results.

## Your Task
Compare the detected transcription against the expected word and determine:
1. Whether the sign was correctly recognized
2. The match percentage (0-100)
3. For fingerspelling (Level 1): Letter-by-letter comparison

## Instructions
- Be fair but accurate in your assessment
- Consider partial matches (some letters correct)
- For Level 1, check each letter individually
- Ignore case and extra spaces
- Provide clear reasoning for your assessment

## Output Format (JSON)
{
  "isValid": true/false,
  "matchPercentage": 0-100,
  "letterByLetterMatch": [
    { "expected": "H", "detected": "H", "matched": true },
    { "expected": "E", "detected": "E", "matched": true }
  ],
  "reasoning": "Clear explanation of the assessment"
}

Respond with ONLY valid JSON. No markdown, no explanations outside JSON.`;
  }

  buildHumanMessage(input: ValidationInput): string {
    return `## Validation Request

Expected Word: "${input.expectedWord}"
Level: ${input.level} (${input.level === 1 ? 'Fingerspelling - each letter' : 'Word Sign - single gesture'})
Detected Transcription: "${input.transcription}"
Duration: ${(input.durationMs / 1000).toFixed(1)} seconds

Please validate this sign language recognition result.`;
  }

  getOutputSchema(): z.ZodType<ValidationOutput> {
    return ValidationOutputSchema;
  }
}
