// The player's two original firearms. `gate` is the minimum seconds between
// shots; fire attempts read the input edge set, so fast taps on the pistol
// still register exactly one shot per tap.
export const WEAPONS = {
  pistol: { id: 'pistol', name: 'Pelican 9', magSize: 12, gate: 0.34, damage: 34, auto: false, range: 46 },
  smg: { id: 'smg', name: 'Marlin-9', magSize: 30, gate: 0.085, damage: 16, auto: true, range: 40 },
};
export class WeaponRig {
  constructor(state) {
    this.state = state;
    this.current = 'pistol';
    this.mags = { pistol: WEAPONS.pistol.magSize, smg: WEAPONS.smg.magSize };
    this.cooldown = 0;
  }
  def() { return WEAPONS[this.current]; }
  reserve() { return this.current === 'pistol' ? this.state.reservePistol : this.state.reserveSmg; }
  addReserve(kind, n) {
    if (kind === 'pistol') this.state.reservePistol += n; else this.state.reserveSmg += n;
  }
  select(id) { if (WEAPONS[id]) { this.current = id; this.cooldown = Math.max(this.cooldown, 0.12); } }
  reloadIfNeeded() {
    if (this.mags[this.current] > 0) return false;
    const take = Math.min(this.def().magSize, this.reserve());
    if (take <= 0) return false;
    this.mags[this.current] = take;
    this.addReserve(this.current, -take);
    return true;
  }
  // Returns true when a shot actually leaves the barrel.
  tryFire(dt, wantFire) {
    this.cooldown -= dt;
    if (!wantFire || this.cooldown > 0) return false;
    if (this.mags[this.current] <= 0) { this.reloadIfNeeded(); this.cooldown = 0.3; return false; }
    this.mags[this.current] -= 1;
    this.cooldown = this.def().gate;
    if (this.mags[this.current] === 0) this.reloadIfNeeded();
    return true;
  }
  label() {
    const d = this.def();
    return `${d.name} · ${this.mags[this.current]}/${this.reserve()}`;
  }
}
