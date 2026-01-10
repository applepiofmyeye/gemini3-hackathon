import { GeminiRestClient } from '../gemini/rest-client';
import { ValidationAgent } from '../agents/validation-agent';
import { ScoringAgent } from '../agents/scoring-agent';
import { FeedbackAgent } from '../agents/feedback-agent';
import { type GameSessionState } from '../schemas/game-session';
import { type LLMInferenceMetadata, GEMINI_MODELS } from '../schemas/cost-tracking';
import { normalizePracticeWord } from '../utils/normalize';

const LOG_PREFIX = '[VALIDATION_GRAPH]';

/**
 * Validation Graph - Orchestrates validation, scoring, and feedback agents.
 *
 * Following Graph Pattern from agentic-workflow.mdc:
 * - Orchestrate multiple nodes/agents for a specific task
 * - Route between nodes based on state
 * - Track cost and token metrics
 * - Log all state transitions with JSON dumps
 */
export class ValidationGraph {
  private validationAgent: ValidationAgent;
  private scoringAgent: ScoringAgent;
  private feedbackAgent: FeedbackAgent;
  private client: GeminiRestClient;

  constructor(modelName: string = GEMINI_MODELS.GEMINI_3_FLASH) {
    this.validationAgent = new ValidationAgent();
    this.scoringAgent = new ScoringAgent();
    this.feedbackAgent = new FeedbackAgent();
    this.client = new GeminiRestClient(modelName);
  }

  /**
   * Run the validation graph.
   *
   * Flow: Validation → Scoring → Feedback → Complete
   */
  async run(state: GameSessionState): Promise<GameSessionState> {
    console.log(`${LOG_PREFIX} Starting validation graph for session ${state.sessionId} [run]`);
    console.log(
      `${LOG_PREFIX} Word: "${state.expectedWord}", ` +
        `Transcription: "${state.finalTranscription}" [run]`
    );

    if (!state.finalTranscription) {
      state.error = 'No transcription to validate';
      state.status = 'error';
      console.error(`${LOG_PREFIX} Error: ${state.error} [run]`);
      return state;
    }

    // Normalize both expected word and transcription for consistent comparison
    // This strips spaces/punctuation so "Tai Seng" becomes "taiseng"
    const normalizedExpected = normalizePracticeWord(state.expectedWord);
    const normalizedTranscription = normalizePracticeWord(state.finalTranscription);

    console.log(
      `${LOG_PREFIX} Normalized: expected="${normalizedExpected}", ` +
        `transcription="${normalizedTranscription}" [run]`
    );

    let stepCount = 0;

    try {
      // ========== STEP 1: VALIDATION ==========
      stepCount++;
      state.status = 'validating';
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: VALIDATION ===== [run]`);

      const validationResult = await this.validationAgent.run(
        this.client,
        {
          expectedWord: normalizedExpected,
          level: state.level,
          transcription: normalizedTranscription,
          durationMs: state.durationMs,
        },
        'validation_0',
        state.outputDir
      );

      // Update cost tracking
      state.costTracking['validation_0'] = validationResult.metadata;

      if (!validationResult.ok || !validationResult.content) {
        state.error = validationResult.error?.message ?? 'Validation agent failed';
        state.status = 'error';
        this.logStateDump(state, stepCount);
        return state;
      }

      state.validationResult = validationResult.content;
      console.log(
        `${LOG_PREFIX} Validation complete: ` +
          `valid=${validationResult.content.isValid}, ` +
          `match=${validationResult.content.matchPercentage}% [run]`
      );

      // ========== STEP 2: SCORING ==========
      stepCount++;
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: SCORING ===== [run]`);

      const scoringResult = await this.scoringAgent.run(
        this.client,
        {
          expectedWord: normalizedExpected,
          transcription: normalizedTranscription,
          validationResult: validationResult.content,
          durationMs: state.durationMs,
        },
        'scoring_0',
        state.outputDir
      );

      state.costTracking['scoring_0'] = scoringResult.metadata;

      if (scoringResult.ok && scoringResult.content) {
        state.scoringResult = scoringResult.content;
        state.score = scoringResult.content.score;
        console.log(
          `${LOG_PREFIX} Scoring complete: ` + `score=${scoringResult.content.score}/100 [run]`
        );
      } else {
        console.warn(`${LOG_PREFIX} Scoring failed, using match percentage as score [run]`);
        state.score = validationResult.content.matchPercentage;
      }

      // ========== STEP 3: FEEDBACK ==========
      stepCount++;
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: FEEDBACK ===== [run]`);

      const feedbackResult = await this.feedbackAgent.run(
        this.client,
        {
          expectedWord: normalizedExpected,
          originalWord: state.expectedWord,
          transcription: normalizedTranscription,
          score: state.score ?? 0,
          validationResult: validationResult.content,
          scoringResult: state.scoringResult ?? null,
        },
        'feedback_0',
        state.outputDir
      );

      state.costTracking['feedback_0'] = feedbackResult.metadata;

      if (feedbackResult.ok && feedbackResult.content) {
        state.feedbackResult = feedbackResult.content;
        console.log(`${LOG_PREFIX} Feedback complete [run]`);
      } else {
        console.warn(`${LOG_PREFIX} Feedback agent failed, continuing without feedback [run]`);
      }

      // ========== COMPLETE ==========
      state.status = 'complete';
      this.aggregateCosts(state);
      this.logStateDump(state, stepCount);

      console.log(
        `${LOG_PREFIX} Graph complete. ` +
          `Score: ${state.score}/100, ` +
          `Cost: $${state.totalCost.toFixed(4)} [run]`
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      state.status = 'error';
      console.error(`${LOG_PREFIX} Graph error: ${state.error} [run]`);
    }

    return state;
  }

  /**
   * Aggregate costs from all agents.
   */
  private aggregateCosts(state: GameSessionState): void {
    state.totalCost = 0;
    state.totalInputTokens = 0;
    state.totalOutputTokens = 0;

    for (const meta of Object.values(state.costTracking)) {
      const m = meta as LLMInferenceMetadata;
      if (m.cost !== undefined) {
        state.totalCost += m.cost;
        state.totalInputTokens += m.inputTokens ?? 0;
        state.totalOutputTokens += m.outputTokens ?? 0;
      }
    }
  }

  /**
   * Log state dump for debugging (following agentic-workflow.mdc pattern).
   */
  private logStateDump(state: GameSessionState, step: number): void {
    const summary = {
      step,
      sessionId: state.sessionId,
      word: state.expectedWord,
      transcription: state.finalTranscription,
      status: state.status,
      score: state.score,
      totalCost: state.totalCost,
      error: state.error,
    };
    console.log(`${LOG_PREFIX} STATE_DUMP: ${JSON.stringify(summary)} [logStateDump]`);
  }
}
