'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export default function ASLRecognizer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640,
            height: 480
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatusMessage('Camera ready');
      } catch (error) {
        console.error('Error accessing camera:', error);
        setStatusMessage('Camera access denied');
      }
    };

    startCamera();
  }, []);

  const connect = useCallback(() => {
    try {
      setStatusMessage('Connecting...');
      
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('Connected to backend');
        setIsConnected(true);
        setStatusMessage('Connected');
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'text') {
            // Append recognized letter(s) to transcription
            setTranscription(prev => prev + data.content);
          } else if (data.type === 'error') {
            setStatusMessage(`Error: ${data.message}`);
            console.error('Backend error:', data.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatusMessage('Connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Disconnected from backend');
        setIsConnected(false);
        setIsStreaming(false);
        setStatusMessage('Disconnected');
        wsRef.current = null;
      };

    } catch (error) {
      console.error('Connection error:', error);
      setStatusMessage(`Connection failed: ${error}`);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  // Frame processing loop - sends frames to backend via WebSocket
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isConnected && isStreaming && videoRef.current && canvasRef.current && wsRef.current) {
      intervalId = setInterval(() => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Draw video frame to canvas at reduced resolution
        canvas.width = 320; // 320x240 for bandwidth efficiency
        canvas.height = 240;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get Base64 JPEG (0.6 quality for bandwidth)
        const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

        // Send frame to backend via WebSocket
        try {
          ws.send(JSON.stringify({
            type: 'frame',
            image: base64Data
          }));
        } catch (error) {
          console.error('Error sending frame:', error);
        }

      }, 1000); // 1 FPS as recommended by Gemini docs
    }

    return () => clearInterval(intervalId);
  }, [isConnected, isStreaming]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="w-full flex justify-between items-center bg-gray-900/50 p-4 rounded-xl backdrop-blur-sm border border-white/10">
        <div>
          <h2 className="text-xl font-semibold text-white">ASL Recognizer</h2>
          <p className="text-xs text-gray-400 font-mono">{statusMessage}</p>
        </div>
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
          className="w-full h-full object-cover transform scale-x-[-1]"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-mono text-white/80">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
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
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-mono text-gray-400 uppercase tracking-wider">Transcription</h3>
          {transcription && (
            <button 
              onClick={() => setTranscription('')}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-2xl text-white font-medium leading-relaxed font-mono whitespace-pre-wrap">
          {transcription || <span className="text-gray-600 italic">Waiting for gestures...</span>}
        </p>
      </div>
    </div>
  );
}
