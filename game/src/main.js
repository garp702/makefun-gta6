// Bayline City — OpenWorldGame: the conductor. It builds Serena Bay and every
// system that lives in it (traffic, pedestrians, BCPD dispatch, roadblocks,
// Air One, respect, weapons, story jobs, shops, safehouses, radio, saves), then
// runs the loop that ties them together: driving and walking, crime and heat,
// chases and gunfire, the clock and the sun. It also exposes window.__game —
// the staging hooks the screenshot scenes and the automated tests drive.

import * as THREE from 'three';
import { InputSystem } from './input.js';
import { buildCity, districtAt, resolveCollisions, createSeededRng } from './city.js';
import { PlayerCharacter } from './player.js';
import { ChaseCamera } from './camera.js';
import { TrafficSystem } from './traffic.js';
import { PedestrianSystem } from './pedestrians.js';
import { WantedSystem } from './wanted.js';
import { RespectSystem } from './respect.js';
import { SaveSystem } from './save.js';
import { GameAudio } from './audio.js';
import { CarRadio } from './radio.js';
import { WeaponArsenal } from './weapons.js';
import { BCPDDispatch } from './dispatch.js';
import { PoliceSystem } from './police.js';
import { RoadblockSystem } from './roadblocks.js';
import { AirOneUnit } from './helicopter.js';
import { CombatSystem } from './combat.js';
import { StoryJobs } from './missions.js';
import { GarageShop } from './shop.js';
import { SafehouseSystem } from './safehouses.js';
import { HudDirector } from './hud.js';
import { stageShot } from './shots.js';

const SUN_STOPS = [
  { h: 5.5, bg: 0x2c3e57, fog: 0x2c3e57, sun: 0x8fa8c9, i: 0.35 },
  { h: 8, bg: 0x9fd4e8, fog: 0xbfe3ee, sun: 0xfff2d8, i: 1.15 },
  { h: 15, bg: 0xa5d8ec, fog: 0xc4e6ef, sun: 0xffffff, i: 1.35 },
  { h: 17.8, bg: 0xfa9e57, fog: 0xf2a56b, sun: 0xffb36b, i: 1.5 },
  { h: 19.3, bg: 0x51557e, fog: 0x6b5a78, sun: 0xff9a5c, i: 0.6 },
  { h: 21, bg: 0x1c2a44, fog: 0x1c2a44, sun: 0x8fa8c9, i: 0.3 },
  { h: 24, bg: 0x1c2a44, fog: 0x1c2a44, sun: 0x8fa8c9, i: 0.3 },
];

export class OpenWorldGame {
  constructor() {
    this.THREE = THREE;
    const params = new URLSearchParams(location.search);
    const seed = Number(params.get('seed') || 7);
    this.rng = createSeededRng(seed * 1000 + 17);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfa9e57);
    this.scene.fog = new THREE.Fog(0xf2a56b, 130, 430);
    this.camera3 = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

