/**
 * Tracing utilities for latency measurement and debugging.
 *
 * Provides:
 * - Correlation ID generation (requestId, practiceId, sessionId)
 * - Stage timing helpers
 * - Structured log formatting
 */

// ============================================================
// ID GENERATION
// ============================================================

/**
 * Generate a short unique ID for request correlation.
 * Format: 8 character hex string (e.g., "a1b2c3d4")
 */
export function generateRequestId(): string {
  return Math.random().toString(16).slice(2, 10);
}

/**
 * Generate a practice session ID for correlating recognize calls within a word.
 * Format: "practice_" + timestamp + random suffix
 */
export function generatePracticeId(): string {
  return `practice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============================================================
// TIMING HELPERS
// ============================================================

export interface TimingResult {
  stage: string;
  durationMs: number;
  startTime: number;
  endTime: number;
}

/**
 * Create a timing context for measuring stage durations.
 */
export function createTimer(stage: string): { end: () => TimingResult } {
  const startTime = performance.now();
  return {
    end: () => {
      const endTime = performance.now();
      return {
        stage,
        durationMs: Math.round(endTime - startTime),
        startTime,
        endTime,
      };
    },
  };
}

/**
 * Measure async function execution time.
 */
export async function measureAsync<T>(
  stage: string,
  fn: () => Promise<T>
): Promise<{ result: T; timing: TimingResult }> {
  const timer = createTimer(stage);
  const result = await fn();
  const timing = timer.end();
  return { result, timing };
}

// ============================================================
// STRUCTURED LOGGING
// ============================================================

export interface TraceContext {
  requestId: string;
  sessionId?: string;
  practiceId?: string;
}

export interface TraceLogEntry {
  timestamp: string;
  context: TraceContext;
  event: string;
  data?: Record<string, unknown>;
  timings?: TimingResult[];
}

/**
 * Format a structured log entry for tracing.
 */
export function formatTraceLog(entry: TraceLogEntry): string {
  return JSON.stringify({
    ts: entry.timestamp,
    ...entry.context,
    event: entry.event,
    ...entry.data,
    timings: entry.timings?.map((t) => ({ [t.stage]: t.durationMs })),
  });
}

/**
 * Create a tracer for a specific request context.
 */
export function createTracer(context: TraceContext) {
  const timings: TimingResult[] = [];

  return {
    context,
    timings,

    /**
     * Start timing a stage.
     */
    startStage(stage: string) {
      return createTimer(stage);
    },

    /**
     * Record a completed timing.
     */
    recordTiming(timing: TimingResult) {
      timings.push(timing);
    },

    /**
     * Measure an async operation and record its timing.
     */
    async measure<T>(stage: string, fn: () => Promise<T>): Promise<T> {
      const { result, timing } = await measureAsync(stage, fn);
      timings.push(timing);
      return result;
    },

    /**
     * Log an event with current context and timings.
     */
    log(event: string, data?: Record<string, unknown>) {
      const entry: TraceLogEntry = {
        timestamp: new Date().toISOString(),
        context,
        event,
        data,
        timings: timings.length > 0 ? timings : undefined,
      };
      console.log(`[TRACE] ${formatTraceLog(entry)}`);
    },

    /**
     * Get timing summary.
     */
    getSummary(): { total: number; stages: Record<string, number> } {
      const stages: Record<string, number> = {};
      let total = 0;
      for (const t of timings) {
        stages[t.stage] = t.durationMs;
        total += t.durationMs;
      }
      return { total, stages };
    },
  };
}

// ============================================================
// SERVER-SIDE HELPERS
// ============================================================

/**
 * Extract or generate request ID from headers.
 */
export function getOrCreateRequestId(headers: Headers): string {
  return headers.get('x-request-id') || generateRequestId();
}

/**
 * Create response headers with tracing info.
 */
export function createTracingHeaders(
  requestId: string,
  serverTiming?: Record<string, number>
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-request-id': requestId,
  };

  if (serverTiming) {
    // Server-Timing header format: stage;dur=123, stage2;dur=456
    headers['Server-Timing'] = Object.entries(serverTiming)
      .map(([stage, dur]) => `${stage};dur=${dur}`)
      .join(', ');
  }

  return headers;
}
