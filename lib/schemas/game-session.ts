import { z } from 'zod';

// ============================================================
// SESSION STATUS (Generation State Pattern)
// ============================================================

export const SessionStatusSchema = z.enum([
  'initialized',
  'connecting',
  'streaming',
  'recognizing',
  'validating',
  'complete',
  'error',
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

// ============================================================
// TRANSCRIPTION EVENT
// ============================================================

export const TranscriptionEventSchema = z.object({
  timestamp: z.number(), // ms since session start
  text: z.string(),
  isFinal: z.boolean().default(false),
  tokenCount: z.number().optional(),
});
export type TranscriptionEvent = z.infer<typeof TranscriptionEventSchema>;

// ============================================================
// GAME SESSION STATE (Persistable - Generation State Pattern)
// ============================================================

export const GameSessionStateSchema = z.object({
  // Identity
  sessionId: z.string(),
  createdAt: z.string(),

  // Game context
  lineId: z.string(),
  wordId: z.string(),
  expectedWord: z.string(),
  level: z.union([z.literal(1), z.literal(2)]),

  // Session state (Generation State Pattern)
  status: SessionStatusSchema,

  // Streaming data
  transcriptionEvents: z.array(TranscriptionEventSchema),
  finalTranscription: z.string().nullable(),

  // Timing
  streamStartedAt: z.number().nullable(), // Unix timestamp
  streamEndedAt: z.number().nullable(),
  durationMs: z.number().default(0),

  // Validation results (populated after validation)
  validationResult: z.any().nullable(),
  scoringResult: z.any().nullable(),
  feedbackResult: z.any().nullable(),
  score: z.number().nullable(),

  // Cost tracking (key: agentName_stepNum)
  costTracking: z.record(z.string(), z.any()),
  totalCost: z.number().default(0),
  totalInputTokens: z.number().default(0),
  totalOutputTokens: z.number().default(0),

  // Error handling
  error: z.string().nullable(),

  // Config
  outputDir: z.string().optional(),
});
export type GameSessionState = z.infer<typeof GameSessionStateSchema>;

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createInitialSessionState(params: {
  lineId: string;
  wordId: string;
  expectedWord: string;
  level: 1 | 2;
  outputDir?: string;
}): GameSessionState {
  return {
    sessionId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    lineId: params.lineId,
    wordId: params.wordId,
    expectedWord: params.expectedWord,
    level: params.level,
    status: 'initialized',
    transcriptionEvents: [],
    finalTranscription: null,
    streamStartedAt: null,
    streamEndedAt: null,
    durationMs: 0,
    validationResult: null,
    scoringResult: null,
    feedbackResult: null,
    score: null,
    costTracking: {},
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    error: null,
    outputDir: params.outputDir,
  };
}

// ============================================================
// API REQUEST SCHEMA
// ============================================================

export const ValidateRequestSchema = z.object({
  session: GameSessionStateSchema,
});
export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;
