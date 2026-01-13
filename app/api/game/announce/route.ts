import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AnnouncementGraph } from '@/lib/graph/announcement-graph';
import type { AnnouncementOutput } from '@/lib/schemas/agent-outputs';
import { createTracer, getOrCreateRequestId, createTracingHeaders } from '@/lib/utils/tracing';

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
  requestId?: string;
  scenario?: AnnouncementOutput['scenario'];
  message?: string;
  phonetic?: string;
  audioBase64?: string;
  audioMimeType?: string;
  metrics?: AnnouncementOutput['metrics'];
  error?: string;
}

// ============================================================
// API ROUTE HANDLER
// ============================================================

export async function POST(request: NextRequest): Promise<NextResponse<AnnounceResponse>> {
  const requestId = getOrCreateRequestId(request.headers);
  const tracer = createTracer({ requestId });

  tracer.log('request_start', { method: 'POST', path: '/api/game/announce' });

  try {
    // Parse request body
    const parseTimer = tracer.startStage('parse_request');
    const body = await request.json();
    tracer.recordTiming(parseTimer.end());

    // Validate request
    const parsed = AnnounceRequestSchema.safeParse(body);
    if (!parsed.success) {
      tracer.log('validation_error', { issues: parsed.error.issues });
      return NextResponse.json(
        {
          success: false,
          requestId,
          error: parsed.error.issues.map((i) => i.message).join(', '),
        },
        { status: 400, headers: createTracingHeaders(requestId) }
      );
    }

    const { target, transcription, matchPercentage } = parsed.data;

    tracer.log('request_parsed', { target, transcription, matchPercentage });

    // Run announcement graph with timing
    const result = await tracer.measure('announcement_graph', async () => {
      const graph = new AnnouncementGraph();
      return graph.run(
        { target, transcription, matchPercentage },
        process.env.NODE_ENV === 'development' ? './output' : undefined
      );
    });

    const summary = tracer.getSummary();
    tracer.log('request_complete', {
      scenario: result.scenario,
      totalCost: result.metrics.totalCost,
      totalMs: summary.total,
      stages: summary.stages,
    });

    return NextResponse.json(
      {
        success: true,
        requestId,
        scenario: result.scenario,
        message: result.message,
        phonetic: result.phonetic,
        audioBase64: result.audioBase64,
        audioMimeType: result.audioMimeType,
        metrics: result.metrics,
      },
      { headers: createTracingHeaders(requestId, summary.stages) }
    );
  } catch (error) {
    tracer.log('request_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        success: false,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: createTracingHeaders(requestId) }
    );
  }
}
