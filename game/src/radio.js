// Four original Serena Bay stations. R cycles; the HUD always shows the
// current name. Radio only plays while the player sits in a car.
export const STATIONS = [
  { name: 'SOLANA FM', tag: 'bay classics & sunsets', hz: 220, wave: 'triangle' },
  { name: 'PALM WAVE 98.2', tag: 'dance from the boulevard', hz: 262, wave: 'square' },
  { name: 'CANAL TALK', tag: 'harbour news & call-ins', hz: 175, wave: 'sine' },
  { name: 'NIGHT TIDE FM', tag: 'slow songs for fast drivers', hz: 196, wave: 'triangle' },
];
export class Radio {
  constructor(audio) { this.audio = audio; this.index = 0; this.on = false; }
  current() { return this.on ? STATIONS[this.index] : null; }
  label() { const s = this.current(); return s ? `♪ ${s.name} — ${s.tag}` : 'RADIO OFF'; }
  start() { this.on = true; this.audio.setRadio(STATIONS[this.index]); }
  stop() { this.on = false; this.audio.stopRadio(); }
  cycle() {
    if (!this.on) { this.start(); return this.label(); }
    this.index = (this.index + 1) % STATIONS.length;
    this.audio.setRadio(STATIONS[this.index]);
    return this.label();
  }
}
