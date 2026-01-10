'use client';

import { type TranscriptionEvent } from '../schemas/game-session';
import { type StreamingCostMetadata, GEMINI_MODELS, getModelPricing } from '../schemas/cost-tracking';

/**
 * Configuration for Live Stream Agent.
 */
export interface LiveStreamConfig {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  onTranscription?: (event: TranscriptionEvent) => void;
  onConnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Result from a live streaming session.
 */
export interface LiveStreamResult {
  ok: boolean;
  transcriptionEvents: TranscriptionEvent[];
  finalTranscription: string;
  costMetadata: StreamingCostMetadata;
  error?: string;
}

/**
 * Control interface for active session.
 */
export interface LiveSessionControl {
  sendFrame: (base64: string) => void;
  endSession: () => Promise<LiveStreamResult>;
  isConnected: () => boolean;
}

const LOG_PREFIX = '[LIVE_STREAM_AGENT]';
const LIVE_API_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

// Estimated tokens per frame (rough estimate for image tokens)
const ESTIMATED_TOKENS_PER_FRAME = 258;

// Default model for Live API (must use native audio dialog model for streaming)
const DEFAULT_LIVE_MODEL = GEMINI_MODELS.GEMINI_2_5_FLASH_NATIVE;

/**
 * LiveStreamAgent - Client-side wrapper for Gemini Live API.
 *
 * This runs in the browser for low-latency streaming.
 * It follows agent patterns with logging and cost estimation.
 */
export class LiveStreamAgent {
  private config: LiveStreamConfig;
  private socket: WebSocket | null = null;
  private transcriptionEvents: TranscriptionEvent[] = [];
  private frameCount = 0;
  private startTime: number = 0;
  private isActive = false;

  constructor(config: LiveStreamConfig) {
    this.config = config;
  }

  /**
   * Start a streaming session.
   * Returns control interface for sending frames and ending session.
   */
  async startSession(): Promise<LiveSessionControl> {
    console.log(`${LOG_PREFIX} Starting Live API session [startSession]`);

    const url = `${LIVE_API_URL}?key=${this.config.apiKey}`;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);
      this.transcriptionEvents = [];
      this.frameCount = 0;
      this.startTime = Date.now();
      this.isActive = false;

      this.socket.onopen = () => {
        console.log(`${LOG_PREFIX} WebSocket connected [onopen]`);

        // Send setup message
        const setupMsg = {
          setup: {
            model: this.config.model || `models/${DEFAULT_LIVE_MODEL}`,
            generationConfig: {
              responseModalities: ['TEXT'],
            },
            systemInstruction: {
              parts: [{ text: this.config.systemPrompt }],
            },
          },
        };
        this.socket!.send(JSON.stringify(setupMsg));
        this.isActive = true;
        this.config.onConnected?.();

        // Return control interface
        resolve({
          sendFrame: (base64: string) => this.sendFrame(base64),
          endSession: () => this.endSession(),
          isConnected: () => this.isActive && this.socket?.readyState === WebSocket.OPEN,
        });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (error) => {
        console.error(`${LOG_PREFIX} WebSocket error [onerror]`, error);
        this.config.onError?.(new Error('WebSocket connection failed'));
        reject(new Error('WebSocket connection failed'));
      };

      this.socket.onclose = () => {
        console.log(`${LOG_PREFIX} WebSocket closed [onclose]`);
        this.isActive = false;
      };
    });
  }

  /**
   * Send a video frame to the Live API.
   */
  private sendFrame(base64: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn(`${LOG_PREFIX} Cannot send frame - socket not open [sendFrame]`);
      return;
    }

    this.frameCount++;

    const msg = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'image/jpeg',
            data: base64,
          },
        ],
      },
    };

    this.socket.send(JSON.stringify(msg));
  }

  /**
   * Handle incoming messages from Live API.
   */
  private handleMessage(data: string | Blob): void {
    const parseMessage = async (raw: string | Blob) => {
      const textData = typeof raw === 'string' ? raw : await raw.text();

      try {
        const response = JSON.parse(textData);
        const parts = response.serverContent?.modelTurn?.parts;

        if (parts) {
          const text = parts
            .map((p: { text?: string }) => p.text)
            .filter(Boolean)
            .join('');

          if (text) {
            const event: TranscriptionEvent = {
              timestamp: Date.now() - this.startTime,
              text,
              isFinal: response.serverContent?.turnComplete ?? false,
            };

            this.transcriptionEvents.push(event);
            this.config.onTranscription?.(event);

            console.log(`${LOG_PREFIX} Transcription: "${text}" [handleMessage]`);
          }
        }
      } catch (e) {
        console.error(`${LOG_PREFIX} Failed to parse message [handleMessage]`, e);
      }
    };

    parseMessage(data);
  }

  /**
   * End the streaming session and return results.
   */
  private async endSession(): Promise<LiveStreamResult> {
    console.log(`${LOG_PREFIX} Ending session (${this.frameCount} frames) [endSession]`);

    this.isActive = false;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    const durationMs = Date.now() - this.startTime;
    const finalTranscription = this.transcriptionEvents.map((e) => e.text).join('');

    // Estimate tokens and cost
    const estimatedInputTokens = this.frameCount * ESTIMATED_TOKENS_PER_FRAME;
    const estimatedOutputTokens = finalTranscription.length; // Rough: 1 token per char
    const modelName = this.config.model || DEFAULT_LIVE_MODEL;
    const pricing = getModelPricing(modelName);

    const costMetadata: StreamingCostMetadata = {
      model: modelName,
      sessionDurationMs: durationMs,
      estimatedInputTokens,
      estimatedOutputTokens,
      estimatedCost:
        estimatedInputTokens * pricing.input + estimatedOutputTokens * pricing.output,
      frameCount: this.frameCount,
      transcriptionCount: this.transcriptionEvents.length,
    };

    console.log(
      `${LOG_PREFIX} Session complete: ` +
        `frames=${this.frameCount}, ` +
        `transcriptions=${this.transcriptionEvents.length}, ` +
        `duration=${durationMs}ms, ` +
        `cost=$${costMetadata.estimatedCost.toFixed(4)} [endSession]`
    );

    return {
      ok: true,
      transcriptionEvents: this.transcriptionEvents,
      finalTranscription,
      costMetadata,
    };
  }

  /**
   * Get current transcription (for display).
   */
  getCurrentTranscription(): string {
    return this.transcriptionEvents.map((e) => e.text).join('');
  }

  /**
   * Get frame count (for UI).
   */
  getFrameCount(): number {
    return this.frameCount;
  }
}
