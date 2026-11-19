// TrafficSystem: Serena Bay's ordinary drivers. A fleet of AI cars loops the
// street grid, braking for whatever is in front of them, while a row of parked
// cars waits along the kerbs — every one of them stealable. AI drivers steer by
// picking the next intersection and aiming for it, turning at random.

import * as THREE from 'three';
import { Vehicle, VEHICLE_KINDS } from './vehicles.js';
import { STREETS } from './city.js';

const AI_KINDS = ['sedan', 'sedan', 'coupe', 'pickup'];

export class TrafficSystem {
  constructor(scene, city, rng) {
    this.cars = [];
    this.parked = [];
    const kinds = Object.keys(VEHICLE_KINDS);

    for (let i = 0; i < 11; i++) {
      const kind = AI_KINDS[i % AI_KINDS.length];
      const color = VEHICLE_KINDS[kind].colors[(rng() * VEHICLE_KINDS[kind].colors.length) | 0];
      const onVertical = rng() < 0.5;
      const street = STREETS[(rng() * STREETS.length) | 0];
      const along = -170 + rng() * 340;
      const x = onVertical ? street : along;
      const z = onVertical ? along : street;
      const heading = onVertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const car = new Vehicle(kind, color, x, z, heading);
      car.driver = 'ai';
      car.ai = { target: null, speedWanted: 10.5 + rng() * 3 };
      scene.add(car.mesh);
      this.cars.push(car);
    }

    for (const spot of city.parkedSpots) {
      const kind = kinds[(rng() * 3) | 0];
      const color = VEHICLE_KINDS[kind].colors[(rng() * VEHICLE_KINDS[kind].colors.length) | 0];
      const car = new Vehicle(kind, color, spot.x, spot.z, spot.heading);
      car.driver = 'parked';
      scene.add(car.mesh);
      this.parked.push(car);
    }
  }

  allVehicles() { return [...this.cars, ...this.parked]; }

  // Stealable = parked, or an AI car the player has taken over is removed below.
  takeCar(car) {
    const aiIdx = this.cars.indexOf(car);
    if (aiIdx >= 0) this.cars.splice(aiIdx, 1);
    const pIdx = this.parked.indexOf(car);
    if (pIdx >= 0) this.parked.splice(pIdx, 1);
    car.driver = 'player';
  }

  releaseCar(car) {
    car.driver = 'parked';
    if (!this.parked.includes(car)) this.parked.push(car);
  }

  update(dt, game) {
    for (const car of this.cars) {
      if (car.disabled) continue;
      const ai = car.ai;
      if (!ai.target || car.pos.distanceTo(ai.target) < 6) {
        ai.target = this.nextTarget(car);
      }
      const toT = new THREE.Vector3().subVectors(ai.target, car.pos); toT.y = 0;
      const dist = toT.length();
      const wantHeading = Math.atan2(toT.x, toT.z);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      const steer = THREE.MathUtils.clamp(dh * 1.6, -1, 1);

      // Brake for the player or any vehicle close ahead.
      let throttle = 0.85;
      const f = car.forward();
      for (const other of game.allSolidVehicles()) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x, dz = other.pos.z - car.pos.z;
        const ahead = dx * f.x + dz * f.z;
        const side = Math.abs(dx * f.z - dz * f.x);
        if (ahead > 0 && ahead < 8.5 && side < 2.2) throttle = -0.4;
      }
      const pd = Math.hypot(game.player.pos.x - car.pos.x, game.player.pos.z - car.pos.z);
      if (pd < 7) throttle = Math.min(throttle, 0);
      if (car.speed > ai.speedWanted) throttle = Math.min(throttle, 0);
      car.update(dt, throttle, steer, null, false);
      if (dist < 6) ai.target = null;
    }
  }

  nextTarget(car) {
    // Head to the next intersection along the current street, then maybe turn.
    const f = car.forward();
    const step = 50;
    let nx = car.pos.x + f.x * step;
    let nz = car.pos.z + f.z * step;
    // Snap the cross axis back onto the street the car is following.
    if (Math.abs(f.z) > Math.abs(f.x)) nx = nearestOf(STREETS, car.pos.x);
    else nz = nearestOf(STREETS, car.pos.z);
    if (Math.random() < 0.4) {
      // Turn at the intersection: aim along the crossing street instead.
      if (Math.abs(f.z) > Math.abs(f.x)) nx += (Math.random() < 0.5 ? -50 : 50) * 0 + (Math.random() < 0.5 ? -1 : 1) * 0 + (Math.random() < 0.5 ? -50 : 50);
      else nz += (Math.random() < 0.5 ? -50 : 50);
    }
    nx = THREE.MathUtils.clamp(nx, -172, 172);
    nz = THREE.MathUtils.clamp(nz, -172, 172);
    return new THREE.Vector3(nx, 0, nz);
  }
}

function nearestOf(list, v) {
  let best = list[0];
  for (const s of list) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}
