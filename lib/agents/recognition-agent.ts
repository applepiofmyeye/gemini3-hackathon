import { z } from 'zod';
import { type GeminiRestClient } from '../gemini/rest-client';
import { type LLMInferenceMetadata } from '../schemas/cost-tracking';
import fs from 'fs';
import path from 'path';

// ============================================================
// INPUT/OUTPUT SCHEMAS
// ============================================================

export interface RecognitionInput {
  image: string; // Base64 encoded JPEG
}

export const RecognitionOutputSchema = z.object({
  letter: z.string().length(1), // Single character: A-Z or ?
});

export type RecognitionOutput = z.infer<typeof RecognitionOutputSchema>;

// ============================================================
// AGENT RESULT TYPE
// ============================================================

export interface AgentResult<T> {
  ok: boolean;
  content: T | null;
  error?: { message: string; code?: string };
  metadata: LLMInferenceMetadata;
}

// ============================================================
// RECOGNITION AGENT
// ============================================================

/**
 * RecognitionAgent - Single-image ASL letter recognition.
 *
 * Following agentic-workflow.mdc patterns:
 * - Prepare system and human messages
 * - Call Gemini with image
 * - Save input/output logs for debugging
 * - Return AgentResult with typed content
 * - Do NOT update state (caller responsibility)
 */
export class RecognitionAgent {
  private logPrefix = '[RECOGNITION_AGENT]';
  private agentName = 'recognition_agent';

  /**
   * Build system message with ASL recognition instructions.
   */
  buildSystemMessage(): string {
    return `You are an ASL (American Sign Language) fingerspelling recognition system.

Your task: Look at the image and identify what ASL letter is being signed.

ASL FINGERSPELLING REFERENCE:
- A: Fist with thumb resting against the side
- B: Flat hand, fingers together pointing up, thumb tucked
- C: Curved hand forming a 'C' shape
- D: Index finger up, other fingers curled with thumb touching middle finger
- E: Fingers curled down, thumb tucked across palm
- F: Thumb and index finger form circle, other fingers up
- G: Fist with index finger and thumb pointing sideways
- H: Index and middle fingers extended sideways together
- I: Fist with pinky finger extended up
- J: Pinky up, draw a 'J' motion (static: pinky up)
- K: Index and middle fingers up in V, thumb between them
- L: L-shape with thumb and index finger extended
- M: Thumb under three fingers (index, middle, ring)
- N: Thumb under two fingers (index, middle)
- O: All fingers curved to touch thumb, forming 'O'
- P: Like K but pointing down
- Q: Like G but pointing down
- R: Index and middle fingers crossed
- S: Fist with thumb over curled fingers
- T: Thumb tucked between index and middle finger in fist
- U: Index and middle fingers up together, touching
- V: Index and middle fingers up and spread (peace sign)
- W: Index, middle, and ring fingers up and spread
- X: Index finger hooked/bent
- Y: Thumb and pinky extended (hang loose/shaka)
- Z: Draw a 'Z' with index finger (static: index pointing)

OUTPUT FORMAT:
Return a JSON object with a single "letter" field:
- If you are confident: {"letter": "A"} (the recognized letter)
- If unsure or no clear hand sign: {"letter": "?"}

IMPORTANT:
- Output ONLY the JSON object, nothing else
- Only output a letter if you are confident
- Output "?" if the image is unclear, no hand visible, or sign is ambiguous`;
  }

  /**
   * Build human message (minimal since image is the main input).
   */
  buildHumanMessage(): string {
    return `Look at this image and identify the ASL letter being signed. Output only the JSON.`;
  }

  /**
   * Run the recognition agent with an image.
   */
  async run(
    client: GeminiRestClient,
    input: RecognitionInput,
    agentKey: string,
    outputDir?: string
  ): Promise<AgentResult<RecognitionOutput>> {
    const systemMessage = this.buildSystemMessage();
    const humanMessage = this.buildHumanMessage();

    console.log(`${this.logPrefix} Starting agent execution [run]`);

    // Save input log (before calling agent)
    if (outputDir) {
      this.saveInputLog(systemMessage, humanMessage, input, outputDir);
    }

    const startTime = Date.now();

    try {
      // Call Gemini with image
      const response = await client.generateWithImage(
        systemMessage,
        humanMessage,
        input.image,
        'image/jpeg'
      );

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
      const validated = RecognitionOutputSchema.safeParse(parsed);
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
          `letter="${validated.data.letter}", ` +
          `cost=$${metadata.cost.toFixed(4)}, ` +
          `tokens=${metadata.inputTokens}→${metadata.outputTokens} [run]`
      );

      // Save output log (after receiving result)
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
    input: RecognitionInput,
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

IMAGE:
${'-'.repeat(40)}
[Base64 image, ${input.image.length} characters]
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
  private saveOutputLog(
    output: RecognitionOutput,
    metadata: LLMInferenceMetadata,
    outputDir: string
  ): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logPath = path.join(outputDir, `${timestamp}_${this.agentName}_output.log`);

      const content = `${'='.repeat(80)}
${this.logPrefix} AGENT OUTPUT
${'='.repeat(80)}

METRICS:
  Status: ✓ Success
  Recognized Letter: ${output.letter}
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
