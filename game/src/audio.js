// Tiny WebAudio synth: engine hum, gunshot clicks, radio loops, UI blips.
// Everything is generated — no audio files, no network.
export class GameAudio {
  constructor() { this.ctx = null; this.radioNodes = null; this.engineOsc = null; }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  blip(freq = 660, dur = 0.07, type = 'square', gain = 0.05) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur);
  }
  shot(auto) { this.blip(auto ? 190 : 150, 0.09, 'sawtooth', 0.09); }
  cash() { this.blip(880, 0.09, 'square', 0.06); setTimeout(() => this.blip(1320, 0.12, 'square', 0.06), 70); }
  setEngine(on, speedRatio = 0) {
    if (!this.ctx) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      const g = this.ctx.createGain(); g.gain.value = 0.03;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.connect(g).connect(this.ctx.destination);
      this.engineGain = g; this.engineOsc.start();
    }
    if (!on && this.engineOsc) { try { this.engineOsc.stop(); } catch { /* already stopped */ } this.engineOsc = null; }
    if (this.engineOsc) this.engineOsc.frequency.value = 55 + speedRatio * 130;
  }
  setRadio(station) {
    this.stopRadio();
    if (!this.ctx || !station) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = station.wave; o.frequency.value = station.hz;
    g.gain.value = 0.018;
    o.connect(g).connect(this.ctx.destination); o.start();
    this.radioNodes = { o, g };
  }
  stopRadio() { if (this.radioNodes) { try { this.radioNodes.o.stop(); } catch { /* ignore */ } this.radioNodes = null; } }
}
