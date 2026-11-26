// A tiny sound synth (WebAudio, no files): a chime for rings, a blip for fuel,
// a thud for hits. The context is made on the first user gesture; everything is
// guarded, so a browser without audio, or a headless run, stays silent.
export function createAudio() {
  let context = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, when, length, type, gain) {
    const ctx = ensure();
    if (ctx === null) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, ctx.currentTime + when);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + length);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + length);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Unlock audio on a gesture (call from a key or pointer handler). */
    unlock() {
      ensure();
    },
    ring() {
      tone(659, 0, 0.16, 'sine', 0.16);
      tone(988, 0.09, 0.22, 'sine', 0.14);
    },
    can() {
      tone(880, 0, 0.1, 'square', 0.07);
      tone(1175, 0.07, 0.12, 'square', 0.06);
    },
    hit() {
      tone(110, 0, 0.28, 'sawtooth', 0.18);
      tone(55, 0.05, 0.3, 'sawtooth', 0.14);
    },
    click() {
      tone(520, 0, 0.06, 'sine', 0.08);
    },
  };
}
