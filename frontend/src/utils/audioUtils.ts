// Shared AudioContext instance to satisfy browser autoplay policies
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtxClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (_) {
    return null;
  }
}

/**
 * Prime audio context on user interaction (e.g. click "Start camera")
 */
export function primeAudioContext() {
  getAudioContext();
}

/**
 * Realistic camera shutter sound (mechanical snap click)
 */
export function playCameraShutterSound() {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    const t0 = audioCtx.currentTime;

    // 1. Initial mechanical click
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1200, t0);
    osc1.frequency.exponentialRampToValueAtTime(320, t0 + 0.05);
    gain1.gain.setValueAtTime(0.5, t0);
    gain1.gain.exponentialRampToValueAtTime(0.01, t0 + 0.05);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.05);

    // 2. Main shutter snap
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(800, t0 + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(160, t0 + 0.14);
    gain2.gain.setValueAtTime(0.65, t0 + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t0 + 0.04);
    osc2.stop(t0 + 0.15);
  } catch (_) {}
}

/**
 * Distinct countdown tick beeps (5, 4, 3, 2, 1)
 */
export function playCountdownTickSound(isFinal = false) {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (isFinal) {
      // High pitch distinct double beep for final second (1s or last tick)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, t0);
      osc.frequency.setValueAtTime(1350, t0 + 0.06);
      gain.gain.setValueAtTime(0.45, t0);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.16);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    } else {
      // Clear energetic beep on each countdown tick (5, 4, 3, 2)
      osc.type = "sine";
      osc.frequency.setValueAtTime(850, t0);
      gain.gain.setValueAtTime(0.38, t0);
      gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.11);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.11);
    }
  } catch (_) {}
}