    this.hemi = new THREE.HemisphereLight(0xffe0b3, 0x44505c, 0.95);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffb36b, 1.5);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.cityData = buildCity(this.scene, this.rng);
    this.input = new InputSystem(this.renderer.domElement);
    this.audio = new GameAudio();
    this.radio = new CarRadio(this.audio);
    this.wanted = new WantedSystem();
    this.respect = new RespectSystem();
    this.save = new SaveSystem();
    this.player = new PlayerCharacter(this.scene);
    this.traffic = new TrafficSystem(this.scene, this.cityData, this.rng);
    this.peds = new PedestrianSystem(this.scene, this.rng);
    this.dispatch = new BCPDDispatch();
    this.police = new PoliceSystem(this.scene);
    this.roadblocks = new RoadblockSystem(this.scene);
    this.heli = new AirOneUnit(this.scene);
    this.arsenal = new WeaponArsenal();
    this.shop = new GarageShop(this);
    this.safehouses = new SafehouseSystem(this);
    this.jobs = new StoryJobs(this);
    this.combat = new CombatSystem(this);
    this.camera = new ChaseCamera(this.camera3);
    this.hud = new HudDirector(this);

    // Run state.
    this.cash = 250;
    this.day = 1;
    this.clockMinutes = 10 * 60;
    this.time = 0;
    this.running = false;
    this.paused = false;
    this.frozen = false;
    this.staged = false;
    this.destroyed = false;
    this.wheelOpen = false;
    this.activeShopPanel = null;
    this.endedScreen = null;
    this.bustedTimer = 0;
    this.lastSeenTime = -100;
    this.policeHitCooldown = 0;
    this.nearMissCooldown = 0;
    this.lastStars = 0;

    this.wireUi();
    window.addEventListener('resize', () => {
      this.camera3.aspect = window.innerWidth / window.innerHeight;
      this.camera3.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const shot = params.get('shot');
    if (shot) {
      stageShot(this, shot);
      this.refreshPanels();
      this.hud.update(0);
    }
    this.lastNow = performance.now();
    this.loop();
  }

  // ---------- helpers the systems lean on ----------
  playerPos() { return this.player.pos; }
  playerForward() {
    if (this.player.inVehicle) return this.player.inVehicle.forward();
    return { x: Math.sin(this.player.heading), z: Math.cos(this.player.heading) };
  }
  allSolidVehicles() {
    const list = this.traffic.allVehicles();
    for (const u of this.police.units) list.push(u.vehicle);
    for (const c of this.roadblocks.cruisers) list.push(c);
    if (this.player.inVehicle && !list.includes(this.player.inVehicle)) list.push(this.player.inVehicle);
    return list;
  }
  allColliders() { return this.cityData.colliders.concat(this.roadblocks.colliders); }
  getShootables() {
    const list = [];
    for (const ped of this.peds.peds) {
      if (!ped.alive) continue;
      ped.mesh.userData.hitRef = { type: 'ped', obj: ped };
      list.push(ped.mesh);
    }
    for (const v of this.allSolidVehicles()) {
      if (v === this.player.inVehicle) continue;
      v.mesh.userData.hitRef = { type: 'vehicle', obj: v };
      list.push(v.mesh);
    }
    return list;
  }
  notePlayerSeen() { this.lastSeenTime = this.time; }
  seenRecently() { return this.time - this.lastSeenTime < 3.5; }

  showDialog(name, text, secs) { this.hud.showDialog(name, text, secs); }
  showMessage(text, secs) { this.hud.showMessage(text, secs); }
  addRespect(n) {
    const res = this.respect.add(n);
    if (res.rankedUp) {
      this.hud.showRankBanner(res.rankName);
      this.audio.rankUp();
      this.showMessage(`New doors open at ${res.rankName} respect.`, 3.5);
    }
  }
  advanceClock(minutes) {
    this.clockMinutes += minutes;
    while (this.clockMinutes >= 1440) {
      this.clockMinutes -= 1440;
      this.day = Math.min(3, this.day + 1);
    }
  }
  setDay(day, minutes) { this.day = day; this.clockMinutes = minutes; }

  saveGame() {
    this.save.save({
      cash: this.cash, respect: this.respect.points,
      jobIndex: this.jobs.index, jobPhase: this.jobs.phase, jobsCompleted: this.jobs.completed,
      day: this.day, clockMinutes: this.clockMinutes,
      tiers: this.shop.tiers, arsenal: this.arsenal.serialize(),
      px: this.player.pos.x, pz: this.player.pos.z,
      hp: this.player.hp, armor: this.player.armor,
    });
    const btn = document.getElementById('btn-continue');
    if (btn) btn.disabled = false;
  }

  // ---------- run lifecycle ----------
  startRun(opts = {}) {
    // Clear the streets of any previous run's law enforcement.
    for (const u of [...this.police.units]) this.police.removeUnit(u);
    for (const b of [...this.roadblocks.blocks]) { b.dispose(this.scene); }
    this.roadblocks.blocks = [];
    this.heli.deactivate();
    if (this.player.inVehicle) {
      const v = this.player.inVehicle;
      this.player.inVehicle = null;
      this.player.mesh.visible = true;
      this.traffic.releaseCar(v);
    }
    this.wanted.clear();
    this.lastStars = 0;
    this.bustedTimer = 0;
    this.endedScreen = null;
    this.paused = false;
    this.frozen = false;
    this.cash = 250;
    this.respect = new RespectSystem();
    this.arsenal = new WeaponArsenal();
    this.shop.tiers = { engine: 0, armor: 0, nitro: 0 };
    this.player.hp = 100;
    this.player.armor = 0;
    this.player.pos.set(150, 0, 130);
    this.player.heading = Math.PI;
    this.player.mesh.rotation.y = Math.PI;
    this.day = 1;
    this.clockMinutes = 10 * 60;
    this.jobs.index = 0;
    this.jobs.phase = 0;
    this.jobs.completed = 0;
    this.dispatch = new BCPDDispatch();

    const data = opts.fromSave ? this.save.load() : null;
    if (data) {
      this.cash = data.cash ?? 250;
      this.respect.setPoints(data.respect ?? 0);
      this.day = data.day ?? 1;
      this.clockMinutes = data.clockMinutes ?? 600;
      Object.assign(this.shop.tiers, data.tiers || {});
      this.arsenal.restore(data.arsenal);
      this.player.hp = data.hp ?? 100;
      this.player.armor = data.armor ?? 0;
      if (typeof data.px === 'number') this.player.pos.set(data.px, 0, data.pz);
      this.jobs.index = Math.min(data.jobIndex ?? 0, 10);
      this.jobs.completed = data.jobsCompleted ?? this.jobs.index;
      this.jobs.phase = data.jobPhase ?? 0;
      this.jobs.armTimer();
      this.jobs.syncMarker();
      if (!this.jobs.done) this.showDialog('Marisol Vega', this.jobs.job.intro, 7);
    } else {
      if (opts.fresh) this.save.clear();
      this.jobs.startCurrent();
    }

    this.running = true;
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('busted-screen').classList.add('hidden');
    document.getElementById('wasted-screen').classList.add('hidden');
    this.hud.showHud();
    this.camera.mode = 'foot';
    this.camera.yaw = Math.PI;
    this.camera.snap = true;
    this.input.clearEdges();
    if (opts.fresh) this.saveGame();
  }

  togglePause(on) {
    if (!this.running || this.endedScreen) return;
    this.paused = on;
    document.getElementById('pause-menu').classList.toggle('hidden', !on);
    if (on) this.saveGame();
  }

  onBusted() {
    const fine = Math.floor(this.cash * 0.1);
    this.cash -= fine;
    this.wanted.clear();
    this.audio.busted();
    this.endedScreen = 'busted';
    document.getElementById('busted-text').textContent =
      `BCPD took you in. The fine was $${fine}; the respect survives.`;
    document.getElementById('busted-screen').classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeBusted() {
    document.getElementById('busted-screen').classList.add('hidden');
    this.endedScreen = null;
    if (this.player.inVehicle) this.player.exitVehicle(this);
    this.player.pos.set(8, 0, -58);
    this.player.hp = Math.max(this.player.hp, 60);
    this.camera.snap = true;
    this.saveGame();
  }

  onWasted() {
    this.cash = Math.max(0, this.cash - 150);
    this.wanted.clear();
    this.endedScreen = 'wasted';
    document.getElementById('wasted-screen').classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeWasted() {
    document.getElementById('wasted-screen').classList.add('hidden');
    this.endedScreen = null;
    if (this.player.inVehicle) this.player.exitVehicle(this);
    this.player.hp = 100;
    this.player.pos.set(8, 0, 58);
    this.camera.snap = true;
    this.saveGame();
  }

  damagePlayer(amount) {
    if (this.endedScreen || !this.running) return;
    if (this.player.damage(amount, this)) this.onWasted();
  }

  onPedStruck(ped, killed) {
    if (killed) {
      this.wanted.addHeat(45);
      this.dispatch.say('Dispatch: civilian down — shots fired. All units converge.');
    }
  }

  // ---------- UI wiring ----------
  wireUi() {
    const $ = (id) => document.getElementById(id);
    $('btn-new-game').addEventListener('click', () => { this.audio.resume(); this.audio.click(); this.startRun({ fresh: true }); });
    $('btn-continue').addEventListener('click', () => { this.audio.resume(); this.audio.click(); this.startRun({ fromSave: true }); });
    $('btn-resume').addEventListener('click', () => this.togglePause(false));
    $('btn-restart').addEventListener('click', () => { this.togglePause(false); this.startRun({ fresh: true }); });
    $('btn-busted-ok').addEventListener('click', () => this.closeBusted());
    $('btn-wasted-ok').addEventListener('click', () => this.closeWasted());
    if (this.save.exists()) $('btn-continue').disabled = false;
    this.renderer.domElement.addEventListener('click', () => {
      if (this.running && !this.paused && !this.endedScreen && !document.pointerLockElement) {
        try { this.renderer.domElement.requestPointerLock(); } catch { /* headless */ }
      }
    });
  }

  refreshPanels() {
    this.activeShopPanel = this.shop.activePanel();
  }

  computePrompt() {
    if (this.player.inVehicle) return '[E] Exit vehicle';
    const near = this.safehouses.nearest(this.player.pos);
    if (near && near.dist < 5) {
      return this.safehouses.isUnlocked(near.house)
        ? `[E] Rest at ${near.house.name}`
        : `${near.house.name} — locked`;
    }
    const v = this.nearestStealable(3.6);
    if (v) return v.driver === 'ai' ? '[E] Carjack' : '[E] Enter vehicle';
    return null;
  }

  nearestStealable(maxDist) {
    let best = null;
    for (const v of this.traffic.allVehicles()) {
      const d = v.pos.distanceTo(this.player.pos);
      if (d < maxDist && (!best || d < best.d)) best = { v, d };
    }
    return best ? best.v : null;
  }

  tryInteract() {
    if (this.player.inVehicle) {
      this.player.exitVehicle(this);
      this.camera.mode = 'foot';
      this.camera.snap = true;
      this.audio.click();
      return;
    }
    const near = this.safehouses.nearest(this.player.pos);
    if (near && near.dist < 5) {
      this.showMessage(this.safehouses.use(near.house), 3.5);
      return;
    }
    const v = this.nearestStealable(3.6);
    if (!v) return;
    const wasAi = v.driver === 'ai';
    this.traffic.takeCar(v);
    this.player.enterVehicle(v);
    this.camera.mode = 'car';
    this.camera.snap = true;
    if (wasAi) {
      this.wanted.addHeat(70);
      this.dispatch.crimeReported('carjacking', districtAt(v.pos.x, v.pos.z));
      this.addRespect(5);
    } else {
      this.wanted.addHeat(35);
      this.dispatch.crimeReported('vehicle theft', districtAt(v.pos.x, v.pos.z));
    }
    this.audio.click();
  }

  // ---------- the loop ----------
  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    let dt = Math.min(0.05, (now - this.lastNow) / 1000);
    this.lastNow = now;

    if (!this.running) {
      // Title backdrop: a slow orbit over the bay.
      const t = now * 0.00004;
      this.camera3.position.set(Math.sin(t) * 150, 46, Math.cos(t) * 150);
      this.camera3.lookAt(20, 0, 0);
      this.updateSun();
      this.renderer.render(this.scene, this.camera3);
      return;
    }
    if (this.paused || this.endedScreen) {
      if (this.paused && this.input.pressed('Escape')) this.togglePause(false);
      this.input.endFrame();
      this.renderer.render(this.scene, this.camera3);
      return;
    }
    if (this.frozen) {
      this.heli.spinRotor(dt);
      this.hud.update(0);
      this.renderer.render(this.scene, this.camera3);
      return;
    }

    this.time += dt;
    this.advanceClock(dt * 1.2);
    this.updateSun();

    // Input-driven actions.
    if (this.input.pressed('Escape')) { this.togglePause(true); this.input.endFrame(); return; }
    if (this.input.pressed('KeyE')) this.tryInteract();
    this.wheelOpen = this.input.down('KeyQ');
    for (let i = 0; i < 5; i++) {
      if (this.input.pressed(`Digit${i + 1}`)) {
        if (this.activeShopPanel) this.shop.buy(this.activeShopPanel, i);
        else {
          const res = this.arsenal.select(i, this.respect);
          if (!res.ok) this.showMessage(res.reason, 2.5);
          else this.audio.click();
        }
      }
    }
    if (this.player.inVehicle && this.input.pressed('KeyR')) this.radio.next();

    // Driving or walking.
    if (this.player.inVehicle) {
      const v = this.player.inVehicle;
      const axis = this.input.axis();
      const boost = (this.input.down('ShiftLeft') || this.input.down('ShiftRight')) && this.shop.tiers.nitro > 0;
      v.update(dt, axis.z, axis.x, this.shop.tiers, boost);
      const hit = resolveCollisions(v.pos, 2.0, this.allColliders());
      if (hit) v.speed *= -0.22;
      this.resolveVehicleBumps(v, dt);
    }
    this.player.update(dt, this);

    // Shooting.
    const def = this.arsenal.def;
    if (this.input.mouseEdge || (def.auto && this.input.mouseDown)) this.combat.fire();
    this.arsenal.updateReload(performance.now() / 1000);

    // The living city and the law.
    this.traffic.update(dt, this);
    this.peds.update(dt, this);
    this.police.maintain(this);
    this.police.update(dt, this);
    this.roadblocks.maintain(dt, this);
    this.heli.update(dt, this);
    this.wanted.update(dt, this.seenRecently());
    if (this.wanted.stars !== this.lastStars) {
      this.dispatch.starsChanged(this.wanted.stars);
      this.lastStars = this.wanted.stars;
    }
    this.checkBusted(dt);
    this.checkNearMiss(dt);
    this.jobs.update(dt);
    this.combat.update(dt);
    this.shop.update();
    this.safehouses.update();
    this.radio.setPlaying(!!this.player.inVehicle);
    this.radio.update(dt);
    this.audio.engineSet(!!this.player.inVehicle, this.player.inVehicle ? Math.abs(this.player.inVehicle.speed) / 40 : 0);
    const nearestUnit = this.police.units.length
      ? Math.min(...this.police.units.map((u) => u.pos.distanceTo(this.playerPos())))
      : 999;
    this.audio.sirenSet(this.wanted.stars > 0, nearestUnit);

    // Camera, panels, HUD.
    const target = this.player.inVehicle ? this.player.inVehicle.pos : this.player.pos;
    const heading = this.player.inVehicle ? this.player.inVehicle.heading : this.player.heading;
    this.camera.mode = this.player.inVehicle ? 'car' : 'foot';
    this.camera.update(dt, target, heading, this.input);
    this.refreshPanels();
    this.hud.setPrompt(this.computePrompt());
    this.hud.update(dt);
    this.renderer.render(this.scene, this.camera3);
    this.input.endFrame();
  }

  resolveVehicleBumps(v, dt) {
    this.policeHitCooldown -= dt;
    for (const other of this.allSolidVehicles()) {
      if (other === v) continue;
      const dx = v.pos.x - other.pos.x, dz = v.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < 3.6) {
        const push = (3.6 - d) / 2;
        v.pos.x += (dx / d) * push;
        v.pos.z += (dz / d) * push;
        if (other.driver === 'ai' || other.driver === 'parked') { other.speed = v.speed * 0.45; }
        if (other.driver === 'police' && this.policeHitCooldown <= 0) {
          this.wanted.addHeat(24);
          this.dispatch.crimeReported('collision with a patrol car', districtAt(v.pos.x, v.pos.z));
          this.policeHitCooldown = 2.5;
        }
        v.speed *= 0.55;
      }
    }
  }

  checkBusted(dt) {
    if (this.wanted.stars < 1 || !this.police.units.length) { this.bustedTimer = 0; return; }
    const speed = this.player.inVehicle ? Math.abs(this.player.inVehicle.speed) : this.player.moveSpeed;
    const nearest = Math.min(...this.police.units.map((u) => u.pos.distanceTo(this.playerPos())));
    if (speed < 1.6 && nearest < 9.5) {
      this.bustedTimer += dt;
      if (this.bustedTimer > 2.2) { this.bustedTimer = 0; this.onBusted(); }
    } else this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
  }

  checkNearMiss(dt) {
    this.nearMissCooldown -= dt;
    if (!this.player.inVehicle || this.nearMissCooldown > 0) return;
    const v = this.player.inVehicle;
    if (Math.abs(v.speed) < 18) return;
    for (const other of this.traffic.cars) {
      if (v.pos.distanceTo(other.pos) < 4.6) {
        this.addRespect(2);
        this.nearMissCooldown = 3;
        break;
      }
    }
  }

  updateSun() {
    const hour = this.clockMinutes / 60;
    let a = SUN_STOPS[0], b = SUN_STOPS[SUN_STOPS.length - 1];
    for (let i = 0; i < SUN_STOPS.length - 1; i++) {
      if (hour >= SUN_STOPS[i].h && hour <= SUN_STOPS[i + 1].h) { a = SUN_STOPS[i]; b = SUN_STOPS[i + 1]; break; }
    }
    const span = Math.max(0.001, b.h - a.h);
    const t = Math.max(0, Math.min(1, (hour - a.h) / span));
    const ca = new THREE.Color(a.bg), cb = new THREE.Color(b.bg);
    this.scene.background.copy(ca.lerp(cb, t));
    const fa = new THREE.Color(a.fog), fb = new THREE.Color(b.fog);
    this.scene.fog.color.copy(fa.lerp(fb, t));
    const sa = new THREE.Color(a.sun), sb = new THREE.Color(b.sun);
    this.sun.color.copy(sa.lerp(sb, t));
    this.sun.intensity = a.i + (b.i - a.i) * t;
    const ang = ((hour - 6) / 12) * Math.PI;
    this.sun.position.set(Math.cos(ang) * -170, Math.sin(ang) * 150 + 24, 70);
    this.sun.target.position.set(0, 0, 0);
    this.hemi.intensity = 0.45 + this.sun.intensity * 0.35;
  }

  // ---------- debug hooks (tests + staging) ----------
  get debug() {
    const g = this;
    return {
      setWanted: (n) => { g.wanted.setStars(n); g.police.maintain(g); g.roadblocks.maintain(0, g); if (n >= 4) g.heli.update(0.016, g); },
      teleportToObjective: () => g.jobs.teleportToObjective(),
      teleportTo: (x, z) => {
        if (g.player.inVehicle) { g.player.inVehicle.pos.set(x, 0, z); g.player.pos.set(x, 0, z); }
        else g.player.pos.set(x, 0, z);
        g.camera.snap = true;
      },
      fireOnce: () => g.combat.fire(),
      shootNearestPed: () => {
        const ped = g.peds.peds.filter((p) => p.alive).sort((a, b) => a.pos.distanceTo(g.player.pos) - b.pos.distanceTo(g.player.pos))[0];
        if (!ped) return null;
        const before = { mag: g.arsenal.mags[g.arsenal.def.id], hp: ped.hp };
        // Park the camera at Kai's shoulder, aimed at the pedestrian's chest.
        const dir = ped.pos.clone().sub(g.player.pos); dir.y = 0; dir.normalize();
        const eye = g.player.pos.clone(); eye.y = 1.6; eye.addScaledVector(dir, -0.6);
        const chest = ped.pos.clone(); chest.y = 1.05;
        g.camera.yaw = Math.atan2(dir.x, dir.z);
        g.camera.placeDirect(eye, chest);
        g.combat.fire();
        return { before, after: { mag: g.arsenal.mags[g.arsenal.def.id], hp: ped.hp } };
      },
      buyEngine: () => { g.shop.buyGarage(0); return g.shop.tiers.engine; },
      useFirstSafehouse: () => {
        const house = g.safehouses.markers[0].house;
        g.player.pos.set(house.x + 2, 0, house.z + 2);
        return g.safehouses.use(house);
      },
      topSpeed: () => {
        const v = g.player.inVehicle || g.traffic.parked[0];
        return v.topSpeed(g.shop.tiers);
      },
      state: () => ({
        cash: g.cash, respect: g.respect.points, rank: g.respect.rankName, day: g.day,
        stars: g.wanted.stars, weapon: g.arsenal.def.name, mag: g.arsenal.mags[g.arsenal.def.id],
        station: g.radio.stationName, paused: g.paused, inVehicle: !!g.player.inVehicle,
        playerPos: { x: g.player.pos.x, z: g.player.pos.z },
        speed: g.player.inVehicle ? g.player.inVehicle.speed : g.player.moveSpeed,
        heliActive: g.heli.active, heliStatus: g.heli.status,
        roster: g.dispatch.buildRoster(g.police.units, g.roadblocks.blocks, g.heli, g.playerPos()),
        roadblocks: g.roadblocks.activeCount,
        jobsCompleted: g.jobs.completed, jobIndex: g.jobs.index, jobDone: g.jobs.done,
        banner: g.jobs.bannerTitle(),
        saveExists: g.save.exists(),
        engineTier: g.shop.tiers.engine,
        hp: g.player.hp,
      }),
    };
  }
}

const game = new OpenWorldGame();
window.__game = game;
