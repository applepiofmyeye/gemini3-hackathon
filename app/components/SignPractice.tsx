'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { normalizePracticeWord } from '@/lib/utils/normalize';
import { playGlobalSfx } from '@/app/hooks/useAudio';
import { startBackgroundMusic } from '@/app/components/AudioControls';

// ============================================================
// TYPES
// ============================================================

interface SignPracticeProps {
  apiKey: string;
  expectedWord: string;
  lineColor: string;
  lineId: string;
  lineAbbreviation: string;
  stationId: string;
  onTranscriptionUpdate?: (text: string) => void;
  onComplete: (finalTranscription: string, durationMs: number, letterCount: number) => void;
  onCancel: () => void;
}

interface RecognizeResponse {
  success: boolean;
  letter: string;
  metrics?: {
    cost: number;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    model: string;
  };
  error?: string;
}

// ============================================================
// COUNTDOWN DURATION
// ============================================================

const COUNTDOWN_SECONDS = 3;

// ============================================================
// COMPONENT
// ============================================================

export default function SignPractice({
  expectedWord,
  lineColor,
  lineId: _lineId,
  lineAbbreviation,
  stationId,
  onTranscriptionUpdate,
  onComplete,
  onCancel,
}: SignPracticeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Game state
  const [isStarted, setIsStarted] = useState(false);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);

  // Timing
  const startTimeRef = useRef<number | null>(null);

  // Normalized letters (only a-z, lowercase) - used for BOTH display AND recognition
  const letters = useMemo(() => {
    return normalizePracticeWord(expectedWord).split('');
  }, [expectedWord]);

  const currentLetter = letters[currentLetterIndex] || '';
  const isComplete = currentLetterIndex >= letters.length;

  // ============================================================
  // CAMERA INITIALIZATION
  // ============================================================

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available. Please use HTTPS or localhost.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      } else {
        console.error('[SignPractice] videoRef is null after getting stream');
        setCameraError('Failed to attach camera stream. Please refresh and try again.');
      }
    } catch (error) {
      console.error('[SignPractice] Error accessing camera:', error);

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Please allow camera access and refresh.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setCameraError('Camera is in use by another application.');
        } else {
          setCameraError(`Camera error: ${error.message}`);
        }
      } else {
        setCameraError('Could not access camera. Please check permissions.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    const videoEl = videoRef.current;

    return () => {
      if (videoEl?.srcObject) {
        const tracks = (videoEl.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // ============================================================
  // TRANSCRIPTION UPDATES
  // ============================================================

  useEffect(() => {
    if (onTranscriptionUpdate && transcription) {
      onTranscriptionUpdate(transcription);
    }
  }, [transcription, onTranscriptionUpdate]);

  // ============================================================
  // CAPTURE AND RECOGNIZE (defined before countdown effect)
  // ============================================================

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      console.error('[SignPractice] Video or canvas ref missing');
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[SignPractice] Could not get canvas context');
      return null;
    }

    // Use 768x768 for optimal quality
    const targetSize = 768;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Center crop to square
    const videoAspect = video.videoWidth / video.videoHeight;
    let srcX = 0,
      srcY = 0,
      srcW = video.videoWidth,
      srcH = video.videoHeight;

    if (videoAspect > 1) {
      srcW = video.videoHeight;
      srcX = (video.videoWidth - srcW) / 2;
    } else {
      srcH = video.videoWidth;
      srcY = (video.videoHeight - srcH) / 2;
    }

    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, targetSize, targetSize);

    // Get base64 without the data URL prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.split(',')[1];

    console.log('[SignPractice] 📷 Captured frame:', {
      size: `${targetSize}x${targetSize}`,
      base64Length: base64.length,
    });

    return base64;
  }, []);

  // ============================================================
  // NAVIGATION (defined before captureAndRecognize which depends on it)
  // ============================================================

  const advanceToNextLetter = useCallback(() => {
    const nextIndex = currentLetterIndex + 1;

    if (nextIndex >= letters.length) {
      // All letters done - complete the session
      console.log('[SignPractice] ✅ All letters completed');
      const durationMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;

      // Immediately transition UI to complete state
      setCurrentLetterIndex(nextIndex); // Move past final letter so isComplete becomes true
      setCountdown(null); // Stop countdown
      setLastResult(null); // Clear result overlay

      // Call onComplete after a brief delay to show completion state
      setTimeout(() => {
        setTranscription((prev) => {
          onComplete(prev, durationMs, letters.length);
          return prev;
        });
      }, 500);
    } else {
      // Move to next letter
      console.log('[SignPractice] ➡️ Advancing to letter:', letters[nextIndex]);
      setCurrentLetterIndex(nextIndex);
      setLastResult(null);
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [currentLetterIndex, letters, onComplete]);

  const startPractice = useCallback(async () => {
    console.log('[SignPractice] 🎬 Starting practice for word:', expectedWord);
    // Ensure music is playing when practice starts
    await startBackgroundMusic();
    setIsStarted(true);
    setCurrentLetterIndex(0);
    setTranscription('');
    setTotalCost(0);
    startTimeRef.current = Date.now();
    setCountdown(COUNTDOWN_SECONDS);
  }, [expectedWord]);

  // captureAndRecognize defined after advanceToNextLetter
  const captureAndRecognize = useCallback(async () => {
    // Guard: don't run if already complete or no current letter
    if (currentLetterIndex >= letters.length || !currentLetter) {
      console.log('[SignPractice] ⏭️ Skipping capture - already complete');
      return;
    }

    console.log('[SignPractice] 🎯 Capturing frame for letter:', currentLetter);

    setIsProcessing(true);
    setLastResult(null);

    const imageBase64 = captureFrame();

    if (!imageBase64) {
      console.error('[SignPractice] Failed to capture frame');
      setLastResult('?');
      setTranscription((prev) => prev + '?');
      advanceToNextLetter();
      setIsProcessing(false);
      return;
    }

    try {
      console.log('[SignPractice] 📤 Sending image to /api/game/recognize');

      const response = await fetch('/api/game/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data: RecognizeResponse = await response.json();

      console.log('[SignPractice] 📥 Recognition result:', {
        success: data.success,
        letter: data.letter,
        cost: data.metrics?.cost,
        latency: data.metrics?.latencyMs,
      });

      const recognizedLetter = data.letter || '?';

      setLastResult(recognizedLetter);
      setTranscription((prev) => prev + recognizedLetter);

      // Play correct/wrong sound effect
      const isCorrect = recognizedLetter.toLowerCase() === currentLetter.toLowerCase();
      playGlobalSfx(isCorrect ? 'correct' : 'wrong');

      if (data.metrics?.cost) {
        setTotalCost((prev) => prev + data.metrics!.cost);
      }

      // Advance immediately for better flow
      advanceToNextLetter();
      setIsProcessing(false);
    } catch (error) {
      console.error('[SignPractice] ❌ Recognition error:', error);
      setLastResult('?');
      setTranscription((prev) => prev + '?');

      advanceToNextLetter();
      setIsProcessing(false);
    }
  }, [currentLetter, currentLetterIndex, letters.length, captureFrame, advanceToNextLetter]);

  // ============================================================
  // COUNTDOWN TIMER (defined after captureAndRecognize)
  // ============================================================

  useEffect(() => {
    if (countdown === null || countdown < 0) return;

    if (countdown === 0) {
      // Countdown finished - capture and recognize
      captureAndRecognize();
      return;
    }

    // Play countdown beep on each tick (3, 2, 1)
    if (countdown > 0) {
      playGlobalSfx('countdown');
    }

    const timerId = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timerId);
  }, [countdown, captureAndRecognize]);

  // ============================================================
  // UI HELPERS
  // ============================================================

  const showLoadingOverlay = !cameraReady && !cameraError;
  const showErrorOverlay = !!cameraError;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      {/* MRT Station Sign */}
      <div className="w-full">
        <Image
          src={`/mrt-signs/${stationId}.png`}
          alt={`${lineAbbreviation} ${expectedWord} Station Sign`}
          width={800}
          height={200}
          className="w-full h-auto rounded-2xl shadow-lg"
          priority
        />
      </div>

      {/* Letter Signs Section */}
      {letters.length > 0 && (
        <div className="w-full">
          <div className="text-sm text-gray-600 mb-3 text-center">
            {isStarted ? (isComplete ? 'Complete!' : 'Sign this letter:') : 'Letter Signs:'}
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {letters.map((letter, index) => {
              const isActive = isStarted && index === currentLetterIndex;
              const isDone = isStarted && index < currentLetterIndex;
              const resultLetter = transcription[index];
              const isCorrect = resultLetter?.toLowerCase() === letter.toLowerCase();

              return (
                <div key={`${letter}-${index}`} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-16 h-16 rounded-lg shadow-md p-2 flex items-center justify-center transition-all ${
                      isActive
                        ? 'ring-4 ring-offset-2 scale-110'
                        : isDone
                          ? isCorrect
                            ? 'bg-green-100'
                            : 'bg-red-100'
                          : 'bg-white'
                    }`}
                    style={{
                      backgroundColor: isActive ? `${lineColor}20` : undefined,
                      // @ts-expect-error ringColor is a Tailwind CSS variable
                      '--tw-ring-color': isActive ? lineColor : undefined,
                    }}
                  >
                    <Image
                      src={`/letters/${letter}.svg`}
                      alt={`Sign for letter ${letter}`}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span
                    className={`font-medium text-sm transition-all ${
                      isActive
                        ? 'font-bold text-lg'
                        : isDone
                          ? isCorrect
                            ? 'text-green-700'
                            : 'text-red-700'
                          : 'text-gray-700'
                    }`}
                    style={{ color: isActive ? lineColor : undefined }}
                  >
                    {isDone ? resultLetter : letter}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform scale-x-[-1] ${
            showLoadingOverlay || showErrorOverlay ? 'opacity-0' : 'opacity-100'
          } transition-opacity duration-300`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Loading Overlay */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <div
              className="animate-spin w-12 h-12 border-4 border-gray-600 rounded-full mb-4"
              style={{ borderTopColor: lineColor }}
            />
            <p className="text-gray-400">Initializing camera...</p>
          </div>
        )}

        {/* Error Overlay */}
        {showErrorOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
            <div className="text-red-400 text-center mb-4 text-sm max-w-sm">{cameraError}</div>

            <button
              onClick={startCamera}
              className="px-6 py-2 text-white rounded-lg transition-colors hover:brightness-110"
              style={{ backgroundColor: lineColor }}
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <div className="text-sm text-white/80 mb-2">Get ready to sign</div>
            <div className="text-9xl font-bold animate-pulse" style={{ color: lineColor }}>
              {countdown}
            </div>
            <div className="text-4xl font-bold mt-4 text-white">{currentLetter}</div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <div
              className="animate-spin w-16 h-16 border-4 border-white/30 rounded-full mb-4"
              style={{ borderTopColor: lineColor }}
            />
            <p className="text-white text-lg">Analyzing...</p>
          </div>
        )}

        {/* Result Flash */}
        {lastResult && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 animate-pulse">
            <div
              className={`text-9xl font-bold ${
                lastResult === currentLetter ? 'text-green-400' : 'text-yellow-400'
              }`}
            >
              {lastResult}
            </div>
          </div>
        )}

        {/* Start Button - only show when camera is ready and not started */}
        {cameraReady && !isStarted && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <button
              onClick={startPractice}
              className="px-8 py-3 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              style={{ backgroundColor: lineColor }}
            >
              ▶ Start Practice
            </button>
          </div>
        )}
      </div>

      {/* Live Transcription */}
      <div className="w-full p-6 rounded-2xl min-h-[80px]" style={{ backgroundColor: '#f8f6f0' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
            Your Signs
          </span>
          {transcription && (
            <span className="text-xs text-gray-400">
              {transcription.length} / {letters.length} characters
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold font-mono tracking-wider text-gray-800">
            {transcription || (
              <span className="text-gray-400 italic text-lg font-normal">
                {cameraReady
                  ? isStarted
                    ? 'Waiting for your sign...'
                    : 'Press Start to begin'
                  : 'Waiting for camera...'}
              </span>
            )}
          </p>
        </div>
        {totalCost > 0 && (
          <div className="text-xs text-gray-400 mt-2">API Cost: ${totalCost.toFixed(4)}</div>
        )}
      </div>

      {/* Cancel Button */}
      <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 underline text-sm">
        Cancel and go back
      </button>
    </div>
  );
}
