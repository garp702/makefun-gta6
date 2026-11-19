// PedestrianSystem: the walkers of Serena Bay. They amble along the sidewalks
// in bright holiday clothes, scatter when a car bears down or a shot cracks out,
// and go down when they are hit. The pool quietly refills from the side streets
// so the city never feels empty.

import * as THREE from 'three';
import { STREETS } from './city.js';

const SHIRTS = [0xe74c3c, 0xf2b138, 0x2ea8a0, 0xecf0f1, 0x9b59b6, 0x3498db, 0xe67e22, 0xfd79a8];
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export function createPersonMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.24), new THREE.MeshLambertMaterial({ color: pants }));
  legs.position.y = 0.38; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.28), new THREE.MeshLambertMaterial({ color: shirt }));
  torso.position.y = 1.08; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.62; g.add(head);
  return g;
}

export class Pedestrian {
  constructor(scene, rng, x, z) {
    this.mesh = createPersonMesh(
      SHIRTS[(rng() * SHIRTS.length) | 0],
      SHIRTS[(rng() * SHIRTS.length) | 0] ^ 0x555555,
      SKIN[(rng() * SKIN.length) | 0],
    );
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.hp = 40;
    this.alive = true;
    this.heading = rng() * Math.PI * 2;
    this.speed = 1.1 + rng() * 0.7;
    this.fleeTimer = 0;
    this.fleeFrom = new THREE.Vector3();
    this.turnTimer = 2 + rng() * 5;
    this.deadTimer = 0;
    this.rng = rng;
  }
  get pos() { return this.mesh.position; }
}

export class PedestrianSystem {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.peds = [];
    for (let i = 0; i < 26; i++) this.spawn();
  }

  spawn() {
    const rng = this.rng;
    const vertical = rng() < 0.5;
    const street = STREETS[(rng() * STREETS.length) | 0];
    const side = (rng() < 0.5 ? -8.2 : 8.2);
    const along = -175 + rng() * 350;
    const x = vertical ? street + side : along;
    const z = vertical ? along : street + side;
    const ped = new Pedestrian(this.scene, rng, x, z);
    ped.heading = vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
    this.peds.push(ped);
    return ped;
  }

  // Gunfire or a fast car nearby: everyone runs from the point.
  alert(point, radius = 26) {
    for (const ped of this.peds) {
      if (ped.alive && ped.pos.distanceTo(point) < radius) {
        ped.fleeTimer = 3.2;
        ped.fleeFrom.copy(point);
      }
    }
  }

  hit(ped, damage) {
    if (!ped.alive) return false;
    ped.hp -= damage;
    if (ped.hp <= 0) {
      ped.alive = false;
      ped.deadTimer = 6;
      ped.mesh.rotation.x = Math.PI / 2;
      ped.mesh.position.y = 0.25;
      return true;
    }
    ped.fleeTimer = 3;
    ped.fleeFrom.copy(ped.pos);
    return false;
  }

  update(dt, game) {
    let aliveCount = 0;
    for (const ped of this.peds) {
      if (!ped.alive) {
        ped.deadTimer -= dt;
        if (ped.deadTimer < 2) ped.mesh.position.y = Math.max(-1.2, ped.mesh.position.y - dt * 0.5);
        continue;
      }
      aliveCount++;
      let speed = ped.speed;
      if (ped.fleeTimer > 0) {
        ped.fleeTimer -= dt;
        const away = Math.atan2(ped.pos.x - ped.fleeFrom.x, ped.pos.z - ped.fleeFrom.z);
        ped.heading = away;
        speed = 4.4;
      } else {
        ped.turnTimer -= dt;
        if (ped.turnTimer <= 0) {
          ped.turnTimer = 3 + this.rng() * 6;
          ped.heading += (this.rng() - 0.5) * 1.2;
          // Drift back toward the nearest sidewalk line so walkers stay urban.
          const nearX = nearestOf(STREETS, ped.pos.x);
          const nearZ = nearestOf(STREETS, ped.pos.z);
          if (Math.abs(ped.pos.x - nearX) > 14 && Math.abs(ped.pos.z - nearZ) > 14) {
            ped.heading = Math.atan2(nearX - ped.pos.x, nearZ - ped.pos.z);
          }
        }
      }
      // Cars bearing down make walkers dodge even without a formal alert.
      for (const v of game.allSolidVehicles()) {
        if (Math.abs(v.speed) > 7 && v.pos.distanceTo(ped.pos) < 6) {
          ped.fleeTimer = Math.max(ped.fleeTimer, 1.2);
          ped.fleeFrom.copy(v.pos);
        }
      }
      ped.pos.x += Math.sin(ped.heading) * speed * dt;
      ped.pos.z += Math.cos(ped.heading) * speed * dt;
      ped.pos.x = THREE.MathUtils.clamp(ped.pos.x, -185, 200);
      ped.pos.z = THREE.MathUtils.clamp(ped.pos.z, -190, 190);
      ped.mesh.rotation.y = ped.heading;
      ped.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.008 + ped.pos.x)) * 0.045;
    }
    for (const p of this.peds) if (!p.alive && p.deadTimer <= -1) this.scene.remove(p.mesh);
    this.peds = this.peds.filter((p) => p.alive || p.deadTimer > -1);
    if (aliveCount < 20 && this.rng() < dt * 0.7) this.spawn();
  }
}

function nearestOf(list, v) {
  let best = list[0];
  for (const s of list) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}
