import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeminiRestClient } from '@/lib/gemini/rest-client';
import { RecognitionAgent } from '@/lib/agents/recognition-agent';
import { GEMINI_MODELS } from '@/lib/schemas/cost-tracking';

const LOG_PREFIX = '[API]';

// ============================================================
// REQUEST SCHEMA
// ============================================================

const RecognizeRequestSchema = z.object({
  image: z.string().min(100), // Base64 encoded JPEG (min 100 chars to be valid)
});

// ============================================================
// POST /api/game/recognize
// ============================================================

/**
 * POST /api/game/recognize
 *
 * Recognizes a single ASL letter from an image snapshot.
 * Called by the client after countdown completes.
 *
 * Request: { image: string } (base64 JPEG)
 * Response: { success: boolean, letter: string, metrics: {...} }
 */
export async function POST(request: NextRequest) {
  console.log(`${LOG_PREFIX} POST /api/game/recognize`);

  try {
    const body = await request.json();

    // Validate request with Zod
    const parsed = RecognizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error(`${LOG_PREFIX} Validation error:`, parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          letter: '?',
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { image } = parsed.data;

    console.log(`${LOG_PREFIX} Image size: ${image.length} chars`);

    // Create client with Gemini 3.0 Flash
    const client = new GeminiRestClient(GEMINI_MODELS.GEMINI_3_FLASH);

    // Create agent and run
    const agent = new RecognitionAgent();
    const outputDir = process.env.NODE_ENV === 'development' ? './output' : undefined;

    const result = await agent.run(client, { image }, 'recognition_0', outputDir);

    // Build response
    const response = {
      success: result.ok,
      letter: result.content?.letter ?? '?',
      metrics: {
        cost: result.metadata.cost,
        inputTokens: result.metadata.inputTokens,
        outputTokens: result.metadata.outputTokens,
        latencyMs: result.metadata.latencyMs,
        model: result.metadata.model,
      },
      error: result.error?.message,
    };

    console.log(
      `${LOG_PREFIX} Response: success=${response.success}, letter="${response.letter}", ` +
        `cost=$${response.metrics.cost.toFixed(4)}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error(`${LOG_PREFIX} Recognition error:`, error);
    return NextResponse.json(
      {
        success: false,
        letter: '?',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
