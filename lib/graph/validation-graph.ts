import { GeminiRestClient } from '../gemini/rest-client';
import { ValidationFeedbackAgent } from '../agents/validation-feedback-agent';
import { type GameSessionState } from '../schemas/game-session';
import { type LLMInferenceMetadata, GEMINI_MODELS } from '../schemas/cost-tracking';
import { normalizePracticeWord } from '../utils/normalize';
import { createTimer } from '../utils/tracing';
import type { ScoringOutput, ValidationOutput } from '../schemas/agent-outputs';

const LOG_PREFIX = '[VALIDATION_GRAPH]';

/**
 * Validation Graph - Orchestrates validation+feedback agent and deterministic scoring.
 *
 * Following Graph Pattern from agentic-workflow.mdc:
 * - Orchestrate multiple nodes/agents for a specific task
 * - Route between nodes based on state
 * - Track cost and token metrics
 * - Log all state transitions with JSON dumps
 */
export class ValidationGraph {
  private validationFeedbackAgent: ValidationFeedbackAgent;
  private client: GeminiRestClient;

  constructor(modelName: string = GEMINI_MODELS.GEMINI_3_FLASH) {
    this.validationFeedbackAgent = new ValidationFeedbackAgent();
    this.client = new GeminiRestClient(modelName);
  }

  /**
   * Run the validation graph.
   *
   * Flow: Validation + Feedback (single LLM call) -> Deterministic scoring -> Complete
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

    // Track overall graph timing
    const graphTimer = createTimer('graph_total');
    const agentTimings: Record<string, number> = {};

    try {
      // ========== STEP 1: VALIDATION + FEEDBACK ==========
      stepCount++;
      state.status = 'validating';
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: VALIDATION + FEEDBACK ===== [run]`);

      const validationTimer = createTimer('validation_feedback_agent');
      const validationResult = await this.validationFeedbackAgent.run(
        this.client,
        {
          expectedWord: normalizedExpected,
          originalWord: state.expectedWord,
          level: state.level,
          transcription: normalizedTranscription,
          durationMs: state.durationMs,
        },
        'validation_feedback_0',
        state.outputDir
      );
      agentTimings.validation = validationTimer.end().durationMs;

      // Update cost tracking
      state.costTracking['validation_feedback_0'] = validationResult.metadata;

      if (!validationResult.ok || !validationResult.content) {
        state.error = validationResult.error?.message ?? 'Validation/feedback agent failed';
        state.status = 'error';
        this.logStateDump(state, stepCount);
        return state;
      }

      state.validationResult = validationResult.content.validation;
      state.feedbackResult = validationResult.content.feedback;
      console.log(
        `${LOG_PREFIX} Validation complete: ` +
          `valid=${validationResult.content.validation.isValid}, ` +
          `match=${validationResult.content.validation.matchPercentage}%, ` +
          `timing=${agentTimings.validation}ms [run]`
      );

      // ========== STEP 2: DETERMINISTIC SCORING ==========
      stepCount++;
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: DETERMINISTIC SCORING ===== [run]`);

      const scoringResult = this.computeDeterministicScore(
        validationResult.content.validation,
        state.durationMs
      );
      state.scoringResult = scoringResult;
      state.score = scoringResult.score;
      console.log(`${LOG_PREFIX} Scoring complete: ` + `score=${scoringResult.score}/100 [run]`);

      // ========== COMPLETE ==========
      state.status = 'complete';
      this.aggregateCosts(state);

      const graphTiming = graphTimer.end();
      agentTimings.total = graphTiming.durationMs;

      this.logStateDump(state, stepCount, agentTimings);

      console.log(
        `${LOG_PREFIX} Graph complete. ` +
          `Score: ${state.score}/100, ` +
          `Cost: $${state.totalCost.toFixed(4)}, ` +
          `Total: ${agentTimings.total}ms ` +
          `(validation: ${agentTimings.validation}ms) [run]`
      );
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Unknown error';
      state.status = 'error';
      console.error(`${LOG_PREFIX} Graph error: ${state.error} [run]`);
    }

    return state;
  }

  /**
   * Deterministic scoring based on validation and duration.
   */
  private computeDeterministicScore(
    validation: ValidationOutput,
    durationMs: number
  ): ScoringOutput {
    const accuracy = Math.round(validation.matchPercentage);

    const seconds = durationMs / 1000;
    let speed = 100;
    if (seconds >= 10) speed = 40;
    else if (seconds >= 5) speed = 60;
    else if (seconds >= 2) speed = 80;

    // Heuristic clarity score derived from match percentage.
    const clarity = Math.min(100, Math.max(30, Math.round(validation.matchPercentage * 0.8 + 20)));

    const score = Math.round(accuracy * 0.6 + speed * 0.2 + clarity * 0.2);

    return {
      score,
      breakdown: { accuracy, speed, clarity },
      reasoning:
        `Deterministic scoring: accuracy=${accuracy}, speed=${speed}, clarity=${clarity}. ` +
        `Weighted score=${score}.`,
    };
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
  private logStateDump(
    state: GameSessionState,
    step: number,
    timings?: Record<string, number>
  ): void {
    const summary = {
      step,
      sessionId: state.sessionId,
      word: state.expectedWord,
      transcription: state.finalTranscription,
      status: state.status,
      score: state.score,
      totalCost: state.totalCost,
      error: state.error,
      timings,
    };
    console.log(`${LOG_PREFIX} STATE_DUMP: ${JSON.stringify(summary)} [logStateDump]`);
  }
}
