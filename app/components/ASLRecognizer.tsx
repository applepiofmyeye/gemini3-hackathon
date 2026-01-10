'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Types for the Gemini Live API messages
type LiveIncomingMessage = {
  serverContent?: {
    modelTurn?: {
      parts?: { text?: string }[];
    };
  };
};

export default function ASLRecognizer({ apiKey }: { apiKey: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    startCamera();
  }, []);

  const connect = useCallback(() => {
    if (!apiKey) {
      alert('Please enter a valid API Key');
      return;
    }

    // Gemini 2.0 Flash Live API URL
    // We use the simpler "ws" endpoint for direct connection if available,
    // or standard /generative-language...
    // The pattern is: wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=API_KEY
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('Connected to Gemini Live');
      setIsConnected(true);

      // Send setup message
      const setupMsg = {
        setup: {
          model: 'models/gemini-2.5-flash-preview-05-20',
          generationConfig: {
            responseModalities: ['TEXT'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: 'You are an expert ASL (American Sign Language) translator. Your task is to transcribe the hand gestures in the video stream into text. Output only the translation. If it is a letter, output the letter. If it is a word, output the word. Do not hallucinate. If no clear gesture is seen, output nothing or wait.',
              },
            ],
          },
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = (event) => {
      // Blob to text if needed, but usually text frames
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
          console.error('Error parsing message', e);
        }
      };
      parseMessage(event.data);
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    setSocket(ws);
  }, [apiKey]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  }, [socket]);

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

        // Draw video frame to canvas
        canvas.width = video.videoWidth / 2; // Downscale for bandwidth
        canvas.height = video.videoHeight / 2;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get Base64 JPEG
        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

        // Send to Gemini
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
      }, 200); // 5 FPS
    }

    return () => clearInterval(intervalId);
  }, [isConnected, isStreaming, socket]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="w-full flex justify-between items-center bg-gray-900/50 p-4 rounded-xl backdrop-blur-sm border border-white/10">
        <h2 className="text-xl font-semibold text-white">ASL Recognizer</h2>
        {!isConnected ? (
          <button
            onClick={connect}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
        />
        {/* Helper canvas for frame extraction (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
          <span className="text-xs font-mono text-white/80">
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {isConnected && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`px-6 py-2 rounded-full font-medium transition-all transform hover:scale-105 active:scale-95 ${
                isStreaming
                  ? 'bg-red-500/90 text-white hover:bg-red-600'
                  : 'bg-white/90 text-black hover:bg-white'
              }`}
            >
              {isStreaming ? 'Stop Stream' : 'Start Stream'}
            </button>
          </div>
        )}
      </div>

      <div className="w-full p-6 bg-gray-900/50 rounded-2xl backdrop-blur-md border border-white/10 min-h-[150px]">
        <h3 className="text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">
          Transcription
        </h3>
        <p className="text-2xl text-white font-medium leading-relaxed font-mono whitespace-pre-wrap">
          {transcription || <span className="text-gray-600 italic">Waiting for gestures...</span>}
        </p>
      </div>
    </div>
  );
}
