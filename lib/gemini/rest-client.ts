import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
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
}
