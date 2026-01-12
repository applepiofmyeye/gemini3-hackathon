/**
 * Audio utilities for converting Gemini TTS PCM output to playable WAV format.
 *
 * Gemini 2.5 Flash TTS outputs raw PCM audio:
 * - Sample rate: 24000 Hz
 * - Bit depth: 16-bit
 * - Channels: 1 (mono)
 */

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

/**
 * Convert base64-encoded PCM audio to a WAV Blob.
 *
 * @param pcmBase64 - Base64-encoded raw PCM audio data from Gemini TTS
 * @returns Blob containing WAV audio data
 */
export function pcmToWav(pcmBase64: string): Blob {
  // Decode base64 to Uint8Array
  const pcmData = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));

  // Create WAV file with header
  const wavData = createWavFile(pcmData);

  // Create Blob from the buffer (cast needed for strict TS with ArrayBufferLike)
  return new Blob([wavData.buffer as ArrayBuffer], { type: 'audio/wav' });
}

/**
 * Convert base64-encoded PCM audio to a data URL for audio playback.
 *
 * @param pcmBase64 - Base64-encoded raw PCM audio data from Gemini TTS
 * @returns Data URL string that can be used as audio src
 */
export function pcmToDataUrl(pcmBase64: string): string {
  const wavBlob = pcmToWav(pcmBase64);
  return URL.createObjectURL(wavBlob);
}

/**
 * Create a WAV file from raw PCM data.
 *
 * WAV file structure:
 * - RIFF header (12 bytes)
 * - fmt chunk (24 bytes)
 * - data chunk (8 bytes + PCM data)
 *
 * @param pcmData - Raw PCM audio samples
 * @returns Uint8Array containing complete WAV file
 */
function createWavFile(pcmData: Uint8Array): Uint8Array {
  const dataSize = pcmData.length;
  const fileSize = 44 + dataSize; // 44 byte header + PCM data
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true); // File size - 8 bytes for RIFF header
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, NUM_CHANNELS, true); // Number of channels
  view.setUint32(24, SAMPLE_RATE, true); // Sample rate
  view.setUint32(28, SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE, true); // Byte rate
  view.setUint16(32, NUM_CHANNELS * BYTES_PER_SAMPLE, true); // Block align
  view.setUint16(34, BITS_PER_SAMPLE, true); // Bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // Data size

  // Copy PCM data
  const wavArray = new Uint8Array(buffer);
  wavArray.set(pcmData, 44);

  return wavArray;
}

/**
 * Write a string to a DataView at the specified offset.
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Play audio from base64-encoded PCM data.
 *
 * @param pcmBase64 - Base64-encoded raw PCM audio data from Gemini TTS
 * @returns Promise that resolves when audio finishes playing, or rejects on error
 */
export function playPcmAudio(pcmBase64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataUrl = pcmToDataUrl(pcmBase64);
    const audio = new Audio(dataUrl);

    audio.onended = () => {
      URL.revokeObjectURL(dataUrl); // Clean up
      resolve();
    };

    audio.onerror = (error) => {
      URL.revokeObjectURL(dataUrl); // Clean up
      reject(error);
    };

    audio.play().catch(reject);
  });
}
