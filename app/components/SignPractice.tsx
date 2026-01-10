'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { GEMINI_MODELS } from '@/lib/schemas/cost-tracking';

// ============================================================
// TYPES
// ============================================================

type LiveIncomingMessage = {
  serverContent?: {
    modelTurn?: {
      parts?: { text?: string }[];
    };
  };
};

interface SignPracticeProps {
  apiKey: string;
  expectedWord: string;
  lineColor: string;
  lineId: string;
  lineAbbreviation: string;
  stationId: string;
  onTranscriptionUpdate?: (text: string) => void;
  onComplete: (finalTranscription: string, durationMs: number, frameCount: number) => void;
  onCancel: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export default function SignPractice({
  apiKey,
  expectedWord,
  lineColor,
  lineId,
  lineAbbreviation,
  stationId,
  onTranscriptionUpdate,
  onComplete,
  onCancel,
}: SignPracticeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const frameCountRef = useRef(0);

  // Initialize camera - now the video element is always in the DOM
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraReady(false);
    
    try {
      // Check if mediaDevices is available (requires HTTPS or localhost)
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
        // This shouldn't happen now that video is always rendered
        console.error('[SignPractice] videoRef is null after getting stream');
        setCameraError('Failed to attach camera stream. Please refresh and try again.');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // Provide specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('Camera permission denied. Please allow camera access in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('No camera found. Please connect a camera and try again.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          setCameraError('Camera is in use by another application. Please close other apps using the camera.');
        } else if (error.name === 'OverconstrainedError') {
          // Retry with minimal constraints
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              setCameraReady(true);
              return;
            }
          } catch {
            setCameraError('Could not access camera with any settings.');
            return;
          }
          setCameraError('Camera does not meet requirements.');
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

