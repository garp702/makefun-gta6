// CombatSystem: hitscan gunfire and fists. Shots raycast from the camera through
// the crosshair into the game's shootable meshes — pedestrians, traffic, police
// cruisers — with a muzzle flash, a fading tracer and per-weapon spread, pellet
// counts and damage. BCPD return fire at high stars comes through here too.

import * as THREE from 'three';

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.flash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.flashLight = new THREE.PointLight(0xffc46a, 0, 18, 1.6);
    game.scene.add(this.flash);
    game.scene.add(this.flashLight);
    this.flashTimer = 0;
  }

  muzzlePos() {
    const g = this.game;
    const base = g.player.inVehicle ? g.player.inVehicle.pos : g.player.pos;
    const dir = g.camera.viewDir();
    return new THREE.Vector3(base.x + dir.x * 0.7, 1.45, base.z + dir.z * 0.7);
  }

  addTracer(from, to, color = 0xffe9a8) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(geo, mat);
    this.game.scene.add(line);
    this.tracers.push({ line, ttl: 0.09 });
  }

  // One trigger pull of the current weapon. Returns true if a shot happened.
  fire() {
    const g = this.game;
    const arsenal = g.arsenal;
    const now = performance.now() / 1000;
    arsenal.updateReload(now);
    if (!arsenal.canFire(now)) return false;
    const def = arsenal.def;
    arsenal.consume(now);
    g.audio.shot(def.kind);

    const origin = g.camera.camera.position.clone();
    const aim = new THREE.Vector3();
    g.camera.camera.getWorldDirection(aim);
    const muzzle = this.muzzlePos();

    if (def.kind === 'fists') {
      // Swing: anything soft within reach and in front takes it.
      const f = g.camera.viewDir();
      for (const ped of g.peds.peds) {
        if (!ped.alive) continue;
        const d = ped.pos.distanceTo(g.player.pos);
        const dot = (ped.pos.x - g.player.pos.x) * f.x + (ped.pos.z - g.player.pos.z) * f.z;
        if (d < def.range && dot > 0) {
          const killed = g.peds.hit(ped, def.damage);
          g.onPedStruck(ped, killed);
          break;
        }
      }
      return true;
    }

    // Gunfire draws eyes: a little heat whenever the city can hear it.
    g.wanted.addHeat(4);
    g.peds.alert(g.player.pos, 26);
    this.flashTimer = 0.05;
    this.flash.position.copy(muzzle);
    this.flash.lookAt(muzzle.clone().add(aim));
    this.flash.material.opacity = 0.95;
    this.flashLight.position.copy(muzzle);
    this.flashLight.intensity = 60;

    for (let p = 0; p < def.pellets; p++) {
      const dir = aim.clone();
      dir.x += (Math.random() - 0.5) * 2 * def.spread * 10 * 0.1;
      dir.y += (Math.random() - 0.5) * 2 * def.spread * 10 * 0.1;
      dir.z += (Math.random() - 0.5) * 2 * def.spread * 10 * 0.1;
      dir.normalize();
      this.raycaster.set(origin, dir);
      this.raycaster.far = def.range;
      const hits = this.raycaster.intersectObjects(g.getShootables(), true);
      let end = origin.clone().add(dir.clone().multiplyScalar(def.range));
      if (hits.length) {
        const hit = hits[0];
        end = hit.point;
        const ref = findHitRef(hit.object);
        if (ref) this.applyHit(ref, def.damage);
      }
      if (p === 0) this.addTracer(muzzle, end);
    }
    return true;
  }

  applyHit(ref, damage) {
    const g = this.game;
    if (ref.type === 'ped') {
      const killed = g.peds.hit(ref.obj, damage);
      g.onPedStruck(ref.obj, killed);
    } else if (ref.type === 'vehicle') {
      const v = ref.obj;
      const wasDisabled = v.disabled;
      v.damage(damage, v.driver === 'player' ? g.shop.tiers : null);
      if (v.driver === 'police') {
        g.wanted.addHeat(14);
        if (v.disabled && !wasDisabled) {
          g.dispatch.say('Dispatch: unit disabled! Suspect is shooting at officers!');
          g.addRespect(15);
        }
      }
    }
  }

  // BCPD return fire: a tracer, a crack, and damage if the dice land.
  policeShoot(unit) {
    const g = this.game;
    const from = unit.pos.clone(); from.y = 1.25;
    const to = g.player.pos.clone(); to.y = 1.2;
    this.addTracer(from, to, 0xff9a7a);
    g.audio.shot('pistol');
    const dist = from.distanceTo(to);
    const hitChance = Math.max(0.12, 0.58 - dist * 0.008);
    if (Math.random() < hitChance) g.damagePlayer(3.5 + Math.random() * 3.5);
  }

  update(dt) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) { this.flash.material.opacity = 0; this.flashLight.intensity = 0; }
    }
    for (const t of [...this.tracers]) {
      t.ttl -= dt;
      t.line.material.opacity = Math.max(0, t.ttl / 0.09) * 0.85;
      if (t.ttl <= 0) {
        this.game.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(this.tracers.indexOf(t), 1);
      }
    }
  }
}

function findHitRef(object) {
  let o = object;
  while (o) {
    if (o.userData && o.userData.hitRef) return o.userData.hitRef;
    o = o.parent;
  }
  return null;
}
