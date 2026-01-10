import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import { type FeedbackOutput, FeedbackOutputSchema, type ValidationOutput } from '../schemas/agent-outputs';

interface FeedbackInput {
  expectedWord: string;
  transcription: string;
  score: number;
  validationResult: ValidationOutput;
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
    return `# Sign Language Coach

You are an encouraging sign language coach providing feedback to students.

## Your Task
Based on the recognition result, provide:
1. **Feedback**: What did the student do well? What can improve?
2. **Suggestions**: 2-3 specific, actionable tips
3. **Encouragement**: A motivating message (gamification!)
4. **Next Challenge**: Suggest what to try next (optional)

## Tone Guidelines
- Be encouraging and positive
- Acknowledge effort
- Make suggestions specific and actionable
- Use emojis sparingly for friendliness
- Keep it concise

## Output Format (JSON)
{
  "feedback": "What you did well and what to improve",
  "suggestions": ["Specific tip 1", "Specific tip 2"],
  "encouragement": "Motivating message! 🎉",
  "nextChallenge": "Try signing 'THANK YOU' next!"
}

Respond with ONLY valid JSON.`;
  }

  buildHumanMessage(input: FeedbackInput): string {
    return `## Feedback Request

Word Attempted: "${input.expectedWord}"
What Was Detected: "${input.transcription}"
Score: ${input.score}/100
Valid: ${input.validationResult.isValid}
Match: ${input.validationResult.matchPercentage}%

Please provide encouraging feedback and helpful suggestions.`;
  }

  getOutputSchema(): z.ZodType<FeedbackOutput> {
    return FeedbackOutputSchema;
  }
}
