// StoryJobs: Marisol Vega's ten jobs across three days — the spine of Bayline
// City. Each job is a chain of phases (pick up, carry, deliver, escape) marked by
// a gold pillar in the world and a route line on the minimap. Finishing a job
// pays cash and respect and rolls straight into the next one; days turn over
// after jobs 3 and 7. Total pay across the run: $6,480.

import * as THREE from 'three';

export const JOBS = [
  {
    name: 'FIRST CATCH', pay: 250, respect: 40,
    intro: 'Kai. A cooler of fresh catch at the Marina — bring it to the Beach Bar before it spoils.',
    pickupLine: 'That is the cooler. Keep it cold, keep it quiet.',
    outro: 'Cold and on time. That is how you get a second job.',
    phases: [
      { type: 'pickup', x: 150, z: 138, label: 'Pick up the cooler at the Marina' },
      { type: 'deliver', x: 150, z: -40, label: 'Deliver the cooler to the Beach Bar' },
    ],
  },
  {
    name: 'PAPER ROUTE', pay: 300, respect: 50,
    intro: 'Ledger pages, Old Town newsstand. They go to the Hillcrest tower — no reading them.',
    pickupLine: 'Pages sealed. The tower concierge is expecting a quiet knock.',
    outro: 'Delivered unread. People notice discretion, Kai.',
    phases: [
      { type: 'pickup', x: 0, z: 55, label: 'Pick up the ledger pages in Old Town' },
      { type: 'deliver', x: -50, z: -150, label: 'Deliver to the Hillcrest tower' },
    ],
  },
  {
    name: 'QUIET PICKUP', pay: 380, respect: 60,
    intro: 'A package waits by the Canal. Pick it up soft — then my Old Town friend takes it off your hands.',
    pickupLine: 'Got it. Now move like you belong there.',
    outro: 'Soft hands, clean street. Day one is yours.',
    phases: [
      { type: 'pickup', x: -100, z: 100, label: 'Pick up the package by the Canal' },
      { type: 'deliver', x: 50, z: 50, label: 'Deliver to the Old Town contact' },
    ],
  },
  {
    name: 'CANAL RUN', pay: 450, respect: 80,
    intro: 'Day two. Crates on the west Canal bank need to be at the Marina before the tide turns.',
    pickupLine: 'Crates loaded. The Marina crew is watching the clock.',
    outro: 'The tide owes you a favour now.',
    phases: [
      { type: 'pickup', x: -150, z: -50, label: 'Load the crates on the Canal bank' },
      { type: 'deliver', x: 100, z: 150, label: 'Deliver the crates to the Marina' },
    ],
  },
  {
    name: 'HOT CARGO', pay: 520, respect: 90,
    intro: 'Warehouse freight, Canal side. It is warm, Kai — the BCPD would love a look inside.',
    pickupLine: 'Cargo aboard. Two stars of attention — drive like a tourist.',
    outro: 'Warm cargo, cold trail. Beautiful.',
    onPickup: (game) => { if (game.wanted.stars < 2) game.wanted.setStars(2); },
    phases: [
      { type: 'pickup', x: -150, z: 150, label: 'Pick up the freight at the Canal warehouse' },
      { type: 'deliver', x: 150, z: 100, label: 'Deliver the freight to the docks' },
    ],
  },
  {
    name: 'NIGHT LEDGER', pay: 610, respect: 110,
    intro: 'A Hillcrest accountant left a ledger where he should not have. It belongs to the bank downtown now.',
    pickupLine: 'Ledger in hand. Half the city would pay for what is in there.',
    outro: 'Books balanced. You are becoming expensive, Kai.',
    phases: [
      { type: 'pickup', x: 100, z: -150, label: 'Collect the ledger in Hillcrest' },
      { type: 'deliver', x: 0, z: 0, label: 'Deliver the ledger to the bank downtown' },
    ],
  },
  {
    name: 'DOUBLE TIDE', pay: 700, respect: 130,
    intro: 'Two drops, one tide window. Marina cooler first, Canal contact second, Beach Bar to close.',
    pickupLine: 'First leg done. The Canal contact hates waiting.',
    outro: 'Both tides caught. Day two, buried.',
    phases: [
      { type: 'pickup', x: 150, z: 138, label: 'Pick up the cooler at the Marina' },
      { type: 'deliver', x: -100, z: -100, label: 'Drop at the Canal contact' },
      { type: 'deliver', x: 150, z: -40, label: 'Close the run at the Beach Bar' },
    ],
  },
  {
    name: 'HARBOR HEAT', pay: 820, respect: 160,
    intro: 'The BCPD will be waiting at the harbor. Take the package anyway — then run it to the chop shop.',
    pickupLine: 'Package is yours and so is a 3-star welcome. Lose them, then the chop shop.',
    outro: 'You outran a roadblock net. The street is talking.',
    onPickup: (game) => { game.wanted.setStars(Math.max(3, game.wanted.stars)); },
    onComplete: (game) => { game.wanted.clear(); game.dispatch.suspectLost(); },
    phases: [
      { type: 'pickup', x: 150, z: 100, label: 'Take the harbor package' },
      { type: 'deliver', x: -150, z: 50, label: 'Escape to the Canal chop shop' },
    ],
  },
  {
    name: 'SKYLINE DELIVERY', pay: 950, respect: 190,
    intro: 'Hillcrest penthouse documents, Marina buyer, and Air One will have opinions. Fast and clean.',
    pickupLine: 'Documents aboard. Air One is circling — the clock is running.',
    outro: 'Under the spotlight and out the other side. Operator work.',
    onPickup: (game) => { game.wanted.setStars(Math.max(4, game.wanted.stars)); },
    phases: [
      { type: 'pickup', x: 100, z: -150, label: 'Collect the documents in Hillcrest' },
      { type: 'deliver', x: 150, z: 138, label: 'Deliver to the Marina buyer', timeLimit: 170 },
    ],
  },
  {
    name: 'BAYLINE FINALE', pay: 1500, respect: 300,
    intro: 'Last one, Kai. The Marina strongbox, the Old Town vault, then the Beach Bar — and every badge in the bay.',
    pickupLine: 'Strongbox moving. Old Town vault, quickly.',
    outro: 'That is the whole city, run by one fixer. Bayline is yours, Kai.',
    onPhase: (game, phaseIdx) => { if (phaseIdx === 1) game.wanted.setStars(Math.max(4, game.wanted.stars)); },
    phases: [
      { type: 'pickup', x: 150, z: 138, label: 'Take the strongbox at the Marina' },
      { type: 'deliver', x: 0, z: 55, label: 'Drop the strongbox at the Old Town vault' },
      { type: 'deliver', x: 150, z: -40, label: 'Finish at the Beach Bar' },
    ],
  },
];

