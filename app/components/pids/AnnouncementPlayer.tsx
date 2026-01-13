'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Radio } from 'lucide-react';
import { audioToObjectUrl } from '@/lib/utils/audio';
import { duckBackgroundMusic, unduckBackgroundMusic } from '@/app/components/AudioControls';

/**
 * AnnouncementPlayer - TTS audio playback with visual indicator.
 *
 * Light-themed player with announcement message and audio controls.
 * Handles audio playback with background music ducking.
 * Respects page visibility (pauses when tab is inactive).
 */

interface AnnouncementPlayerProps {
  /** Base64-encoded audio data */
  audioBase64?: string;
  /** Audio MIME type */
  audioMimeType?: string;
  /** The announcement message text (Singlish) */
  message: string;
  /** Phonetic pronunciation (optional) */
  phonetic?: string;
  /** Whether to auto-play on mount */
  autoPlay?: boolean;
  /** Callback when audio finishes playing */
  onPlayComplete?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

export default function AnnouncementPlayer({
  audioBase64,
  audioMimeType,
  message,
  phonetic,
  autoPlay = true,
  onPlayComplete,
  className = '',
}: AnnouncementPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const wasPlayingBeforeHiddenRef = useRef(false);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioBase64) {
      onPlayComplete?.();
      return;
    }

    // Don't try to play if page is hidden
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    try {
      setIsPlaying(true);
      setAudioError(null);
      setAutoplayBlocked(false);

      cleanupAudio();

      // Duck background music during announcement
      duckBackgroundMusic();

      const dataUrl = audioToObjectUrl(audioBase64, audioMimeType);
      audioUrlRef.current = dataUrl;
      const audio = new Audio(dataUrl);
      audioRef.current = audio;

      audio.onended = () => {
        unduckBackgroundMusic();
        cleanupAudio();
        setIsPlaying(false);
        onPlayComplete?.();
      };

      audio.onerror = () => {
        unduckBackgroundMusic();
        cleanupAudio();
        setIsPlaying(false);
        setAudioError('Failed to decode audio');
        onPlayComplete?.();
      };

      await audio.play();
    } catch (error) {
      console.error('[AnnouncementPlayer] Audio playback error:', error);

      unduckBackgroundMusic();

      if (error instanceof Error && error.name === 'NotAllowedError') {
        setIsPlaying(false);
        setAutoplayBlocked(true);
        return;
      }

      cleanupAudio();
      setIsPlaying(false);
      setAudioError('Audio playback failed');
      onPlayComplete?.();
    }
  }, [audioBase64, audioMimeType, cleanupAudio, onPlayComplete]);

  const handleManualPlay = useCallback(async () => {
    if (!audioRef.current) {
      if (audioBase64) {
        const dataUrl = audioToObjectUrl(audioBase64, audioMimeType);
        audioUrlRef.current = dataUrl;
        audioRef.current = new Audio(dataUrl);

        audioRef.current.onended = () => {
          unduckBackgroundMusic();
          cleanupAudio();
          setIsPlaying(false);
          onPlayComplete?.();
        };

        audioRef.current.onerror = () => {
          unduckBackgroundMusic();
          cleanupAudio();
          setIsPlaying(false);
          setAudioError('Failed to decode audio');
          onPlayComplete?.();
        };
      }
    }

    if (audioRef.current) {
      try {
        duckBackgroundMusic();
        setAutoplayBlocked(false);
        setIsPlaying(true);
        await audioRef.current.play();
      } catch (err) {
        console.error('[AnnouncementPlayer] Manual play failed:', err);
        unduckBackgroundMusic();
        setAudioError('Audio playback failed');
        setIsPlaying(false);
      }
    }
  }, [audioBase64, audioMimeType, cleanupAudio, onPlayComplete]);

  // Handle page visibility changes - pause/resume TTS like background music
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        // Page is now hidden - remember if audio was playing and pause it
        wasPlayingBeforeHiddenRef.current = !audio.paused;
        if (wasPlayingBeforeHiddenRef.current) {
          audio.pause();
        }
      } else {
        // Page is now visible - resume if it was playing before
        if (wasPlayingBeforeHiddenRef.current && audio.paused) {
          audio.play().catch((error) => {
            console.warn(
              '[AnnouncementPlayer] Failed to resume audio on visibility change:',
              error
            );
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (!autoPlay) return;

    const timer = setTimeout(() => {
      playAudio();
    }, 300);

    return () => {
      clearTimeout(timer);
      unduckBackgroundMusic();
      cleanupAudio();
    };
  }, [autoPlay, cleanupAudio, playAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unduckBackgroundMusic();
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <div
      className={`
        bg-white/90 backdrop-blur border border-gray-200 rounded-xl p-4 shadow-sm
        ${className}
      `}
    >
      {/* Header with playing indicator - fixed height to prevent layout shift */}
      <div className="flex items-center gap-3 mb-3 min-h-[40px]">
        <span
          className={`
            inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0
            ${isPlaying ? 'bg-green-100' : 'bg-gray-100'}
            transition-colors
          `}
        >
          {isPlaying ? (
            <Radio className="w-5 h-5 text-green-600 animate-pulse" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-500" />
          )}
        </span>
        <div className="flex-1 min-h-[36px] flex flex-col justify-center">
          <h3 className="text-sm font-medium text-gray-800">
            {isPlaying ? 'Now Announcing...' : 'Station Announcement'}
          </h3>
          {/* Always reserve space for the "Playing" indicator */}
          <div className="h-4 flex items-center">
            {isPlaying && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Playing
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="bg-[#004D44] rounded-lg px-4 py-3 mb-3">
        <p className="text-white italic text-center">&ldquo;{message}&rdquo;</p>
        {phonetic && (
          <p className="text-gray-300 text-sm text-center mt-1">
            Pronounced: &ldquo;{phonetic}&rdquo;
          </p>
        )}
      </div>

      {/* Controls - fixed height container to prevent layout shift */}
      <div className="h-10 flex gap-2">
        {/* Autoplay blocked - show play button */}
        {autoplayBlocked && (
          <button
            onClick={handleManualPlay}
            className="flex-1 rounded-lg font-medium flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            Tap to play
          </button>
        )}

        {/* Replay button (when not playing and not blocked) */}
        {!isPlaying && !autoplayBlocked && audioBase64 && (
          <button
            onClick={handleManualPlay}
            className="flex-1 rounded-lg font-medium flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            Replay
          </button>
        )}

        {/* Playing state - show disabled indicator */}
        {isPlaying && (
          <div className="flex-1 rounded-lg flex items-center justify-center gap-2 bg-green-50 text-green-600 border border-green-200">
            <Radio className="w-4 h-4 animate-pulse" />
            Playing...
          </div>
        )}

        {/* No audio available */}
        {!audioBase64 && (
          <div className="flex-1 rounded-lg flex items-center justify-center gap-2 bg-gray-100 text-gray-400">
            <VolumeX className="w-4 h-4" />
            No audio
          </div>
        )}
      </div>

      {/* Error message - only rendered when there's an error */}
      {audioError && (
        <div className="mt-2 text-center text-xs text-red-600 bg-red-50 rounded-lg py-2 border border-red-100">
          {audioError}
        </div>
      )}
    </div>
  );
}
