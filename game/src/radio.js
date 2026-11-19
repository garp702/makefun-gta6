// CarRadio: four original Serena Bay stations, all synthesized live. Each one
// runs a little step sequencer — bass line, lead notes, a hat tick — with its own
// scale, tempo and wave, so SOLANA FM's sunshine pop never sounds like NIGHT TIDE's
// slow synth. The radio only plays while Kai is in a car; R spins the dial.

import { GameAudio } from './audio.js';

export const STATIONS = [
  { name: 'SOLANA FM', tag: 'sunshine pop', tempo: 0.21, wave: 'triangle', bass: [110, 0, 110, 0, 131.8, 0, 98, 0], lead: [440, 523.3, 659.3, 523.3, 587.3, 440, 392, 440] },
  { name: 'PALM WAVE 98.2', tag: 'yacht funk', tempo: 0.24, wave: 'square', bass: [98, 98, 0, 98, 123.5, 0, 146.8, 0], lead: [392, 0, 493.9, 587.3, 0, 493.9, 440, 0] },
  { name: 'CANAL TALK', tag: 'all talk, all day', tempo: 0.3, wave: 'sine', bass: [82.4, 0, 0, 0, 82.4, 0, 0, 0], lead: [220, 233, 220, 196, 220, 0, 185, 196] },
  { name: 'NIGHT TIDE FM', tag: 'after-dark synth', tempo: 0.27, wave: 'sawtooth', bass: [55, 0, 55, 65.4, 0, 55, 0, 49], lead: [220, 261.6, 329.6, 261.6, 196, 220, 164.8, 196] },
];

export class CarRadio {
  constructor(audio) {
    this.audio = audio;
    this.index = 0;
    this.playing = false;
    this.step = 0;
    this.timer = 0;
  }

  get station() { return STATIONS[this.index]; }
  get stationName() { return this.station.name; }

  next() {
    this.index = (this.index + 1) % STATIONS.length;
    this.step = 0;
    this.audio.click();
    return this.station;
  }

  setPlaying(on) { this.playing = on; }

  update(dt) {
    if (!this.playing || !this.audio.ctx) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const st = this.station;
    this.timer = st.tempo;
    const i = this.step % 8;
    this.step++;
    const bass = st.bass[i];
    const lead = st.lead[i];
    if (bass) this.audio.blip(bass, st.tempo * 0.95, 'sine', 0.075);
    if (lead) this.audio.blip(lead, st.tempo * 0.8, st.wave, 0.032);
    if (i % 2 === 0) this.audio.noise(0.02, 0.008, 7000);
  }
}
