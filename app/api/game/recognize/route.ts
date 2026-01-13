import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeminiRestClient } from '@/lib/gemini/rest-client';
import { RecognitionAgent } from '@/lib/agents/recognition-agent';
import { GEMINI_MODELS } from '@/lib/schemas/cost-tracking';
import { createTracer, getOrCreateRequestId, createTracingHeaders } from '@/lib/utils/tracing';

const LOG_PREFIX = '[API/RECOGNIZE]';

// ============================================================
// SINGLETON INSTANCES
// Module-level singletons to eliminate per-request instantiation overhead.
// These persist across requests in the same runtime instance.
// ============================================================

let singletonClient: GeminiRestClient | null = null;
let singletonAgent: RecognitionAgent | null = null;

function getClient(): GeminiRestClient {
  if (!singletonClient) {
    console.log(`${LOG_PREFIX} Creating singleton GeminiRestClient`);
    singletonClient = new GeminiRestClient(GEMINI_MODELS.GEMINI_3_FLASH);
  }
  return singletonClient;
}

function getAgent(): RecognitionAgent {
  if (!singletonAgent) {
    console.log(`${LOG_PREFIX} Creating singleton RecognitionAgent`);
    singletonAgent = new RecognitionAgent();
  }
  return singletonAgent;
}

// ============================================================
// REQUEST SCHEMA (for JSON fallback)
// ============================================================

const RecognizeRequestSchema = z.object({
  image: z.string().min(100), // Base64 encoded JPEG (min 100 chars to be valid)
});

// ============================================================
// HELPERS
// ============================================================

/**
 * Convert ArrayBuffer to base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================================
// POST /api/game/recognize
// ============================================================

/**
 * POST /api/game/recognize
 *
 * Recognizes a single ASL letter from an image snapshot.
 * Called by the client after countdown completes.
 *
 * Supports two request formats:
 * 1. multipart/form-data with 'image' file field (preferred - no base64 overhead)
 * 2. application/json with { image: string } (base64 JPEG fallback)
 *
 * Response: { success: boolean, letter: string, metrics: {...} }
 */
export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers);
  const practiceId = request.headers.get('x-practice-id') || undefined;
  const tracer = createTracer({ requestId, practiceId });

  tracer.log('request_start', { method: 'POST', path: '/api/game/recognize' });

  try {
    const contentType = request.headers.get('content-type') || '';
    let image: string;
    let payloadSize: number;
    let uploadType: 'blob' | 'base64';

    const parseTimer = tracer.startStage('parse_request');

    if (contentType.includes('multipart/form-data')) {
      // Binary upload via FormData (preferred - no base64 overhead)
      const formData = await request.formData();
      const imageFile = formData.get('image');

      if (!imageFile || !(imageFile instanceof File)) {
        tracer.recordTiming(parseTimer.end());
        tracer.log('validation_error', { error: 'Missing image file in FormData' });
        return NextResponse.json(
          {
            success: false,
            letter: '?',
            error: 'Missing image file',
            requestId,
          },
          { status: 400, headers: createTracingHeaders(requestId) }
        );
      }

      // Convert blob to base64 for the agent
      const arrayBuffer = await imageFile.arrayBuffer();
      image = arrayBufferToBase64(arrayBuffer);
      payloadSize = arrayBuffer.byteLength;
      uploadType = 'blob';
    } else {
      // JSON fallback with base64
      const body = await request.json();

      const parsed = RecognizeRequestSchema.safeParse(body);
      if (!parsed.success) {
        tracer.recordTiming(parseTimer.end());
        tracer.log('validation_error', { issues: parsed.error.issues });
        return NextResponse.json(
          {
            success: false,
            letter: '?',
            error: 'Invalid request',
            details: parsed.error.issues,
            requestId,
          },
          { status: 400, headers: createTracingHeaders(requestId) }
        );
      }

      image = parsed.data.image;
      payloadSize = image.length;
      uploadType = 'base64';
    }

    tracer.recordTiming(parseTimer.end());
    tracer.log('request_parsed', { payloadSize, uploadType });

    // Get singleton client and agent (eliminates per-request instantiation overhead)
    const setupTimer = tracer.startStage('get_singletons');
    const client = getClient();
    const agent = getAgent();
    tracer.recordTiming(setupTimer.end());

    const outputDir = process.env.NODE_ENV === 'development' ? './output' : undefined;

    // Run recognition
    const result = await tracer.measure('gemini_call', () =>
      agent.run(client, { image }, 'recognition_0', outputDir)
    );

    // Build response
    const response = {
      success: result.ok,
      letter: result.content?.letter ?? '?',
      requestId,
      metrics: {
        cost: result.metadata.cost,
        inputTokens: result.metadata.inputTokens,
        outputTokens: result.metadata.outputTokens,
        latencyMs: result.metadata.latencyMs,
        model: result.metadata.model,
      },
      error: result.error?.message,
    };

    const summary = tracer.getSummary();
    tracer.log('request_complete', {
      success: response.success,
      letter: response.letter,
      cost: response.metrics.cost,
      totalMs: summary.total,
      stages: summary.stages,
    });

    return NextResponse.json(response, {
      headers: createTracingHeaders(requestId, summary.stages),
    });
  } catch (error) {
    tracer.log('request_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        letter: '?',
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500, headers: createTracingHeaders(requestId) }
    );
  }
}
