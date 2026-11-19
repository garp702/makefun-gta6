// GameAudio: every sound in Bayline City is synthesized with WebAudio — no audio
// files. One lazy AudioContext (created on the first user gesture), a master gain,
// continuous engine and siren loops whose pitch follows the action, and one-shot
// voices for shots, pickups, cash and rank-ups. Everything fails silently if the
// browser has no audio, so headless runs stay error-free.

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenLfo = null;
  }

  resume() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
        this.startLoops();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* no audio in this browser */ }
  }

  startLoops() {
    const ctx = this.ctx;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 320;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineOsc.connect(engineFilter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();

    this.sirenOsc = ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 1050;
    this.sirenLfo = ctx.createOscillator();
    this.sirenLfo.frequency.value = 0.55;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 330;
    this.sirenLfo.connect(lfoGain).connect(this.sirenOsc.frequency);
    this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain).connect(this.master);
    this.sirenOsc.start(); this.sirenLfo.start();
  }

  engineSet(inCar, speedNorm) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(inCar ? 0.028 + speedNorm * 0.03 : 0, t, 0.12);
    this.engineOsc.frequency.setTargetAtTime(52 + speedNorm * 105, t, 0.1);
  }

  sirenSet(active, nearestDist) {
    if (!this.ctx || !this.sirenGain) return;
    const t = this.ctx.currentTime;
    const vol = active ? Math.max(0, 0.05 - nearestDist * 0.0006) : 0;
    this.sirenGain.gain.setTargetAtTime(vol, t, 0.25);
  }

  blip(freq, dur, type = 'square', vol = 0.08, when = 0) {
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  noise(dur, vol, freq = 1800) {
    if (!this.ctx) return;
    try {
      const ctx = this.ctx;
      const len = Math.max(1, (ctx.sampleRate * dur) | 0);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buffer;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
      const gain = ctx.createGain(); gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
    } catch { /* ignore */ }
  }

  click() { this.blip(660, 0.06, 'square', 0.05); }
  shot(kind) {
    if (kind === 'scatter') { this.noise(0.22, 0.32, 900); this.blip(90, 0.16, 'sine', 0.22); }
    else if (kind === 'rifle') { this.noise(0.3, 0.3, 1400); this.blip(70, 0.22, 'sine', 0.2); }
    else if (kind === 'smg') { this.noise(0.07, 0.18, 2200); }
    else if (kind === 'fists') { this.noise(0.06, 0.1, 500); }
    else { this.noise(0.11, 0.24, 1600); this.blip(120, 0.08, 'sine', 0.12); }
  }
  pickup() { this.blip(520, 0.09, 'sine', 0.1); this.blip(780, 0.12, 'sine', 0.1, 0.07); }
  cash() { this.blip(990, 0.07, 'square', 0.07); this.blip(1320, 0.1, 'square', 0.07, 0.06); this.noise(0.05, 0.05, 4000); }
  rankUp() { [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.16, 'triangle', 0.11, i * 0.09)); }
  busted() { [392, 330, 262].forEach((f, i) => this.blip(f, 0.22, 'sawtooth', 0.06, i * 0.14)); }
  hurt() { this.blip(140, 0.12, 'sawtooth', 0.1); }
}
