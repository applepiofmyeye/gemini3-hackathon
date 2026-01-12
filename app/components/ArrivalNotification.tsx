'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PartyPopper, Siren, TrainFront, X } from 'lucide-react';
import { pcmToDataUrl } from '@/lib/utils/audio';

// ============================================================
// TYPES
// ============================================================

export type ArrivalScenario = 'crash' | 'delayed' | 'safe';

interface ArrivalNotificationProps {
  scenario: ArrivalScenario;
  message: string;
  recognizedWord: string; // What user signed (e.g., "BYSHAT")
  phonetic?: string; // How it will be pronounced (e.g., "Bee-Shat")
  targetWord: string; // Expected word (e.g., "Bishan")
  audioBase64?: string; // PCM audio data from Gemini TTS
  onDismiss: () => void;
  onAudioEnd?: () => void;
}

// ============================================================
// SCENARIO CONFIG
// ============================================================

const SCENARIO_CONFIG = {
  crash: {
    title: 'TRAIN CRASHED',
    bgColor: 'bg-red-600',
    borderColor: 'border-red-800',
    textColor: 'text-white',
    subtitleColor: 'text-red-100',
    Icon: Siren,
  },
  delayed: {
    title: 'DELAYED ARRIVAL',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-700',
    textColor: 'text-black',
    subtitleColor: 'text-amber-900',
    Icon: TrainFront,
  },
  safe: {
    title: 'ARRIVED SAFELY',
    bgColor: 'bg-green-600',
    borderColor: 'border-green-800',
    textColor: 'text-white',
    subtitleColor: 'text-green-100',
    Icon: PartyPopper,
  },
};

// ============================================================
// COMPONENT
// ============================================================

export default function ArrivalNotification({
  scenario,
  message,
  recognizedWord,
  phonetic,
  targetWord,
  audioBase64,
  onDismiss,
  onAudioEnd,
}: ArrivalNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
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

  // Play audio when component mounts
  const playAudio = useCallback(async () => {
    if (!audioBase64) {
      onAudioEnd?.();
      return;
    }

    try {
      setIsPlaying(true);
      setAudioError(null);

      cleanupAudio();

      const dataUrl = pcmToDataUrl(audioBase64);
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
        setAudioError('Failed to play audio');
        onAudioEnd?.();
      };

      await audio.play();
    } catch (error) {
      console.error('[ArrivalNotification] Audio playback error:', error);
      cleanupAudio();
      setIsPlaying(false);
      setAudioError('Audio playback failed');
      onAudioEnd?.();
    }
  }, [audioBase64, cleanupAudio, onAudioEnd]);

  // Animate in and play audio on mount
  useEffect(() => {
    // Small delay for entrance animation
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Play audio after visible
    const audioTimer = setTimeout(() => {
      playAudio();
    }, 500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(audioTimer);
      cleanupAudio();
    };
  }, [cleanupAudio, playAudio]);

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={onDismiss}
    >
      {/* Notification Card */}
      <div
        className={`
          relative mx-4 w-full max-w-md
          ${config.bgColor} ${config.borderColor}
          border-4 rounded-2xl shadow-2xl
          transform transition-all duration-500 ease-out
          ${isVisible ? 'translate-y-0 scale-100' : '-translate-y-8 scale-95'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/20 ${config.textColor}`}
              aria-hidden="true"
            >
              <HeaderIcon className="w-7 h-7" />
            </span>
            <div>
              <h2 className={`text-xl font-bold ${config.textColor}`}>{config.title}</h2>
              {isPlaying && (
                <div className={`text-sm ${config.subtitleColor} flex items-center gap-2`}>
                  <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse" />
                  Playing announcement...
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${config.textColor} hover:bg-white/20 transition-colors
            `}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pt-2 space-y-3">
          {/* What user signed */}
          <div className="bg-white/20 rounded-xl p-3">
            <div className={`text-xs uppercase tracking-wider ${config.subtitleColor} mb-1`}>
              You signed
            </div>
            <div className={`text-2xl font-bold font-mono ${config.textColor}`}>
              {recognizedWord}
            </div>
          </div>

          {/* Phonetic pronunciation (for delayed scenario) */}
          {phonetic && scenario === 'delayed' && (
            <div className="bg-white/20 rounded-xl p-3">
              <div className={`text-xs uppercase tracking-wider ${config.subtitleColor} mb-1`}>
                Pronounced as
              </div>
              <div className={`text-xl font-bold ${config.textColor}`}>
                &ldquo;{phonetic}&rdquo;
              </div>
            </div>
          )}

          {/* Target (for safe scenario) */}
          {scenario === 'safe' && (
            <div className="bg-white/20 rounded-xl p-3">
              <div className={`text-xs uppercase tracking-wider ${config.subtitleColor} mb-1`}>
                Station
              </div>
              <div className={`text-2xl font-bold ${config.textColor}`}>{targetWord}</div>
            </div>
          )}

          {/* Message */}
          <div className={`text-center py-2 ${config.textColor} text-lg`}>
            <span className="italic">&ldquo;{message}&rdquo;</span>
          </div>

          {/* Audio error */}
          {audioError && (
            <div className="text-center text-sm text-red-200 bg-red-900/30 rounded-lg p-2">
              {audioError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 pt-0">
          <button
            onClick={onDismiss}
            className={`
              w-full py-3 rounded-xl font-bold
              bg-white/20 hover:bg-white/30
              ${config.textColor}
              transition-all active:scale-98
            `}
          >
            {isPlaying ? 'Skip' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
