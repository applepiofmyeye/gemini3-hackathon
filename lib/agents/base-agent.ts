import { type z } from 'zod';
import { type GeminiRestClient } from '../gemini/rest-client';
import { type LLMInferenceMetadata } from '../schemas/cost-tracking';
import fs from 'fs';
import path from 'path';

export interface AgentResult<T> {
  ok: boolean;
  content: T | null;
  error?: { message: string; code?: string };
  metadata: LLMInferenceMetadata;
}

/**
 * Base agent class following agentic-workflow.mdc patterns.
 *
 * Responsibilities:
 * - Prepare system and human messages
 * - Call Gemini with messages
 * - Save input messages to timestamped log file (for debugging)
 * - Save agent output to timestamped log file with metrics/artifacts
 * - Return AgentResult with typed content
 * - Do NOT update state (Node/Graph responsibility)
 */
export abstract class BaseAgent<TInput, TOutput> {
  protected logPrefix: string;
  protected agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
    this.logPrefix = `[${agentName.toUpperCase().replace(/_/g, '_')}]`;
  }

  /**
   * Build system message with instructions.
   */
  abstract buildSystemMessage(): string;

  /**
   * Build human message from input.
   */
  abstract buildHumanMessage(input: TInput): string;

  /**
   * Get Zod schema for output validation.
   */
  abstract getOutputSchema(): z.ZodType<TOutput>;

  /**
   * Run the agent.
   */
  async run(
    client: GeminiRestClient,
    input: TInput,
    agentKey: string,
    outputDir?: string
  ): Promise<AgentResult<TOutput>> {
    const systemMessage = this.buildSystemMessage();
    const humanMessage = this.buildHumanMessage(input);
    const schema = this.getOutputSchema();

    console.log(`${this.logPrefix} Starting agent execution [run]`);

    // Save input messages (before calling agent)
    if (outputDir) {
      this.saveInputLog(systemMessage, humanMessage, input, outputDir);
    }

    const startTime = Date.now();

    try {
      // Call Gemini
      const response = await client.generate(systemMessage, humanMessage);
      const latencyMs = Date.now() - startTime;

      // Build metadata
      const metadata: LLMInferenceMetadata = {
        inputTokens: response.usage?.promptTokenCount ?? 0,
        outputTokens: response.usage?.candidatesTokenCount ?? 0,
        cost: client.calculateCost(
          response.usage?.promptTokenCount ?? 0,
          response.usage?.candidatesTokenCount ?? 0
        ),
        model: client.modelName,
        timestamp: new Date().toISOString(),
        latencyMs,
        agentName: this.agentName,
      };

      // Parse JSON from response
      const text = response.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error(`${this.logPrefix} No JSON found in response [run]`);
        if (outputDir) {
          this.saveErrorLog('No JSON in response', text, outputDir);
        }
        return {
          ok: false,
          content: null,
          error: { message: 'No JSON in response' },
          metadata,
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (err) {
        const parseMsg = err instanceof Error ? err.message : 'Unknown parse error';
        console.error(`${this.logPrefix} JSON parse error: ${parseMsg} [run]`);
        if (outputDir) {
          this.saveErrorLog('JSON parse error', text, outputDir);
        }
        return {
          ok: false,
          content: null,
          error: { message: 'Invalid JSON in response' },
          metadata,
        };
      }

      // Validate with Zod schema
      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        console.error(
          `${this.logPrefix} Schema validation failed: ${validated.error.message} [run]`
        );
        if (outputDir) {
          this.saveErrorLog(
            `Schema validation failed: ${validated.error.message}`,
            text,
            outputDir
          );
        }
        return {
          ok: false,
          content: null,
          error: { message: `Schema validation failed: ${validated.error.message}` },
          metadata,
        };
      }

      console.log(
        `${this.logPrefix} Complete: ok=true, ` +
          `cost=$${metadata.cost.toFixed(4)}, ` +
          `tokens=${metadata.inputTokens}→${metadata.outputTokens} [run]`
      );

      // Save output (after receiving result)
      if (outputDir) {
        this.saveOutputLog(validated.data, metadata, outputDir);
      }

      return {
        ok: true,
        content: validated.data,
        metadata,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`${this.logPrefix} Error: ${errorMessage} [run]`);

      const metadata: LLMInferenceMetadata = {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        model: client.modelName,
        timestamp: new Date().toISOString(),
        latencyMs,
        agentName: this.agentName,
      };

      if (outputDir) {
        this.saveErrorLog(errorMessage, '', outputDir);
      }

      return {
        ok: false,
        content: null,
        error: { message: errorMessage },
        metadata,
      };
    }
  }

  /**
   * Save agent input to log file (following agentic-workflow.mdc).
   */
  private saveInputLog(
    systemMessage: string,
    humanMessage: string,
    input: TInput,
    outputDir: string
  ): void {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(outputDir, `${timestamp}_${this.agentName}_input.log`);

      const content = `${'='.repeat(80)}
${this.logPrefix} INPUT MESSAGES
${'='.repeat(80)}

SYSTEM MESSAGE:
${'-'.repeat(40)}
${systemMessage}
${'-'.repeat(40)}

HUMAN MESSAGE:
${'-'.repeat(40)}
${humanMessage}
${'-'.repeat(40)}

RAW INPUT:
${'-'.repeat(40)}
${JSON.stringify(input, null, 2)}
${'-'.repeat(40)}

${'='.repeat(80)}`;

      fs.writeFileSync(logPath, content);
      console.log(`${this.logPrefix} Saved input messages to ${logPath} [saveInputLog]`);
    } catch (e) {
      console.warn(`${this.logPrefix} Failed to save input log: ${e} [saveInputLog]`);
    }
  }

  /**
   * Save agent output to log file (following agentic-workflow.mdc).
   */
  private saveOutputLog(output: TOutput, metadata: LLMInferenceMetadata, outputDir: string): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(outputDir, `${timestamp}_${this.agentName}_output.log`);

      const content = `${'='.repeat(80)}
${this.logPrefix} AGENT OUTPUT
${'='.repeat(80)}

METRICS:
  Status: ✓ Success
  Input Tokens: ${metadata.inputTokens}
  Output Tokens: ${metadata.outputTokens}
  Cost: $${metadata.cost.toFixed(6)}
  Latency: ${metadata.latencyMs}ms
  Model: ${metadata.model}

OUTPUT:
${'-'.repeat(40)}
${JSON.stringify(output, null, 2)}
${'-'.repeat(40)}

${'='.repeat(80)}`;

      fs.writeFileSync(logPath, content);
      console.log(`${this.logPrefix} Saved output to ${logPath} [saveOutputLog]`);
    } catch (e) {
      console.warn(`${this.logPrefix} Failed to save output log: ${e} [saveOutputLog]`);
    }
  }

  /**
   * Save error log for debugging.
   */
  private saveErrorLog(error: string, rawResponse: string, outputDir: string): void {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(outputDir, `${timestamp}_${this.agentName}_error.log`);

      const content = `${'='.repeat(80)}
${this.logPrefix} AGENT ERROR
${'='.repeat(80)}

ERROR:
${'-'.repeat(40)}
${error}
${'-'.repeat(40)}

RAW RESPONSE:
${'-'.repeat(40)}
${rawResponse}
${'-'.repeat(40)}

${'='.repeat(80)}`;

      fs.writeFileSync(logPath, content);
    } catch (e) {
      console.warn(`${this.logPrefix} Failed to save error log: ${e} [saveErrorLog]`);
    }
  }
}
