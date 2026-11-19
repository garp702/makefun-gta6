// WeaponDefinitions + WeaponArsenal: the five ways Kai Mercer settles an argument.
// Fists are free, the Pelican 9 and the Breaker Scattergun are his own iron, and the
// Marlin-9 and Longshot only come out once the street respects him. The arsenal owns
// magazines, reserve ammo, reload timing and lock checks; the HUD wheel reads it.

export const WEAPONS = [
  { slot: 1, id: 'fists', name: 'Fists', kind: 'fists', damage: 26, pellets: 1, spread: 0, interval: 0.42, mag: Infinity, reserveStart: Infinity, range: 2.6, auto: false, unlockRank: 0 },
  { slot: 2, id: 'pelican', name: 'Pelican 9', kind: 'pistol', damage: 34, pellets: 1, spread: 0.006, interval: 0.24, mag: 12, reserveStart: 36, range: 65, auto: false, unlockRank: 0 },
  { slot: 3, id: 'breaker', name: 'Breaker Scattergun', kind: 'scatter', damage: 13, pellets: 6, spread: 0.05, interval: 0.85, mag: 6, reserveStart: 18, range: 30, auto: false, unlockRank: 0 },
  { slot: 4, id: 'marlin', name: 'Marlin-9', kind: 'smg', damage: 16, pellets: 1, spread: 0.02, interval: 0.085, mag: 30, reserveStart: 90, range: 55, auto: true, unlockRank: 2 },
  { slot: 5, id: 'longshot', name: 'Longshot Rifle', kind: 'rifle', damage: 85, pellets: 1, spread: 0.001, interval: 1.05, mag: 5, reserveStart: 15, range: 130, auto: false, unlockRank: 3 },
];

export class WeaponArsenal {
  constructor() {
    this.current = 1; // Pelican 9 in hand at the start of a run
    this.mags = {};
    this.reserves = {};
    this.reloadUntil = 0;
    this.lastShotAt = -Infinity;
    for (const w of WEAPONS) {
      this.mags[w.id] = w.mag;
      this.reserves[w.id] = w.reserveStart;
    }
  }

  get def() { return WEAPONS[this.current]; }

  isUnlocked(def, respect) { return respect.rankIndex >= def.unlockRank; }

  // Returns { ok } or { ok:false, reason } for locked slots.
  select(index, respect) {
    const def = WEAPONS[index];
    if (!def) return { ok: false, reason: 'No such weapon' };
    if (!this.isUnlocked(def, respect)) {
      return { ok: false, reason: `${def.name} unlocks at ${['Nobody', 'Runner', 'Hustler', 'Operator'][def.unlockRank]} respect` };
    }
    this.current = index;
    return { ok: true };
  }

  get reloading() { return performance.now() / 1000 < this.reloadUntil; }

  canFire(now) {
    const def = this.def;
    if (this.reloading) return false;
    if (now - this.lastShotAt < def.interval) return false;
    if (def.mag !== Infinity && this.mags[def.id] <= 0) { this.startReload(now); return false; }
    return true;
  }

  consume(now) {
    const def = this.def;
    this.lastShotAt = now;
    if (def.mag !== Infinity) {
      this.mags[def.id]--;
      if (this.mags[def.id] <= 0) this.startReload(now);
    }
  }

  startReload(now) {
    const def = this.def;
    if (def.mag === Infinity || this.reserves[def.id] <= 0 || this.mags[def.id] >= def.mag) return;
    this.reloadUntil = now + 0.95;
  }

  updateReload(now) {
    const def = this.def;
    if (def.mag === Infinity) return;
    if (this.reloadUntil && now >= this.reloadUntil) {
      const need = def.mag - this.mags[def.id];
      const take = Math.min(need, this.reserves[def.id]);
      this.mags[def.id] += take;
      this.reserves[def.id] -= take;
      this.reloadUntil = 0;
    }
  }

  addAmmo(id, amount) {
    if (id in this.reserves && this.reserves[id] !== Infinity) this.reserves[id] += amount;
  }

  ammoText() {
    const def = this.def;
    if (def.mag === Infinity) return def.name;
    const suffix = this.reloading ? ' · reloading' : '';
    return `${def.name} · ${this.mags[def.id]} / ${this.reserves[def.id]}${suffix}`;
  }

  serialize() { return { current: this.current, mags: this.mags, reserves: this.reserves }; }
  restore(data) {
    if (!data) return;
    this.current = data.current ?? 1;
    Object.assign(this.mags, data.mags || {});
    for (const k of Object.keys(data.reserves || {})) {
      if (data.reserves[k] !== null && isFinite(data.reserves[k])) this.reserves[k] = data.reserves[k];
    }
  }
}
