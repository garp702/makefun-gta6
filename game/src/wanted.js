// WantedSystem: the BCPD heat model behind the five stars.
// Crimes pour heat in; heat cools only while no police unit has eyes on the player.
// Star thresholds turn raw heat into the 0-5 star level that dispatch responds to.

export const STAR_THRESHOLDS = [0, 30, 100, 180, 280, 400];
export const MAX_HEAT = 560;

export class WantedSystem {
  constructor() {
    this.heat = 0;
    this.lastCrimeAt = -Infinity;
    this.time = 0;
  }

  get stars() {
    let s = 0;
    for (let i = 1; i < STAR_THRESHOLDS.length; i++) if (this.heat >= STAR_THRESHOLDS[i]) s = i;
    return s;
  }

  // Add heat for a crime; returns true when the star level rose because of it.
  addHeat(amount) {
    const before = this.stars;
    this.heat = Math.min(MAX_HEAT, this.heat + amount);
    this.lastCrimeAt = this.time;
    return this.stars > before;
  }

  setStars(n) {
    const target = [0, 55, 130, 220, 330, 460][Math.max(0, Math.min(5, n))];
    this.heat = target;
    this.lastCrimeAt = this.time;
  }

  clear() { this.heat = 0; }

  // seen: any unit or Air One currently watching. Heat only decays unseen, and
  // never in the first seconds after a fresh crime.
  update(dt, seen) {
    this.time += dt;
    if (!seen && this.time - this.lastCrimeAt > 4) {
      this.heat = Math.max(0, this.heat - 7.5 * dt);
    }
  }
}
