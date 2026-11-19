// RespectSystem: street reputation for Kai Mercer.
// Respect pours in from story jobs, carjackings, near misses and clean getaways, and
// the rank ladder it climbs unlocks the good guns and the better safehouses.

export const RESPECT_RANKS = [
  { at: 0, name: 'Nobody' },
  { at: 150, name: 'Runner' },
  { at: 400, name: 'Hustler' },
  { at: 800, name: 'Operator' },
  { at: 1400, name: 'Shot Caller' },
  { at: 2200, name: 'Kingpin of Serena Bay' },
];

export class RespectSystem {
  constructor() {
    this.points = 0;
  }

  get rankIndex() {
    let r = 0;
    for (let i = 0; i < RESPECT_RANKS.length; i++) if (this.points >= RESPECT_RANKS[i].at) r = i;
    return r;
  }

  get rankName() { return RESPECT_RANKS[this.rankIndex].name; }

  // 0..1 progress through the current rank toward the next one (1 at the top).
  get progress() {
    const i = this.rankIndex;
    if (i >= RESPECT_RANKS.length - 1) return 1;
    const lo = RESPECT_RANKS[i].at;
    const hi = RESPECT_RANKS[i + 1].at;
    return (this.points - lo) / (hi - lo);
  }

  // Returns { rankedUp, rankName } when the award crosses a rank line.
  add(amount) {
    const before = this.rankIndex;
    this.points += amount;
    const now = this.rankIndex;
    return { rankedUp: now > before, rankName: this.rankName };
  }

  setPoints(n) { this.points = Math.max(0, Math.floor(n)); }
}
