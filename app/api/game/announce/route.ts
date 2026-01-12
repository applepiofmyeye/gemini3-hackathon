import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AnnouncementGraph } from '@/lib/graph/announcement-graph';
import type { AnnouncementOutput } from '@/lib/schemas/agent-outputs';

const LOG_PREFIX = '[API/ANNOUNCE]';

// ============================================================
// REQUEST SCHEMA
// ============================================================

const AnnounceRequestSchema = z.object({
  target: z.string(), // Expected station name (e.g., "Bishan")
  transcription: z.string(), // What user signed (e.g., "BYSHAT")
  matchPercentage: z.number().min(0).max(100), // From validation
});

// ============================================================
// RESPONSE TYPE
// ============================================================

interface AnnounceResponse {
  success: boolean;
  scenario?: AnnouncementOutput['scenario'];
  message?: string;
  phonetic?: string;
  audioBase64?: string;
  metrics?: AnnouncementOutput['metrics'];
  error?: string;
}

// ============================================================
// API ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse<AnnounceResponse>> {
  console.log(`${LOG_PREFIX} POST /api/game/announce`);

  try {
    const body = await request.json();

    // Validate request
    const parsed = AnnounceRequestSchema.safeParse(body);
    if (!parsed.success) {
      console.error(`${LOG_PREFIX} Validation error:`, parsed.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.map((i) => i.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { target, transcription, matchPercentage } = parsed.data;

    // Run announcement graph
    const graph = new AnnouncementGraph();
    const result = await graph.run(
      { target, transcription, matchPercentage },
      process.env.NODE_ENV === 'development' ? './output' : undefined
    );

    console.log(
      `${LOG_PREFIX} Complete: scenario=${result.scenario}, cost=$${result.metrics.totalCost.toFixed(6)}`
    );

    return NextResponse.json({
      success: true,
      scenario: result.scenario,
      message: result.message,
      phonetic: result.phonetic,
      audioBase64: result.audioBase64,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