    // Cleanup camera on unmount
    return () => {
      if (videoEl?.srcObject) {
        const tracks = (videoEl.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Timer for elapsed streaming time
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isStreaming && streamStartTime) {
      intervalId = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - streamStartTime) / 1000));
      }, 1000);
    }

    return () => clearInterval(intervalId);
  }, [isStreaming, streamStartTime]);

  // Notify parent of transcription updates
  useEffect(() => {
    if (onTranscriptionUpdate && transcription) {
      onTranscriptionUpdate(transcription);
    }
  }, [transcription, onTranscriptionUpdate]);

  const connect = useCallback(() => {
    if (!apiKey) {
      alert('API Key not configured');
      return;
    }

    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[SignPractice] Connected to Gemini Live');
      setIsConnected(true);

      // Send setup message with targeted system instruction
      const setupMsg = {
        setup: {
          model: `models/${GEMINI_MODELS.GEMINI_2_5_FLASH_NATIVE}`,
          generationConfig: {
            responseModalities: ['TEXT'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: `You are an expert ASL (American Sign Language) interpreter. Your task is to recognize the sign language gestures shown in the video stream and output what is being signed.

The user is trying to sign the word: "${expectedWord}"

Output ONLY the letters or word you recognize. Be concise:
- For fingerspelling, output each letter as you see it (e.g., "H E L L O")
- For word signs, output the word (e.g., "HELLO")

If you don't see clear hand gestures, output nothing. Do not hallucinate or guess.`,
              },
            ],
          },
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = (event) => {
      const parseMessage = async (data: Blob | string) => {
        const textData = typeof data === 'string' ? data : await data.text();
        try {
          const response = JSON.parse(textData) as LiveIncomingMessage;
          const parts = response.serverContent?.modelTurn?.parts;
          if (parts) {
            const text = parts.map((p) => p.text).join('');
            if (text) {
              setTranscription((prev) => prev + text);
            }
          }
        } catch (e) {
          console.error('[SignPractice] Error parsing message', e);
        }
      };
      parseMessage(event.data);
    };

    ws.onerror = (err) => {
      console.error('[SignPractice] WebSocket Error:', err);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[SignPractice] Disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    setSocket(ws);
  }, [apiKey, expectedWord]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  }, [socket]);

  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamStartTime(Date.now());
    setTranscription('');
    setElapsedTime(0);
    frameCountRef.current = 0;
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    const duration = streamStartTime ? Date.now() - streamStartTime : 0;
    onComplete(transcription, duration, frameCountRef.current);
  }, [transcription, streamStartTime, onComplete]);

  // Frame processing loop
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isConnected && isStreaming && videoRef.current && canvasRef.current && socket) {
      intervalId = setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) return;

        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = video.videoWidth / 2;
        canvas.height = video.videoHeight / 2;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

        const msg = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            ],
          },
        };
        socket.send(JSON.stringify(msg));
        frameCountRef.current++;
      }, 200); // 5 FPS
    }

    return () => clearInterval(intervalId);
  }, [isConnected, isStreaming, socket]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine if we should show the loading/error overlay
  const showLoadingOverlay = !cameraReady && !cameraError;
  const showErrorOverlay = !!cameraError;

  // Parse word into letters for sign visualization
  const letters = useMemo(() => {
    return expectedWord
      .toLowerCase()
      .split('')
      .filter((char) => /[a-z]/.test(char)); // Only include letters a-z
  }, [expectedWord]);

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

      {/* Video Container - ALWAYS rendered so ref attaches */}
      <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Video element - always in DOM */}
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
            
            <div className="bg-gray-800 p-4 rounded-xl mb-4 text-sm text-gray-300 max-w-sm">
              <p className="font-medium mb-2">How to enable camera:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-400">
                <li>Click the camera icon in address bar</li>
                <li>Select &quot;Allow&quot; for camera access</li>
                <li>Click &quot;Retry&quot; below</li>
              </ol>
            </div>
            
            <button
              onClick={startCamera}
              className="px-6 py-2 text-white rounded-lg transition-colors hover:brightness-110"
              style={{ backgroundColor: lineColor }}
            >
              Retry Camera
            </button>
          </div>
        )}

        {/* Status Indicator - only show when camera is ready */}
        {cameraReady && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
            <div
              className={`w-3 h-3 rounded-full ${
                isStreaming ? 'bg-red-500 animate-pulse' : isConnected ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
            <span className="text-xs font-mono text-white">
              {isStreaming ? 'RECORDING' : isConnected ? 'READY' : 'CONNECTING...'}
            </span>
          </div>
        )}

        {/* Timer */}
        {isStreaming && (
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1.5 rounded-full">
            <span className="text-white font-mono text-lg">{formatTime(elapsedTime)}</span>
          </div>
        )}

        {/* Controls Overlay - only show when camera is ready */}
        {cameraReady && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            {!isConnected ? (
              <button
                onClick={connect}
                className="px-6 py-3 rounded-full font-medium transition-all transform hover:scale-105 active:scale-95 text-white"
                style={{ backgroundColor: lineColor }}
              >
                Connect to Start
              </button>
            ) : !isStreaming ? (
              <button
                onClick={startStreaming}
                className="px-8 py-3 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                style={{ backgroundColor: lineColor }}
              >
                ▶ Start Signing
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg"
              >
                ■ Done
              </button>
            )}
          </div>
        )}
      </div>

      {/* Letter Signs Section */}
      {letters.length > 0 && (
        <div className="w-full">
          <div className="text-sm text-gray-600 mb-3 text-center">Letter Signs:</div>
          <div className="flex flex-wrap justify-center gap-4">
            {letters.map((letter, index) => (
              <div key={`${letter}-${index}`} className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-white rounded-lg shadow-md p-2 flex items-center justify-center">
                  <Image
                    src={`/letters/${letter}.svg`}
                    alt={`Sign for letter ${letter}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-gray-700 font-medium text-sm">{letter}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Transcription */}
      <div
        className="w-full p-6 rounded-2xl min-h-[100px]"
        style={{ backgroundColor: '#f8f6f0' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">
            Live Recognition
          </span>
          {transcription && (
            <span className="text-xs text-gray-400">
              {transcription.length} characters
            </span>
          )}
        </div>
        <p className="text-2xl font-medium leading-relaxed font-mono whitespace-pre-wrap text-gray-800">
          {transcription || (
            <span className="text-gray-400 italic">
              {cameraReady
                ? isConnected
                  ? 'Start signing to see recognition...'
                  : 'Connect to begin...'
                : 'Waiting for camera...'}
            </span>
          )}
        </p>
      </div>

      {/* Cancel Button */}
      <button
        onClick={() => {
          disconnect();
          onCancel();
        }}
        className="text-gray-500 hover:text-gray-700 underline text-sm"
      >
        Cancel and go back
      </button>
    </div>
  );
}