export const TOTAL_PAYOUT = JOBS.reduce((s, j) => s + j.pay, 0);

export class StoryJobs {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.phase = 0;
    this.completed = 0;
    this.phaseTimer = null;

    // The gold objective pillar + ground ring, moved from phase to phase.
    this.marker = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.4, 30, 14, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.y = 15;
    this.marker.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.4, 3.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2b138, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    this.marker.add(ring);
    game.scene.add(this.marker);
  }

  get done() { return this.index >= JOBS.length; }
  get job() { return this.done ? null : JOBS[this.index]; }
  get phaseDef() { return this.done ? null : this.job.phases[this.phase]; }

  bannerTitle() { return this.done ? 'ALL JOBS DONE' : `JOB ${this.index + 1}/10 — ${this.job.name}`; }
  objectiveLabel() { return this.done ? 'Serena Bay is yours. Free roam.' : this.phaseDef.label; }

  objectivePos() {
    if (this.done) return null;
    const p = this.phaseDef;
    return new THREE.Vector3(p.x, 0, p.z);
  }

  startCurrent() {
    this.phase = 0;
    this.armTimer();
    this.syncMarker();
    if (!this.done) this.game.showDialog('Marisol Vega', this.job.intro, 7);
  }

  armTimer() {
    const p = this.phaseDef;
    this.phaseTimer = p && p.timeLimit ? p.timeLimit : null;
  }

  syncMarker() {
    const pos = this.objectivePos();
    this.marker.visible = !!pos;
    if (pos) this.marker.position.set(pos.x, 0, pos.z);
  }

  update(dt) {
    if (this.done) return;
    // Pulse the pillar gently.
    const s = 1 + Math.sin(performance.now() * 0.004) * 0.08;
    this.marker.scale.set(s, 1, s);
    if (this.phaseTimer !== null) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.game.showMessage('Too slow — the buyer walked. Phase reset.', 3.5);
        this.armTimer();
        return;
      }
    }
    const target = this.objectivePos();
    const p = this.game.playerPos();
    if (Math.hypot(p.x - target.x, p.z - target.z) < 7.5) this.advance();
  }

  advance() {
    const job = this.job;
    const wasPhase = this.phase;
    if (this.phaseDef.type === 'pickup') {
      this.game.audio.pickup();
      if (job.onPickup) job.onPickup(this.game);
      if (job.pickupLine) this.game.showDialog('Marisol Vega', job.pickupLine, 5);
    }
    this.phase++;
    if (job.onPhase) job.onPhase(this.game, this.phase);
    if (this.phase >= job.phases.length) this.completeJob();
    else { this.armTimer(); this.syncMarker(); }
    void wasPhase;
  }

  completeJob() {
    const job = this.job;
    const g = this.game;
    g.cash += job.pay;
    g.audio.cash();
    g.addRespect(job.respect);
    if (job.onComplete) job.onComplete(g);
    g.showDialog('Marisol Vega', job.outro, 6);
    g.showMessage(`JOB COMPLETE — ${job.name} · +$${job.pay} · +${job.respect} Respect`, 4);
    this.completed++;
    const finishedIndex = this.index;
    this.index++;
    this.phase = 0;
    if (finishedIndex === 2) g.setDay(2, 9 * 60);
    if (finishedIndex === 6) g.setDay(3, 9 * 60);
    g.saveGame();
    if (!this.done) {
      // Roll straight into the next job after a breath.
      setTimeout(() => { if (!g.destroyed) this.startCurrent(); }, 1600);
      this.syncMarkerHiddenUntilStart();
    } else {
      this.syncMarker();
      g.showMessage('ALL 10 JOBS DONE — KINGPIN RUN COMPLETE', 6);
    }
  }

  syncMarkerHiddenUntilStart() {
    // Marker shows the next objective immediately; dialog follows on start.
    this.syncMarker();
  }

  // Debug/staging: drop the player (and their car) beside the current objective.
  teleportToObjective() {
    const target = this.objectivePos();
    if (!target) return null;
    const g = this.game;
    const dest = new THREE.Vector3(target.x + 4.5, 0, target.z + 4.5);
    if (g.player.inVehicle) {
      const v = g.player.inVehicle;
      v.pos.set(dest.x, 0, dest.z);
      v.heading = Math.atan2(target.x - dest.x, target.z - dest.z);
      v.speed = 0;
      v.syncMesh();
      g.player.pos.copy(v.pos);
    } else {
      g.player.pos.set(dest.x, 0, dest.z);
      g.player.heading = Math.atan2(target.x - dest.x, target.z - dest.z);
    }
    g.camera.snap = true;
    return target;
  }
}
