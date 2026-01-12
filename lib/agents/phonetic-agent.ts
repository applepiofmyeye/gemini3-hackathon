import { type z } from 'zod';
import { BaseAgent } from './base-agent';
import { PhoneticOutputSchema, type PhoneticOutput } from '../schemas/agent-outputs';

interface PhoneticInput {
  transcription: string;
}

/**
 * Phonetic Agent - Converts misspelled words into pronounceable phonetics.
 *
 * Used for the "delayed arrival" scenario where the user's transcription
 * is close but not exact. Generates a phonetic pronunciation that can
 * be spoken naturally by TTS.
 */
export class PhoneticAgent extends BaseAgent<PhoneticInput, PhoneticOutput> {
  constructor() {
    super('phonetic_agent');
  }

  buildSystemMessage(): string {
    return `# Phonetic Pronunciation Generator

You convert misspelled or garbled transcriptions into funny-but-pronounceable phonetics.
The goal is NOT to correct to the real MRT station name — keep the "wrongness", just make it speakable.

## Rules
1. Output MUST be pronounceable as syllables (never letter-by-letter like "T-Y-S-N-G")
2. Use hyphens to separate syllables for clear staccato pronunciation (e.g. "Tie-Seng")
3. Preserve the approximate sound of the transcription (keep it wrong/funny)
4. Treat spaces, punctuation, and repeated consonants as cues for syllable boundaries
5. You MAY insert simple vowels to break consonant clusters (E/A/I/O/U) so it can be spoken
6. Keep it short: usually 2–4 syllables

## Biases (important)
- If it looks like it ends with "RIS"/"RIZ", prefer ending it as "Rees" (funny)
- If it resembles "BSHN", prefer "Bee-Shun" (not "Bee-Shan")
- For "SNG" clusters, prefer "Seng" over "Sang"

## Examples
- "TY SNG" → "Tie-Seng"
- "TYSNG" → "Tie-Seng"
- "SNG" → "Seng"
- "BSHN" → "Bee-Shun"
- "BSHUN" → "Bee-Shun"
- "BYSHAT" → "Bee-Shat"
- "KRNJY" → "Kran-Jee"
- "BOONLAY" → "Boon-Lay"
- "PSR RS" → "Pah-Sir-Rees"
- "PSIRRIZ" → "Pah-Sir-Rees"

## Output Format (JSON)
{
  "phonetic": "Bee-Shat",
  "reasoning": "BYSHAT sounds like Bishan, converted to pronounceable syllables"
}

Respond with ONLY valid JSON.`;
  }

  buildHumanMessage(input: PhoneticInput): string {
    return `Convert this word into a phonetic pronunciation:

Word: "${input.transcription}"

Generate a pronounceable, funny phonetic version that preserves the "wrong" vibe.
Do NOT correct it to the real MRT station name.`;
  }

  getOutputSchema(): z.ZodType<PhoneticOutput> {
    return PhoneticOutputSchema;
  }
}
