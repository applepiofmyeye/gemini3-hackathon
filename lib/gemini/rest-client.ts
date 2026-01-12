import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { calculateCost, GEMINI_MODELS } from '../schemas/cost-tracking';

const LOG_PREFIX = '[GEMINI_REST_CLIENT]';

export interface GenerateResponse {
  text: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GenerateAudioResponse {
  audioBase64: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * REST client for Gemini API.
 * Used for validation/scoring/feedback agents (not streaming).
 */
export class GeminiRestClient {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  public readonly modelName: string;

  constructor(modelName: string = GEMINI_MODELS.GEMINI_2_5_FLASH) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
    this.model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 3000, // Increased by 20% from 2048
      },
    });

    console.log(`${LOG_PREFIX} Initialized with model: ${modelName} [constructor]`);
  }

  /**
   * Generate content with system and human messages.
   */
  async generate(systemMessage: string, humanMessage: string): Promise<GenerateResponse> {
    console.log(`${LOG_PREFIX} Generating content [generate]`);

    try {
      // Combine system and human messages into a single prompt
      const prompt = `${systemMessage}\n\n---\n\n${humanMessage}`;

      const result = await this.model.generateContent(prompt);

      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;

      console.log(
        `${LOG_PREFIX} Generation complete: ` +
          `tokens=${usage?.promptTokenCount ?? 0}→${usage?.candidatesTokenCount ?? 0} [generate]`
      );

      return {
        text,
        usage: {
          promptTokenCount: usage?.promptTokenCount,
          candidatesTokenCount: usage?.candidatesTokenCount,
          totalTokenCount: usage?.totalTokenCount,
        },
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} Generation error: ${error} [generate]`);
      throw error;
    }
  }

  /**
   * Generate content with image + text (multimodal).
   * Used for ASL recognition from camera snapshots.
   */
  async generateWithImage(
    systemMessage: string,
    humanMessage: string,
    imageBase64: string,
    mimeType: string = 'image/jpeg'
  ): Promise<GenerateResponse> {
    console.log(`${LOG_PREFIX} Generating content with image [generateWithImage]`);

    try {
      // Build multimodal content with image and text
      const prompt = `${systemMessage}\n\n---\n\n${humanMessage}`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageBase64,
          },
        },
      ]);

      const response = result.response;
      const text = response.text();
      const usage = response.usageMetadata;

      console.log(
        `${LOG_PREFIX} Generation with image complete: ` +
          `tokens=${usage?.promptTokenCount ?? 0}→${usage?.candidatesTokenCount ?? 0} [generateWithImage]`
      );

      return {
        text,
        usage: {
          promptTokenCount: usage?.promptTokenCount,
          candidatesTokenCount: usage?.candidatesTokenCount,
          totalTokenCount: usage?.totalTokenCount,
        },
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} Generation with image error: ${error} [generateWithImage]`);
      throw error;
    }
  }

  /**
   * Calculate cost for a generation.
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateCost(inputTokens, outputTokens, this.modelName);
  }

  /**
   * Generate audio using Gemini TTS model.
   * Uses the @google/genai SDK for proper TTS support.
   *
   * @param prompt - Text to convert to speech (can include DIRECTOR'S NOTES)
   * @param voiceName - Prebuilt voice name (default: 'Aoede')
   * @param model - TTS model to use (default: gemini-2.5-flash-preview-tts)
   */
  async generateAudio(
    prompt: string,
    voiceName: string = 'Aoede',
    model: string = GEMINI_MODELS.GEMINI_2_5_FLASH_TTS
  ): Promise<GenerateAudioResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    console.log(`${LOG_PREFIX} Generating audio with model: ${model} [generateAudio]`);

    // Use the new @google/genai SDK for TTS
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioBase64) {
      throw new Error('No audio data in TTS response');
    }

    // Extract usage metadata
    const usage = response.usageMetadata || {};

    console.log(
      `${LOG_PREFIX} Audio generation complete: ` +
        `${audioBase64.length} bytes, ` +
        `tokens=${usage.promptTokenCount ?? 0}→${usage.candidatesTokenCount ?? 0} [generateAudio]`
    );

    return {
      audioBase64,
      usage: {
        promptTokenCount: usage.promptTokenCount,
        candidatesTokenCount: usage.candidatesTokenCount,
        totalTokenCount: usage.totalTokenCount,
      },
    };
  }

  /**
   * Calculate cost for audio generation.
   */
  calculateAudioCost(inputTokens: number, outputTokens: number): number {
    return calculateCost(inputTokens, outputTokens, GEMINI_MODELS.GEMINI_2_5_FLASH_TTS);
  }
}
