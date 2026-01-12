import { GeminiRestClient } from '../gemini/rest-client';
import { PhoneticAgent } from '../agents/phonetic-agent';
import { calculateCost, GEMINI_MODELS } from '../schemas/cost-tracking';
import type { AnnouncementOutput, AnnouncementScenario } from '../schemas/agent-outputs';

const LOG_PREFIX = '[ANNOUNCEMENT_GRAPH]';

// ============================================================
// DIRECTOR'S NOTES PROMPTS
// ============================================================

const CRASH_PROMPT = `
# AUDIO PROFILE: Angry Uncle
## "The 7AM Commuter Who Wants to Scold"

An irritated Singaporean commuter who just witnessed someone mess up badly.
Early morning, haven't had kopi yet. Ready to pick a fight.

### DIRECTOR'S NOTES
Style:
* Sharp, accusatory tone. Each word is a jab.
* Rising anger. Start annoyed, end furious.
* The "Wah Lao Eh" energy: exasperated disbelief

Pace: Fast and punchy. Strategic pauses before insults land.
Accent: Singaporean Uncle. Hokkien-influenced.

### TRANSCRIPT
Wah. lao. eh. Train. crash. al-rea-dy. You. see. what. you. do? Can-not. even. sign. pro-per-ly. Alight. now. lah!
`;

const DELAYED_PROMPT = (phonetic: string) => `
# AUDIO PROFILE: Sian Office Worker
## "The 'Haiz... Bo Bian' Commuter"

A tired Singaporean who has accepted that nothing works properly.
Not angry anymore. Just... disappointed. And very, very tired.

### DIRECTOR'S NOTES
Style:
* Flat, resigned tone. The sound of giving up.
* Heavy sighs. Vocal fry. Zero enthusiasm.
* The "Haiz" energy: tired acceptance

Pace: Slow and dragging. Long pauses of exhaustion.
Accent: Singaporean office worker. Monotone.

### TRANSCRIPT
Haiz. You. hav. a-rived. late. at. ${phonetic}. De-lay. is. ex-pec-ted. So. please. wait. ah. Bo. bian.
`;

const SAFE_PROMPT = (station: string) => `
# AUDIO PROFILE: Steady Auntie
## "The 'See! Can One!' Cheerleader"

A proud Singaporean auntie celebrating your success.
Energetic, warm, genuinely happy. The "steady lah" energy.

### DIRECTOR'S NOTES
Style:
* Bright, upbeat tone. Genuine warmth.
* Rising excitement. Each phrase builds energy.
* The "Steady Lah" energy: proud encouragement

Pace: Quick and bouncy. Infectious enthusiasm.
Accent: Singaporean Auntie. Warm and encouraging.

### TRANSCRIPT
Wah! Stea-dy lah! You. hav. a-rived. safe-ly. at. ${station}! See! I. told. you. can. one! Please. mind. the. plat-form. gap. hor!
`;

// ============================================================
// INPUT TYPES
// ============================================================

export interface AnnouncementInput {
  target: string; // Expected station name (e.g., "Bishan")
  transcription: string; // What user signed (e.g., "BYSHAT")
  matchPercentage: number; // From validation (0-100)
}

// ============================================================
// GRAPH
// ============================================================

/**
 * Announcement Graph - Orchestrates phonetic generation and TTS.
 *
 * Flow:
 * 1. Determine scenario (crash/delayed/safe) based on match percentage
 * 2. If delayed: Generate phonetic pronunciation using PhoneticAgent
 * 3. Generate TTS audio using appropriate DIRECTOR'S NOTES prompt
 * 4. Return combined result with cost metrics
 */
export class AnnouncementGraph {
  private phoneticAgent: PhoneticAgent;
  private client: GeminiRestClient;

  constructor() {
    this.phoneticAgent = new PhoneticAgent();
    this.client = new GeminiRestClient(GEMINI_MODELS.GEMINI_2_5_FLASH);
  }

