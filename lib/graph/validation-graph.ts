import { GeminiRestClient } from '../gemini/rest-client';
import { ValidationAgent } from '../agents/validation-agent';
import { ScoringAgent } from '../agents/scoring-agent';
import { FeedbackAgent } from '../agents/feedback-agent';
import { type GameSessionState } from '../schemas/game-session';
import { type LLMInferenceMetadata, GEMINI_MODELS } from '../schemas/cost-tracking';
import { normalizePracticeWord } from '../utils/normalize';
import { createTimer } from '../utils/tracing';

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
   * Flow: Validation → (Scoring + Feedback in parallel) → Complete
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
      // ========== STEP 1: VALIDATION ==========
      stepCount++;
      state.status = 'validating';
      console.log(`${LOG_PREFIX} ===== STEP ${stepCount}: VALIDATION ===== [run]`);

      const validationTimer = createTimer('validation_agent');
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
      agentTimings.validation = validationTimer.end().durationMs;

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
          `match=${validationResult.content.matchPercentage}%, ` +
          `timing=${agentTimings.validation}ms [run]`
      );

      // ========== STEP 2: SCORING + FEEDBACK (PARALLEL) ==========
      stepCount++;
      console.log(
        `${LOG_PREFIX} ===== STEP ${stepCount}: SCORING + FEEDBACK (parallel) ===== [run]`
      );

      // Run ScoringAgent and FeedbackAgent in parallel for ~30-40% latency reduction
      // FeedbackAgent uses matchPercentage as score estimate since scoring isn't done yet
      const parallelTimer = createTimer('parallel_agents');
      const [scoringResult, feedbackResult] = await Promise.all([
        this.scoringAgent.run(
          this.client,
          {
            expectedWord: normalizedExpected,
            transcription: normalizedTranscription,
            validationResult: validationResult.content,
            durationMs: state.durationMs,
          },
          'scoring_0',
          state.outputDir
        ),
        this.feedbackAgent.run(
          this.client,
          {
            expectedWord: normalizedExpected,
            originalWord: state.expectedWord,
            transcription: normalizedTranscription,
            score: validationResult.content.matchPercentage, // Use matchPercentage as score estimate
            validationResult: validationResult.content,
            scoringResult: null, // Not available yet since running in parallel
          },
          'feedback_0',
          state.outputDir
        ),
      ]);
      agentTimings.parallel = parallelTimer.end().durationMs;

      // Process scoring result
      state.costTracking['scoring_0'] = scoringResult.metadata;
      agentTimings.scoring = scoringResult.metadata.latencyMs ?? 0;
      if (scoringResult.ok && scoringResult.content) {
        state.scoringResult = scoringResult.content;
        state.score = scoringResult.content.score;
        console.log(
          `${LOG_PREFIX} Scoring complete: ` +
            `score=${scoringResult.content.score}/100, ` +
            `timing=${agentTimings.scoring}ms [run]`
        );
      } else {
        console.warn(`${LOG_PREFIX} Scoring failed, using match percentage as score [run]`);
        state.score = validationResult.content.matchPercentage;
      }

      // Process feedback result
      state.costTracking['feedback_0'] = feedbackResult.metadata;
      agentTimings.feedback = feedbackResult.metadata.latencyMs ?? 0;
      if (feedbackResult.ok && feedbackResult.content) {
        state.feedbackResult = feedbackResult.content;
        console.log(`${LOG_PREFIX} Feedback complete, timing=${agentTimings.feedback}ms [run]`);
      } else {
        console.warn(`${LOG_PREFIX} Feedback agent failed, continuing without feedback [run]`);
      }

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
          `(validation: ${agentTimings.validation}ms, parallel: ${agentTimings.parallel}ms) [run]`
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
