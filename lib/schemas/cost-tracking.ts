import { z } from 'zod';

// ============================================================
// GEMINI MODEL CONSTANTS
// ============================================================

export const GEMINI_MODELS = {
  // Gemini 2.5 Series (REST API)
  GEMINI_2_5_FLASH: 'gemini-2.5-flash',
  GEMINI_2_5_PRO: 'gemini-2.5-pro',
  // Gemini 2.5 Series (Live API - AUDIO only)
  GEMINI_2_5_FLASH_NATIVE_AUDIO: 'gemini-2.5-flash-native-audio-preview-12-2025',
  // Gemini 2.0 (Live API - supports VIDEO/IMAGE streaming)
  GEMINI_2_0_FLASH_LIVE: 'gemini-2.0-flash-exp',
  // Gemini 3 Series
  GEMINI_3_FLASH: 'gemini-3-flash-preview',
  GEMINI_3_PRO: 'gemini-3-pro-preview',
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

// ============================================================
// PRICING CONFIGURATION
// ============================================================

interface ModelPricing {
  input: number; // Cost per token
  output: number; // Cost per token
  cachedInput?: number; // Cost per cached input token
  thinkingOutput?: number; // Cost per thinking token (for models that support it)
}

const PRICING: Record<GeminiModel, ModelPricing> = {
  [GEMINI_MODELS.GEMINI_2_5_FLASH]: {
    input: 0.3 / 1_000_000,
    output: 2.5 / 1_000_000,
  },
  [GEMINI_MODELS.GEMINI_2_5_PRO]: {
    input: 1.25 / 1_000_000,
    output: 10.0 / 1_000_000,
  },
  [GEMINI_MODELS.GEMINI_2_5_FLASH_NATIVE_AUDIO]: {
    input: 3.0 / 1_000_000, // $3.00/1M for audio/video input
    output: 2.0 / 1_000_000, // $2.00/1M for text output
  },
  [GEMINI_MODELS.GEMINI_2_0_FLASH_LIVE]: {
    input: 0.1 / 1_000_000, // Video/Image
    output: 0.4 / 1_000_000, // Text
  },
  [GEMINI_MODELS.GEMINI_3_FLASH]: {
    input: 0.5 / 1_000_000,
    output: 3.0 / 1_000_000,
  },
  [GEMINI_MODELS.GEMINI_3_PRO]: {
    input: 2.0 / 1_000_000,
    output: 12.0 / 1_000_000,
  },
} as const;

// ============================================================
// LLM INFERENCE METADATA (For REST-based agents)
// ============================================================

export const LLMInferenceMetadataSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cost: z.number(),
  model: z.string(),
  timestamp: z.string(),
  latencyMs: z.number(),
  agentName: z.string(),
});
export type LLMInferenceMetadata = z.infer<typeof LLMInferenceMetadataSchema>;

// ============================================================
// STREAMING COST METADATA (For Live API WebSocket)
// ============================================================

export const StreamingCostMetadataSchema = z.object({
  model: z.string(),
  sessionDurationMs: z.number(),
  estimatedInputTokens: z.number(), // Based on frames sent
  estimatedOutputTokens: z.number(), // Based on transcription length
  estimatedCost: z.number(),
  frameCount: z.number(),
  transcriptionCount: z.number(),
});
export type StreamingCostMetadata = z.infer<typeof StreamingCostMetadataSchema>;

// ============================================================
// COST SUMMARY
// ============================================================

export interface CostSummary {
  total: number;
  breakdown: Record<string, LLMInferenceMetadata | StreamingCostMetadata>;
}

/**
 * Print cost summary following agentic-workflow.mdc pattern.
 */
export function printCostSummary(summary: CostSummary): void {
  console.log('========== FINAL COST SUMMARY ==========');
  console.log(`Total Cost: $${summary.total.toFixed(4)}`);

  for (const [key, meta] of Object.entries(summary.breakdown)) {
    if ('sessionDurationMs' in meta) {
      // Streaming metadata
      console.log(
        `  - ${key}: $${meta.estimatedCost.toFixed(4)} ` +
          `(streaming, ${meta.frameCount} frames, ${meta.sessionDurationMs}ms)`
      );
    } else {
      // REST metadata
      console.log(
        `  - ${key}: $${meta.cost.toFixed(4)} ` +
          `(${meta.inputTokens} → ${meta.outputTokens} tokens)`
      );
    }
  }
  console.log('=========================================');
}

/**
 * Get pricing for a model (with fallback for unknown models).
 */
export function getModelPricing(model: string): ModelPricing {
  return (
    PRICING[model as GeminiModel] ?? {
      input: 0.15 / 1_000_000,
      output: 0.6 / 1_000_000,
    }
  );
}

/**
 * Calculate cost from token counts.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  cachedInputTokens = 0
): number {
  const pricing = getModelPricing(model);
  let cost = inputTokens * pricing.input + outputTokens * pricing.output;

  if (cachedInputTokens > 0 && pricing.cachedInput) {
    cost += cachedInputTokens * pricing.cachedInput;
  }

  return cost;
}
