// Wanted level 0–5. Crimes add heat; staying out of police sight cools it.
// The level drives police count, aggression and the helicopter threshold.
export class Wanted {
  constructor() { this.level = 0; this.coolTimer = 0; }
  add(n) { this.level = Math.max(0, Math.min(5, this.level + n)); this.coolTimer = 0; }
  set(n) { this.level = Math.max(0, Math.min(5, Math.round(n))); this.coolTimer = 0; }
  update(dt, seenByPolice) {
    if (seenByPolice) { this.coolTimer = 0; return; }
    if (this.level > 0) {
      this.coolTimer += dt;
      if (this.coolTimer > 14) { this.level -= 1; this.coolTimer = 0; }
    }
  }
  stars() {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < this.level ? '★' : '<span class="off">★</span>';
    return s;
  }
}
