import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createInitialSessionState } from '@/lib/schemas/game-session';
import { VOCABULARY, getWordById } from '@/lib/data/vocabulary';
import { MRT_LINES } from '@/lib/data/mrt-lines';

const StartRequestSchema = z.object({
  lineId: z.string(),
  wordId: z.string(),
});

/**
 * POST /api/game/start
 *
 * Initializes a new game session.
 * Returns session state and configuration for the client.
 */
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/game/start');

  try {
    const body = await request.json();

    // Validate request
    const parsed = StartRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lineId, wordId } = parsed.data;

    // Get MRT line
    const line = MRT_LINES.find((l) => l.id === lineId);
    if (!line) {
      return NextResponse.json({ error: `Unknown MRT line: ${lineId}` }, { status: 400 });
    }

    // Get word
    const word = getWordById(lineId, wordId);
    if (!word) {
      return NextResponse.json(
        { error: `Unknown word: ${wordId} in line ${lineId}` },
        { status: 400 }
      );
    }

    // Create session
    const session = createInitialSessionState({
      lineId,
      wordId,
      expectedWord: word.word,
      level: word.level,
    });

    console.log(`[API] Created session: ${session.sessionId}`);
    console.log(`[API] Word: "${word.word}" (Level ${word.level})`);

    return NextResponse.json({
      session,
      word,
      line: {
        id: line.id,
        name: line.name,
        color: line.color,
      },
    });
  } catch (error) {
    console.error('[API] Start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/game/start
 *
 * Returns available MRT lines and vocabulary.
 */
export async function GET() {
  return NextResponse.json({
    lines: MRT_LINES,
    vocabulary: VOCABULARY,
  });
}
