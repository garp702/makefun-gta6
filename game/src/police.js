// PoliceSystem: the BCPD's ground response. Cruiser units spawn on the streets
// around the player in the numbers dispatch authorizes, hunt to the player's last
// known position, and ram, box-in and — at four stars — shoot. A unit whose car is
// wrecked is out of the chase; a unit left far behind is rotated back in fresh.

import * as THREE from 'three';
import { Vehicle } from './vehicles.js';
import { GROUND_OFFICERS } from './dispatch.js';
import { STREETS, nearestStreet } from './city.js';

export class PoliceUnit {
  constructor(scene, officer, x, z) {
    this.officer = officer;
    this.vehicle = new Vehicle('cruiser', 0xf4f6f7, x, z, Math.PI);
    this.vehicle.driver = 'police';
    scene.add(this.vehicle.mesh);
    this.status = 'EN ROUTE';
    this.lastKnown = new THREE.Vector3(x, 0, z);
    this.lastSeenAt = -Infinity;
    this.shootTimer = 1 + Math.random();
    this.flashPhase = Math.random() * 2;
  }
  get disabled() { return this.vehicle.disabled; }
  get pos() { return this.vehicle.pos; }
}

export class PoliceSystem {
  constructor(scene) {
    this.scene = scene;
    this.units = [];
    this.officerCursor = 0;
    this.time = 0;
  }

  spawnUnitAt(x, z, officerIdx) {
    const officer = GROUND_OFFICERS[officerIdx % GROUND_OFFICERS.length];
    const unit = new PoliceUnit(this.scene, officer, x, z);
    this.units.push(unit);
    return unit;
  }

  spawnNear(playerPos) {
    // Pick a street point 65-85m out, on a road, in a random direction.
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2;
      const d = 65 + Math.random() * 20;
      const x = playerPos.x + Math.sin(a) * d;
      const z = playerPos.z + Math.cos(a) * d;
      if (x < -180 || x > 200 || z < -185 || z > 185) continue;
      const onX = Math.abs(x - nearestStreet(x)) < 6.5;
      const onZ = Math.abs(z - nearestStreet(z)) < 6.5;
      if (!onX && !onZ) continue;
      return this.spawnUnitAt(onX ? nearestStreet(x) : x, onZ ? nearestStreet(z) : z, this.officerCursor++);
    }
    return this.spawnUnitAt(nearestStreet(playerPos.x), playerPos.z + 70, this.officerCursor++);
  }

  removeUnit(unit) {
    this.scene.remove(unit.vehicle.mesh);
    this.units.splice(this.units.indexOf(unit), 1);
  }

  // Keep the on-street count at what dispatch authorized for the star level.
  maintain(game) {
    const want = game.dispatch.responseFor(game.wanted.stars).units;
    const active = this.units.filter((u) => !u.disabled);
    if (active.length < want) this.spawnNear(game.playerPos());
    for (const u of [...this.units]) {
      if (u.pos.distanceTo(game.playerPos()) > 175) this.removeUnit(u);
    }
    while (this.units.filter((u) => !u.disabled).length > want && this.units.length) {
      // Extras peel off: remove the farthest healthy unit when stars fall.
      const healthy = this.units.filter((u) => !u.disabled);
      if (!healthy.length) break;
      healthy.sort((a, b) => b.pos.distanceTo(game.playerPos()) - a.pos.distanceTo(game.playerPos()));
      this.removeUnit(healthy[0]);
    }
  }

  update(dt, game) {
    this.time += dt;
    const playerPos = game.playerPos();
    const response = game.dispatch.responseFor(game.wanted.stars);
    for (const unit of this.units) {
      const car = unit.vehicle;
      // Lightbar strobes.
      const bar = car.mesh.userData.lightbar;
      if (bar) {
        const phase = Math.sin(this.time * 9 + unit.flashPhase * 4) > 0;
        bar.children[1].visible = phase;
        bar.children[2].visible = !phase;
      }
      if (unit.disabled) { unit.status = 'DISABLED'; car.speed = 0; continue; }

      const dist = car.pos.distanceTo(playerPos);
      const seen = dist < 78;
      if (seen) {
        unit.lastKnown.copy(playerPos);
        unit.lastSeenAt = this.time;
        game.notePlayerSeen();
      }
      unit.status = dist >= 70 ? 'EN ROUTE' : (this.time - unit.lastSeenAt > 4 ? 'SEARCHING' : 'PURSUING');

      // Drive at the player (or the last place they were seen).
      const target = seen ? playerPos : unit.lastKnown;
      const toT = new THREE.Vector3().subVectors(target, car.pos); toT.y = 0;
      const wantHeading = Math.atan2(toT.x, toT.z);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = THREE.MathUtils.clamp(dh * 1.7, -1, 1);
      let throttle = 1;
      if (dist < 7 && !game.player.inVehicle) throttle = dist < 4 ? -0.2 : 0.15; // creep up on a runner
      if (dist < 3.2) throttle = -0.5; // don't run the suspect down
      car.update(dt, throttle, steer, null, false);
      // Cruisers get a quiet catch-up surge when the chase strings out.
      if (dist > 55 && dist < 120) {
        const f = car.forward();
        car.pos.x += f.x * 6.5 * dt;
        car.pos.z += f.z * 6.5 * dt;
      }

      // Armed response at four stars and up.
      if (response.armed && seen && dist < 37) {
        unit.shootTimer -= dt;
        if (unit.shootTimer <= 0) {
          unit.shootTimer = 1.05 + Math.random() * 0.55;
          game.combat.policeShoot(unit);
        }
      }
    }
  }
}
