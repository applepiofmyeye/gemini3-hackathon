import { type NextRequest, NextResponse } from 'next/server';
import { GamePipeline } from '@/lib/pipeline/game-pipeline';
import { ValidateRequestSchema } from '@/lib/schemas/game-session';

/**
 * POST /api/game/validate
 *
 * Runs the validation pipeline on a completed game session.
 * Called by the client after Live API streaming is complete.
 */
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/game/validate');

  try {
    const body = await request.json();

    // Validate request with Zod
    const parsed = ValidateRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[API] Validation error:', parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { session } = parsed.data;

    console.log(`[API] Session: ${session.sessionId}`);
    console.log(`[API] Word: "${session.expectedWord}"`);
    console.log(`[API] Transcription: "${session.finalTranscription}"`);

    // Run pipeline
    const pipeline = new GamePipeline();
    const result = await pipeline.runValidation(session, {
      lineId: session.lineId,
      wordId: session.wordId,
      expectedWord: session.expectedWord,
      level: session.level,
      outputDir: process.env.NODE_ENV === 'development' ? './output' : undefined,
      saveToDb: false,
      checkExisting: false,
    });

    // Build response
    const response = {
      success: result.success,
      sessionId: result.state.sessionId,
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

    console.log(`[API] Response: success=${response.success}, score=${response.score}`);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
