// Bayline City — OpenWorldGame orchestrator. Owns the renderer, the clock
// and the frame loop; every system lives in its own module and is wired
// together here. Boot: build the world, show the start screen, and (when a
// ?shot= staging parameter is present) pose a deterministic live scene.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { Vehicle } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Helicopter } from './helicopter.js';
import { Wanted } from './wanted.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { WeaponRig } from './weapons.js';
import { Radio } from './radio.js';
import { Shop } from './shop.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';
import { loadSave, storeSave, clearSave, freshState } from './save.js';
import { ChaseCamera } from './camera.js';
import { Input } from './input.js';
import { shotParams, applyStaging } from './shots.js';

const DIALOG_START = 'Marisol Vega: "You made it to Serena Bay. First job\'s simple — pick up the cooler by the east pier road."';

export class OpenWorldGame {
  constructor() {
    this.input = new Input();
    this.audio = new GameAudio();
    this.state = freshState();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('scene').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d9);
    this.scene.fog = new THREE.Fog(0x87b5d9, 120, 420);
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);
    this.chase = new ChaseCamera(this.camera);

    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5f46, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe3b3, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -70; this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70; this.sun.shadow.camera.bottom = -70;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    const { seed } = shotParams();
    buildCity(this.scene, seed);
    this.traffic = new Traffic(this.scene, seed + 14);
    this.peds = new Pedestrians(this.scene, seed + 26);
    this.player = new Player(this.scene);
    this.playerCar = new Vehicle(this.scene, -18, 112, Math.PI / 2, 0xff8c42, 'player');
    this.police = new Police(this.scene);
    this.helicopter = new Helicopter(this.scene);
    this.wanted = new Wanted();
    this.weapons = new WeaponRig(this.state);
    this.radio = new Radio(this.audio);
    this.combat = new Combat(this.scene, this.audio);
    this.hud = new Hud();
    this.shop = new Shop(this.state, this.weapons, () => { this.applyUpgrades(); storeSave(this.state); });

    const markerMat = new THREE.MeshStandardMaterial({ color: 0xffd76a, emissive: 0xffb347, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 });
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.2, 18, 1, true), markerMat);
    this.scene.add(this.marker);
    this.missions = new Missions(this.state, this.scene, this.marker);

    this.dialog = DIALOG_START;
    this.running = false;
    this.paused = false;
    this.staged = null;
    this.bustedTimer = 0;
    this.elapsed = 0;
    this.lastTs = performance.now();

    this.bindUi();
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    const { shot } = shotParams();
    if (shot) applyStaging(this, shot);
    this.refreshSun();
    window.__game = this;
    this.renderer.setAnimationLoop((ts) => this.frame(ts));
  }

  bindUi() {
    document.getElementById('newGameBtn').addEventListener('click', () => this.startRun(false));
    document.getElementById('continueBtn').addEventListener('click', () => this.startRun(true));
    document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause(false));
    document.getElementById('restartBtn').addEventListener('click', () => { clearSave(); location.reload(); });
    document.getElementById('shopCloseBtn').addEventListener('click', () => this.shop.hide());
    if (!loadSave()) document.getElementById('continueBtn').style.display = 'none';
  }

  startRun(fromSave) {
    const saved = fromSave ? loadSave() : null;
    this.state = saved || freshState();
    if (!saved) clearSave();
    // Rebuild state-bound systems against the (possibly loaded) state.
    this.weapons = new WeaponRig(this.state);
    this.shop.state = this.state; this.shop.weapons = this.weapons;
    this.missions.state = this.state; this.missions.leg = 0; this.missions.refreshMarker();
    this.applyUpgrades();
    this.audio.ensure();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
    this.hud.show();
    this.dialog = DIALOG_START;
    this.running = true;
    this.paused = false;
    // The click that pressed NEW GAME must never become a gunshot/carjack.
    this.input.clearAll();
    this.chase.snap(this.player.pos, this.input, false);
  }

  applyUpgrades() {
    this.playerCar.topSpeed = this.state.engine > 0 ? 40 : 34;
  }

  togglePause(force) {
    this.paused = force !== undefined ? force : !this.paused;
    document.getElementById('pauseScreen').style.display = this.paused ? 'flex' : 'none';
    if (this.paused) {
      document.getElementById('pauseStats').textContent =
        `${this.missions.banner()} · $${this.state.cash} · REP ${this.state.rep} · Day ${this.state.day}`;
    }
    this.input.clearAll();
  }

  targetPos() { return this.player.inCar ? this.player.inCar.pos : this.player.pos; }

  hitTargets() {
    const list = [];
    for (const p of this.peds.list) {
      list.push({ get hp() { return p.hp; }, pos: p.mesh.position, apply: (d, from) => { this.peds.hurt(p, d, from); } });
    }
    for (const u of this.police.units) {
      if (!u.active) continue;
      list.push({ get hp() { return u.vehicle.hp; }, pos: u.vehicle.pos, apply: (d) => { u.vehicle.hp -= d; } });
    }
    return list;
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    this.elapsed += dt;
    if (this.staged) {
      // Frozen scene: keep the rotor turning and the marker breathing only.
      this.helicopter.rotor.rotation.y += dt * 26;
      this.marker.rotation.y += dt * 0.8;
      this.updateHud();
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.paused && this.input.wasPressed('Escape')) this.togglePause(false);
    else if (this.shop.open && this.input.wasPressed('KeyB')) this.shop.hide();
    if (this.running && !this.paused && !this.shop.open) this.update(dt);
    if (this.running) this.updateHud();
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    const s = this.state;
    // Clock: one game minute every two real seconds.
    s.minuteOfDay += dt * 0.5;
    if (s.minuteOfDay >= 24 * 60) { s.minuteOfDay -= 24 * 60; s.day = Math.min(3, s.day + 1); }
    this.refreshSun();

    if (this.input.wasPressed('Escape')) { this.togglePause(); return; }

    const driving = !!this.player.inCar;
    // Garage / shop bay.
    if (this.input.wasPressed('KeyB')) {
      const nearGarage = this.targetPos().distanceTo(new THREE.Vector3(53, 0, 53)) < 17;
      if (nearGarage) { this.shop.show(); this.audio.blip(520); return; }
    }

    if (driving) {
      const car = this.player.inCar;
      let throttle = 0, steer = 0;
      if (this.input.down('KeyW')) throttle = 1;
      if (this.input.down('KeyS')) throttle = -1;
      if (this.input.down('KeyA')) steer = -1;
      if (this.input.down('KeyD')) steer = 1;
      const boost = this.state.nitro > 0 && (this.input.down('ShiftLeft') || this.input.down('ShiftRight'));
      const realTop = car.topSpeed;
      if (boost) car.topSpeed = realTop + 9;
      car.update(dt, throttle, steer);
      car.topSpeed = realTop;
      if (this.input.wasPressed('KeyE')) {
        this.player.exitCar();
        this.audio.setEngine(false); this.radio.stop();
      }
      if (this.input.wasPressed('KeyR')) { this.radio.cycle(); this.audio.blip(740, 0.05); }
      this.audio.setEngine(true, Math.abs(car.speed) / Math.max(1, car.topSpeed));
    } else {
      this.player.update(dt, this.input, this.input.yaw);
      if (this.input.wasPressed('KeyE')) {
        const own = this.playerCar.pos.distanceTo(this.player.pos) < 4.2 ? this.playerCar : null;
        const near = own || this.traffic.nearest(this.player.pos, 4.2);
        if (near) {
          const stolen = near !== this.playerCar;
          this.player.enterCar(near);
          this.input.yaw = near.heading;
          if (stolen) {
            this.wanted.add(2);
            this.police.spawnNear(near.pos);
            this.dialog = 'Marisol Vega: "That one wasn\'t yours, partner. The PD noticed. Drive!"';
            this.hud.toast('WANTED +2 — car theft');
          }
          this.radio.start();
          this.audio.ensure();
        }
      }
    }

    // Weapons: 1/2 select, click fires. Semi-auto reads the press edge so
    // a fast tap always fires exactly once; the Marlin-9 uses held state.
    if (this.input.wasPressed('Digit1')) this.weapons.select('pistol');
    if (this.input.wasPressed('Digit2')) this.weapons.select('smg');
    const def = this.weapons.def();
    const wantFire = def.auto ? (this.input.mouseDown || this.input.mousePressed) : this.input.mousePressed;
    if (this.weapons.tryFire(dt, wantFire) ) {
      const origin = this.targetPos().clone();
      const heading = this.player.inCar ? this.player.inCar.heading : this.player.heading;
      const hit = this.combat.shoot(origin, heading, def, this.hitTargets());
      this.wanted.add(1);
      if (hit) this.hud.toast(`Hit — target at ${Math.max(0, Math.round(hit.hp))} HP`);
    }
    this.combat.update(dt);

    // World systems.
    this.traffic.update(dt);
    this.peds.update(dt, this.elapsed);
    const tp = this.targetPos();
    const seen = this.police.update(dt, this.wanted.level, tp, this.elapsed);
    this.helicopter.update(dt, this.wanted.level, tp, this.elapsed);
    this.wanted.update(dt, seen);
    this.marker.rotation.y += dt * 0.8;
    this.marker.position.y = 1.4 + Math.sin(this.elapsed * 2.2) * 0.25;

    const ev = this.missions.update(tp);
    if (ev && ev.legDone) { this.hud.toast('Drop made — next leg marked'); this.audio.blip(700); }
    if (ev && ev.jobDone) {
      this.audio.cash();
      this.hud.toast(`${ev.job.title} complete — +$${ev.pay}`);
      this.dialog = this.state.done
        ? 'Marisol Vega: "Eight jobs, three days, one legend. Bayline City is yours now."'
        : `Marisol Vega: "Paid in full. Next: ${this.missions.current().title} — ${this.missions.current().brief}"`;
      storeSave(this.state);
    }

    // Busted: boxed in by a close unit while nearly stopped.
    const closeUnit = this.police.units.some((u) => u.active && u.vehicle.pos.distanceTo(tp) < 4.5);
    const mySpeed = this.player.inCar ? Math.abs(this.player.inCar.speed) : 0;
    if (this.wanted.level > 0 && closeUnit && mySpeed < 1) {
      this.bustedTimer += dt;
      if (this.bustedTimer > 3) {
        this.bustedTimer = 0;
        this.wanted.set(0);
        s.cash = Math.max(0, s.cash - 100);
        this.hud.toast('BUSTED — fined $100');
        this.player.exitCar();
        this.player.pos.set(-24, 0, 108);
      }
    } else this.bustedTimer = 0;

    this.chase.update(dt, tp, this.input, driving);
  }

  refreshSun() {
    const m = this.state.minuteOfDay;
    const dayF = Math.max(0, Math.min(1, (m - 360) / 180)) * Math.max(0, Math.min(1, (1140 - m) / 180));
    const golden = m > 16 * 60 && m < 19 * 60;
    const sky = golden ? new THREE.Color(0xf7a56b) : new THREE.Color().setHSL(0.58, 0.45, 0.35 + dayF * 0.35);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.sun.color.set(golden ? 0xffb37a : 0xffe3b3);
    this.sun.intensity = 0.7 + dayF * 1.1;
    const ang = ((m - 360) / 720) * Math.PI;
    const tp = this.targetPos ? this.targetPos() : new THREE.Vector3();
    this.sun.position.set(tp.x + Math.cos(ang) * 80, 30 + Math.sin(ang) * 70, tp.z + 40);
    this.sun.target.position.copy(tp);
    this.hemi.intensity = 0.45 + dayF * 0.6;
  }

  updateHud() {
    const s = this.state;
    const tp = this.targetPos();
    const driving = !!this.player.inCar;
    const obj = this.missions.objectivePos();
    this.hud.update(0.016, {
      minuteOfDay: s.minuteOfDay, day: s.day, cash: s.cash, rep: s.rep,
      wantedStars: this.wanted.stars(),
      banner: this.staged === 'garage' ? this.missions.banner() : this.missions.banner(),
      radioLabel: this.radio.label(),
      weaponLabel: this.weapons.label(),
      speedKmh: driving ? this.player.inCar.speedKmh() : 0,
      dialog: this.dialog.replace(/^Marisol Vega: /, ''),
      objectiveHtml: this.missions.current()
        ? `<b>${this.missions.current().title}</b> — ${this.missions.current().brief}<br>Garage & shop: the marked bay at Palm & 40th (press B).`
        : '<b>Story complete.</b> Serena Bay is yours — free roam, the PD still remembers you.',
      prompt: this.computePrompt(),
      policeLines: this.police.panelLines(),
      airLine: this.helicopter.panelLine(),
      playerPos: tp, playerHeading: driving ? this.player.inCar.heading : this.player.heading,
      objective: obj,
      policePos: this.police.units.filter((u) => u.active).map((u) => u.vehicle.pos),
      trafficPos: this.traffic.cars.map((c) => c.pos),
      heliPos: this.helicopter.active ? this.helicopter.group.position : null,
    });
  }

  computePrompt() {
    if (!this.running || this.staged) return '';
    if (this.player.inCar) return 'E leave car · R radio · click fire · Esc pause';
    const nearCar = this.playerCar.pos.distanceTo(this.player.pos) < 4.2 || this.traffic.nearest(this.player.pos, 4.2);
    if (nearCar) return 'E enter car';
    if (this.targetPos().distanceTo(new THREE.Vector3(53, 0, 53)) < 17) return 'B garage & shop';
    return '';
  }
}

new OpenWorldGame();
