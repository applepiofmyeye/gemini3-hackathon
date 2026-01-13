import { type NextRequest, NextResponse } from 'next/server';
import { GamePipeline } from '@/lib/pipeline/game-pipeline';
import { ValidateRequestSchema } from '@/lib/schemas/game-session';
import { createTracer, getOrCreateRequestId, createTracingHeaders } from '@/lib/utils/tracing';

/**
 * POST /api/game/validate
 *
 * Runs the validation pipeline on a completed game session.
 * Called by the client after Live API streaming is complete.
 */
export async function POST(request: NextRequest) {
  const requestId = getOrCreateRequestId(request.headers);
  const tracer = createTracer({ requestId });

  tracer.log('request_start', { method: 'POST', path: '/api/game/validate' });

  try {
    // Parse request body
    const parseTimer = tracer.startStage('parse_request');
    const body = await request.json();
    tracer.recordTiming(parseTimer.end());

    // Validate request with Zod
    const parsed = ValidateRequestSchema.safeParse(body);
    if (!parsed.success) {
      tracer.log('validation_error', { issues: parsed.error.issues });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
          requestId,
        },
        { status: 400, headers: createTracingHeaders(requestId) }
      );
    }

    const { session } = parsed.data;

    // Update tracer context with session ID
    tracer.context.sessionId = session.sessionId;

    tracer.log('request_parsed', {
      sessionId: session.sessionId,
      word: session.expectedWord,
      transcription: session.finalTranscription,
    });

    // Run pipeline with timing
    const result = await tracer.measure('pipeline', async () => {
      const pipeline = new GamePipeline();
      return pipeline.runValidation(session, {
        lineId: session.lineId,
        wordId: session.wordId,
        expectedWord: session.expectedWord,
        level: session.level,
        outputDir: process.env.NODE_ENV === 'development' ? './output' : undefined,
        saveToDb: false,
        checkExisting: false,
      });
    });

    // Build response
    const response = {
      success: result.success,
      sessionId: result.state.sessionId,
      requestId,
      score: result.state.score,
      validation: result.state.validationResult,
      scoring: result.state.scoringResult,
      feedback: result.state.feedbackResult,
      metrics: {
        totalCost: result.state.totalCost,
        totalInputTokens: result.state.totalInputTokens,
        totalOutputTokens: result.state.totalOutputTokens,
        durationMs: result.state.durationMs,
      },
      error: result.error || result.state.error,
    };

    const summary = tracer.getSummary();
    tracer.log('request_complete', {
      success: response.success,
      score: response.score,
      totalCost: response.metrics.totalCost,
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
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500, headers: createTracingHeaders(requestId) }
    );
  }
}
