import { NextResponse } from 'next/server';

/**
 * GET /api/game/ping
 *
 * Lightweight endpoint for connection pre-warming.
 * Called when practice starts to establish HTTP connection
 * before the first actual recognition request.
 *
 * This eliminates cold connection overhead on the first letter.
 */
export async function GET() {
  // Return immediately with minimal payload
  return NextResponse.json(
    { ok: true, timestamp: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

/**
 * HEAD /api/game/ping
 *
 * Even lighter - no body returned.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
