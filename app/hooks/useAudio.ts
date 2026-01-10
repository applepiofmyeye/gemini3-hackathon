'use client';

// ============================================================
// TYPES
// ============================================================

type SoundEffect = 'countdown' | 'correct' | 'wrong';

// ============================================================
// STORAGE KEY
// ============================================================

const MUTE_STORAGE_KEY = 'hands-on-track-audio-muted';

// ============================================================
// WEB AUDIO API SOUND GENERATION
// ============================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
  }
  return audioContext;
}

/**
 * Play a countdown beep - short, crisp tick sound
 */
function playCountdownBeep(volume: number = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Create oscillator for the beep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Short, punchy beep at 880Hz (A5)
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);

  // Quick envelope for a tick sound
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * 0.6, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play a correct/success sound - ascending chime
 */
function playCorrectSound(volume: number = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Play two ascending notes for a pleasant "ding ding"
  const frequencies = [523.25, 783.99]; // C5, G5 - perfect fifth

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const startTime = now + i * 0.1;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/**
 * Play a wrong/error sound - low descending tone
 */
function playWrongSound(volume: number = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Low, descending "buzz" sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Check if audio is muted
 */
function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
}

/**
 * Play a sound effect (countdown beep, correct chime, wrong buzz)
 */
export function playGlobalSfx(effect: SoundEffect) {
  if (isMuted()) return;

  switch (effect) {
    case 'countdown':
      playCountdownBeep(0.5);
      break;
    case 'correct':
      playCorrectSound(0.5);
      break;
    case 'wrong':
      playWrongSound(0.5);
      break;
  }
}
