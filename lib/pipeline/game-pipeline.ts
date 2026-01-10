import { ValidationGraph } from '../graph/validation-graph';
import { type GameSessionState } from '../schemas/game-session';
import { printCostSummary } from '../schemas/cost-tracking';

const LOG_PREFIX = '[GAME_PIPELINE]';

export interface PipelineConfig {
  lineId: string;
  wordId: string;
  expectedWord: string;
  level: 1 | 2;
  outputDir?: string;
  saveToDb?: boolean;
  checkExisting?: boolean;
}

export interface PipelineResult {
  success: boolean;
  state: GameSessionState;
  error?: string;
}

/**
 * Game Pipeline - Top-level orchestrator.
 *
 * Following Pipeline Pattern from agentic-workflow.mdc:
 * - Orchestrate multiple graphs and handle business logic
 * - Aggregate results from multiple graphs
 * - Handle database persistence (if enabled)
 * - Check for existing results and reuse if applicable
 */
export class GamePipeline {
  private validationGraph: ValidationGraph;

  constructor(modelName?: string) {
    this.validationGraph = new ValidationGraph(modelName);
  }

  /**
   * Run the complete validation pipeline.
   *
   * Note: The Live API streaming is handled on the client.
   * This pipeline processes the results after streaming is complete.
   */
  async runValidation(
    sessionState: GameSessionState,
    config: PipelineConfig
  ): Promise<PipelineResult> {
    console.log('='.repeat(80));
    console.log(`${LOG_PREFIX} PIPELINE EXECUTION START`);
    console.log('='.repeat(80));
    console.log(`${LOG_PREFIX} Session: ${sessionState.sessionId}`);
    console.log(`${LOG_PREFIX} Word: "${config.expectedWord}" (Level ${config.level})`);
    console.log(`${LOG_PREFIX} Transcription: "${sessionState.finalTranscription}"`);
    console.log(`${LOG_PREFIX} Duration: ${sessionState.durationMs}ms`);
    console.log(
      `${LOG_PREFIX} Config: checkExisting=${config.checkExisting}, saveToDb=${config.saveToDb}`
    );

    try {
      // Check for existing results (if enabled)
      if (config.checkExisting) {
        // TODO: Implement Firestore check
        // const existing = await checkExistingResult(sessionState.sessionId);
        // if (existing) {
        //   console.log(`${LOG_PREFIX} Found existing result, reusing [runValidation]`);
        //   return { success: true, state: existing };
        // }
      }

      // Update output dir from config
      sessionState.outputDir = config.outputDir;

      // Run validation graph
      const updatedState = await this.validationGraph.run(sessionState);

      // Print cost summary
      printCostSummary({
        total: updatedState.totalCost,
        breakdown: updatedState.costTracking,
      });

      // Save to database (if enabled)
      if (config.saveToDb) {
        // TODO: Implement Firestore save
        // await saveResultToDb(updatedState);
        console.log(`${LOG_PREFIX} Would save to DB (not implemented) [runValidation]`);
      }

      console.log('='.repeat(80));
      console.log(`${LOG_PREFIX} PIPELINE EXECUTION COMPLETE`);
      console.log(`${LOG_PREFIX} Success: ${updatedState.status === 'complete'}`);
      console.log(`${LOG_PREFIX} Score: ${updatedState.score}/100`);
      console.log(`${LOG_PREFIX} Total Cost: $${updatedState.totalCost.toFixed(4)}`);
      console.log(`${LOG_PREFIX} Total Input Tokens: ${updatedState.totalInputTokens}`);
      console.log(`${LOG_PREFIX} Total Output Tokens: ${updatedState.totalOutputTokens}`);
      console.log('='.repeat(80));

      return {
        success: updatedState.status === 'complete',
        state: updatedState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} Pipeline error: ${errorMessage}`);

      sessionState.error = errorMessage;
      sessionState.status = 'error';

      return {
        success: false,
        state: sessionState,
        error: errorMessage,
      };
    }
  }
}
