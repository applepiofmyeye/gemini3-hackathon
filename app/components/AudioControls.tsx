'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

// ============================================================
// AUDIO MANAGER
// ============================================================

const SOUNDTRACK_PATH = '/audio/soundtrack.mp3';
const MUTE_STORAGE_KEY = 'hands-on-track-audio-muted';

let audioInstance: HTMLAudioElement | null = null;
// Track whether background music should be playing (user intent)
let backgroundMusicDesired = false;

function getAudioInstance(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  if (!audioInstance) {
    audioInstance = new Audio(SOUNDTRACK_PATH);
    audioInstance.loop = true;
    audioInstance.volume = FULL_VOLUME; // Background music volume

    // Load mute preference
    const savedMute = localStorage.getItem(MUTE_STORAGE_KEY);
    if (savedMute === 'true') {
      audioInstance.muted = true;
    }
  }

  return audioInstance;
}

// Volume levels
const FULL_VOLUME = 0.24; // Normal background music volume (24%)
const DUCKED_VOLUME = 0.12; // Ducked volume during announcements (50% of normal)

// Global function to start music (called from Start button)
export async function startBackgroundMusic() {
  const audio = getAudioInstance();
  if (!audio) return;

  // Mark that music should be playing
  backgroundMusicDesired = true;

  // If page is hidden, don't try to play now - visibility handler will resume when visible
  if (typeof document !== 'undefined' && document.hidden) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AudioControls] Background music desired, will play when page becomes visible');
    }
    return;
  }

  try {
    await audio.play();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AudioControls] Background music started');
    }
  } catch (error) {
    console.error('[AudioControls] Failed to start music:', error);
    backgroundMusicDesired = false;
  }
}

/**
 * Duck the background music volume (lower to 50% of normal).
 * Used during announcement playback so TTS is more audible.
 */
export function duckBackgroundMusic() {
  const audio = getAudioInstance();
  if (!audio) return;
  audio.volume = DUCKED_VOLUME;
}

/**
 * Restore the background music volume to normal level.
 */
export function unduckBackgroundMusic() {
  const audio = getAudioInstance();
  if (!audio) return;
  audio.volume = FULL_VOLUME;
}

// ============================================================
// COMPONENT
// ============================================================

export default function AudioControls() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [useCustomIcons, setUseCustomIcons] = useState(true);

  // Initialize audio on mount
  useEffect(() => {
    const audio = getAudioInstance();
    if (!audio) return;

    audioRef.current = audio;

    // Event handlers
    const handleVolumeChange = () => setIsMuted(audio.muted);
    const handleError = (e: Event) => {
      console.error('[AudioControls] Audio error:', e);
      // Reset desired flag on error
      backgroundMusicDesired = false;
    };

    // Handle page visibility changes (screen off, tab switch, app background)
    const handleVisibilityChange = () => {
      const a = audioRef.current;
      if (!a) return;

      if (document.hidden) {
        // Page is now hidden - remember if audio was playing and pause it
        wasPlayingBeforeHiddenRef.current = !a.paused;
        if (wasPlayingBeforeHiddenRef.current) {
          a.pause();
        }
        // Note: backgroundMusicDesired flag is preserved - we want to resume when visible
      } else {
        // Page is now visible - resume if music should be playing and not muted
        if (backgroundMusicDesired && !a.muted) {
          a.play().catch((error) => {
            // Log for debugging but don't throw - autoplay restrictions are expected
            console.warn('[AudioControls] Failed to resume audio on visibility change:', error);
            // Reset flag since playback failed
            backgroundMusicDesired = false;
          });
        }
      }
    };

    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set ready after microtask
    queueMicrotask(() => {
      setIsMuted(audio.muted);
      setIsReady(true);
    });

    return () => {
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Don't pause on unmount - let it keep playing across pages
      // The audio instance persists as a module-level singleton
    };
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !audio.muted;
    audio.muted = newMuted;
    localStorage.setItem(MUTE_STORAGE_KEY, String(newMuted));
  }, []);

  // Handle image load error - fallback to SVG icons
  const handleImageError = useCallback(() => {
    setUseCustomIcons(false);
  }, []);

  // Don't render until client-side
  if (!isReady) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Mute/Unmute Button */}
      <button
        onClick={handleToggleMute}
        className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 border-2 border-gray-200 overflow-hidden"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {useCustomIcons ? (
          <Image
            src={isMuted ? '/icons/mute.jpeg' : '/icons/unmute.jpeg'}
            alt={isMuted ? 'Unmute' : 'Mute'}
            width={48}
            height={48}
            className="w-full h-full object-contain"
            onError={handleImageError}
          />
        ) : (
          // Fallback SVG icons
          <>
            {isMuted ? (
              // Muted icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-red-500"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
            ) : (
              // Unmuted icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-6 h-6 text-gray-600"
              >
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            )}
          </>
        )}
      </button>
    </div>
  );
}
