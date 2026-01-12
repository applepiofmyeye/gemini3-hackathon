'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PartyPopper, Siren, TrainFront, Volume2 } from 'lucide-react';
import Toast from './ui/Toast';
import { audioToObjectUrl } from '@/lib/utils/audio';

// ============================================================
// TYPES
// ============================================================

export type ArrivalScenario = 'crash' | 'delayed' | 'safe';

interface ArrivalToastProps {
  scenario: ArrivalScenario;
  message: string;
  recognizedWord: string; // What user signed (e.g., "BYSHAT")
  phonetic?: string; // How it will be pronounced (e.g., "Bee-Shat")
  targetWord: string; // Expected word (e.g., "Bishan")
  audioBase64?: string; // Audio data from Gemini TTS
  audioMimeType?: string; // Audio mime type (e.g., "audio/L16;rate=24000")
  onDismiss: () => void;
  onAudioEnd?: () => void;
}

// ============================================================
// SCENARIO CONFIG
// Fixed MRT signage palette - does NOT change with line colors
// ============================================================

const SCENARIO_CONFIG = {
  crash: {
    title: 'TRAIN CRASHED',
    variant: 'error' as const,
    Icon: Siren,
    iconBg: 'bg-red-800/50',
  },
  delayed: {
    title: 'DELAYED ARRIVAL',
    variant: 'warning' as const,
    Icon: TrainFront,
    iconBg: 'bg-amber-600/50',
  },
  safe: {
    title: 'ARRIVED SAFELY',
    variant: 'success' as const,
    Icon: PartyPopper,
    iconBg: 'bg-green-800/50',
  },
};

// ============================================================
// COMPONENT
// ============================================================

/**
 * Arrival Toast - A playful MRT-themed notification for game results.
 *
 * Shows scenario-based content (crash/delayed/safe) with audio playback.
 * Uses fixed MRT signage palette (scenario-based only), not line colors.
 */
export default function ArrivalToast({
  scenario,
  message,
  recognizedWord,
  phonetic,
  targetWord,
  audioBase64,
  audioMimeType,
  onDismiss,
  onAudioEnd,
}: ArrivalToastProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const config = SCENARIO_CONFIG[scenario];
  const HeaderIcon = config.Icon;

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // Play audio
  const playAudio = useCallback(async () => {
    if (!audioBase64) {
      onAudioEnd?.();
      return;
    }

    try {
      setIsPlaying(true);
      setAudioError(null);
      setAutoplayBlocked(false);

      cleanupAudio();

      const dataUrl = audioToObjectUrl(audioBase64, audioMimeType);
      audioUrlRef.current = dataUrl;
      const audio = new Audio(dataUrl);
      audioRef.current = audio;

      audio.onended = () => {
        cleanupAudio();
        setIsPlaying(false);
        onAudioEnd?.();
      };

      audio.onerror = () => {
        cleanupAudio();
        setIsPlaying(false);
        setAudioError('Failed to decode audio');
        onAudioEnd?.();
      };

      await audio.play();
    } catch (error) {
      console.error('[ArrivalToast] Audio playback error:', error);

      // Check if this is an autoplay block (NotAllowedError)
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setIsPlaying(false);
        setAutoplayBlocked(true);
        // Don't cleanup audio - keep it ready for manual play
        return;
      }

      cleanupAudio();
      setIsPlaying(false);
      setAudioError('Audio playback failed');
      onAudioEnd?.();
    }
  }, [audioBase64, audioMimeType, cleanupAudio, onAudioEnd]);

  // Manual play handler for when autoplay is blocked
  const handleManualPlay = useCallback(async () => {
    if (!audioRef.current) {
      // Recreate audio if it was cleaned up
      if (audioBase64) {
        const dataUrl = audioToObjectUrl(audioBase64, audioMimeType);
        audioUrlRef.current = dataUrl;
        audioRef.current = new Audio(dataUrl);

        audioRef.current.onended = () => {
          cleanupAudio();
          setIsPlaying(false);
          onAudioEnd?.();
        };

        audioRef.current.onerror = () => {
          cleanupAudio();
          setIsPlaying(false);
          setAudioError('Failed to decode audio');
          onAudioEnd?.();
        };
      }
    }

    if (audioRef.current) {
      try {
        setAutoplayBlocked(false);
        setIsPlaying(true);
        await audioRef.current.play();
      } catch (err) {
        console.error('[ArrivalToast] Manual play failed:', err);
        setAudioError('Audio playback failed');
        setIsPlaying(false);
      }
    }
  }, [audioBase64, audioMimeType, cleanupAudio, onAudioEnd]);

  // Play audio on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio();
    }, 300); // Small delay after toast animation

    return () => {
      clearTimeout(timer);
      cleanupAudio();
    };
  }, [cleanupAudio, playAudio]);

  return (
    <Toast variant={config.variant} position="top-right" isVisible={true} onDismiss={onDismiss}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${config.iconBg}`}
          aria-hidden="true"
        >
          <HeaderIcon className="w-6 h-6" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm tracking-wide">{config.title}</h3>
          {isPlaying && (
            <div className="text-xs opacity-80 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
              Playing...
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 text-sm">
        {/* What user signed */}
        <div className="bg-black/20 rounded-lg px-3 py-2">
          <div className="text-xs uppercase tracking-wider opacity-70 mb-0.5">You signed</div>
          <div className="font-bold font-mono text-lg">{recognizedWord}</div>
        </div>

        {/* Phonetic pronunciation (for delayed scenario) */}
        {phonetic && scenario === 'delayed' && (
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <div className="text-xs uppercase tracking-wider opacity-70 mb-0.5">Pronounced as</div>
            <div className="font-bold">&ldquo;{phonetic}&rdquo;</div>
          </div>
        )}

        {/* Target (for safe scenario) */}
        {scenario === 'safe' && (
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <div className="text-xs uppercase tracking-wider opacity-70 mb-0.5">Station</div>
            <div className="font-bold text-lg">{targetWord}</div>
          </div>
        )}

        {/* Message */}
        <div className="text-center py-1 italic opacity-90">&ldquo;{message}&rdquo;</div>

        {/* Autoplay blocked - show play button */}
        {autoplayBlocked && (
          <button
            onClick={handleManualPlay}
            className="w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            Tap to play
          </button>
        )}

        {/* Audio error */}
        {audioError && (
          <div className="text-center text-xs bg-black/20 rounded-lg py-1.5 px-2">{audioError}</div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 mt-3">
        {/* Replay button */}
        {!isPlaying && !autoplayBlocked && audioBase64 && (
          <button
            onClick={handleManualPlay}
            className="px-3 py-2 rounded-lg font-medium flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Replay announcement"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onDismiss}
          className="flex-1 py-2 rounded-lg font-medium bg-white/20 hover:bg-white/30 transition-colors"
        >
          {isPlaying ? 'Skip' : 'Continue'}
        </button>
      </div>
    </Toast>
  );
}