  /**
   * Determine scenario based on transcription and match percentage.
   */
  private getScenario(transcription: string, matchPct: number): AnnouncementScenario {
    // Crash if contains question marks (recognition failed) or very low match
    if (transcription.includes('?') || matchPct < 30) {
      return 'crash';
    }
    // Safe if exact match (100%)
    if (matchPct >= 100) {
      return 'safe';
    }
    // Otherwise delayed
    return 'delayed';
  }

  /**
   * Run the announcement graph.
   */
  async run(input: AnnouncementInput, outputDir?: string): Promise<AnnouncementOutput> {
    console.log(`${LOG_PREFIX} Starting announcement graph [run]`);
    console.log(
      `${LOG_PREFIX} Target: "${input.target}", ` +
        `Transcription: "${input.transcription}", ` +
        `Match: ${input.matchPercentage}% [run]`
    );

    const scenario = this.getScenario(input.transcription, input.matchPercentage);
    console.log(`${LOG_PREFIX} Scenario: ${scenario} [run]`);

    let prompt: string;
    let phonetic: string | undefined;
    let message: string;
    let phoneticCost = 0;
    let phoneticInputTokens = 0;
    let phoneticOutputTokens = 0;

    // ========== STEP 1: BUILD PROMPT (and generate phonetic if needed) ==========
    switch (scenario) {
      case 'crash':
        prompt = CRASH_PROMPT;
        message = 'Train crash! Cannot even sign properly!';
        break;

      case 'delayed':
        // Generate phonetic pronunciation using agent
        console.log(`${LOG_PREFIX} ===== STEP 1: PHONETIC GENERATION ===== [run]`);
        const phoneticResult = await this.phoneticAgent.run(
          this.client,
          { transcription: input.transcription },
          'phonetic_0',
          outputDir
        );

        if (phoneticResult.ok && phoneticResult.content) {
          phonetic = phoneticResult.content.phonetic;
          phoneticCost = phoneticResult.metadata.cost;
          phoneticInputTokens = phoneticResult.metadata.inputTokens;
          phoneticOutputTokens = phoneticResult.metadata.outputTokens;
        } else {
          // Fallback: use transcription as-is
          phonetic = input.transcription;
          console.warn(`${LOG_PREFIX} Phonetic generation failed, using raw transcription [run]`);
        }

        prompt = DELAYED_PROMPT(phonetic);
        message = `Arrived late at ${phonetic}. Bo bian.`;
        break;

      case 'safe':
        prompt = SAFE_PROMPT(input.target);
        message = `Steady lah! Arrived safely at ${input.target}!`;
        break;
    }

    // ========== STEP 2: GENERATE TTS AUDIO ==========
    console.log(`${LOG_PREFIX} ===== STEP 2: TTS GENERATION ===== [run]`);

    const ttsResult = await this.client.generateAudio(prompt);

    const ttsInputTokens = ttsResult.usage?.promptTokenCount ?? 0;
    const ttsOutputTokens = ttsResult.usage?.candidatesTokenCount ?? 0;
    const ttsCost = calculateCost(
      ttsInputTokens,
      ttsOutputTokens,
      GEMINI_MODELS.GEMINI_2_5_FLASH_TTS
    );

    const totalCost = phoneticCost + ttsCost;

    console.log(
      `${LOG_PREFIX} Graph complete. Scenario: ${scenario}, ` +
        `Total cost: $${totalCost.toFixed(6)} [run]`
    );

    // ========== BUILD OUTPUT ==========
    const output: AnnouncementOutput = {
      scenario,
      message,
      phonetic,
      audioBase64: ttsResult.audioBase64,
      metrics: {
        ttsCost,
        ttsInputTokens,
        ttsOutputTokens,
        totalCost,
      },
    };

    // Add phonetic metrics if applicable
    if (scenario === 'delayed') {
      output.metrics.phoneticCost = phoneticCost;
      output.metrics.phoneticInputTokens = phoneticInputTokens;
      output.metrics.phoneticOutputTokens = phoneticOutputTokens;
    }

    return output;
  }
}
