// The three-day story: exactly 8 jobs in order, fixed payouts totalling
// $3,780. Jobs 1–3 land on Day 1, 4–6 on Day 2, 7–8 on Day 3. Each job is
// one or two "reach the marker" legs given by fixer Marisol Vega.
export const JOBS = [
  { title: 'FIRST CATCH', pay: 240, day: 1, legs: [[40, 108]], brief: 'Pick up the cooler by the east pier road. No questions, just drive.' },
  { title: 'PAPER ROUTE', pay: 310, day: 1, legs: [[-80, 40], [-120, -40]], brief: 'Two drops. Newspapers, allegedly. Keep the van of trouble away from you.' },
  { title: 'QUIET PICKUP', pay: 380, day: 1, legs: [[80, -40]], brief: 'A quiet pickup behind the canal flats. Engine off, lights off, mouth shut.' },
  { title: 'CANAL RUN', pay: 430, day: 2, legs: [[-40, -120], [40, -80]], brief: 'Run the canal road end to end before the tide turns. Fast is fine. Wet is not.' },
  { title: 'HOT CARGO', pay: 500, day: 2, legs: [[120, 40]], brief: 'The crate is warm and the buyer is nervous. Lose any tail before the drop.' },
  { title: 'NIGHT LEDGER', pay: 560, day: 2, legs: [[-120, 80]], brief: 'Collect a ledger from the north-west tower. What is in it stays in it.' },
  { title: 'DOUBLE TIDE', pay: 640, day: 3, legs: [[120, 120], [-120, 120]], brief: 'Two beach drops, opposite ends of Palm Boulevard. The tide waits for nobody.' },
  { title: 'BAYLINE FINALE', pay: 720, day: 3, legs: [[0, -120]], brief: 'Last one. Bring everything home to the south gate and we are square, partner.' },
];
export const TOTAL_PAY = JOBS.reduce((s, j) => s + j.pay, 0); // 3780

export class Missions {
  constructor(state, scene, markerMesh) {
    this.state = state;
    this.marker = markerMesh;
    this.leg = 0;
    this.dialogTimer = 0;
    this.refreshMarker();
  }
  current() { return JOBS[this.state.jobIndex] || null; }
  banner() {
    const j = this.current();
    return j ? `JOB ${this.state.jobIndex + 1}/8 — ${j.title}` : 'STORY COMPLETE — BAYLINE LEGEND';
  }
  objectivePos() {
    const j = this.current();
    if (!j) return null;
    const [x, z] = j.legs[this.leg];
    return { x, z };
  }
  refreshMarker() {
    const o = this.objectivePos();
    if (o && this.marker) this.marker.position.set(o.x, 1.4, o.z);
    if (this.marker) this.marker.visible = !!o;
  }
  // Returns a payout event when a job completes, else null.
  update(playerPos) {
    const j = this.current();
    if (!j) return null;
    const o = this.objectivePos();
    const d = Math.hypot(playerPos.x - o.x, playerPos.z - o.z);
    if (d > 7) return null;
    this.leg += 1;
    if (this.leg < j.legs.length) { this.refreshMarker(); return { legDone: true, job: j }; }
    // Job complete: pay out, advance the calendar to the next job's day.
    this.state.cash += j.pay;
    this.state.rep += 12;
    this.state.jobIndex += 1;
    this.leg = 0;
    const next = this.current();
    if (next) {
      this.state.day = next.day;
      this.state.minuteOfDay = next.day === j.day ? this.state.minuteOfDay + 95 : 9 * 60 + 20;
    } else {
      this.state.day = 3;
      this.state.done = true;
    }
    this.refreshMarker();
    return { jobDone: true, job: j, pay: j.pay };
  }
}
