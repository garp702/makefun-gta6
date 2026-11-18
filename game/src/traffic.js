// Ambient traffic: cars loop the road grid, turning at intersections.
// Deterministic spawn points come from the shared seeded RNG.
import { Vehicle, civilianColor } from './vehicles.js';
import { GRID, mulberry } from './city.js';

export class Traffic {
  constructor(scene, seed = 21) {
    this.cars = [];
    const rnd = mulberry(seed);
    for (let i = 0; i < 9; i++) {
      const vertical = rnd() > 0.5;
      const lane = GRID[Math.floor(rnd() * GRID.length)];
      const along = -140 + rnd() * 280;
      const dir = rnd() > 0.5 ? 1 : -1;
      const x = vertical ? lane + 3.2 * dir : along;
      const z = vertical ? along : lane - 3.2 * dir;
      const heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      const v = new Vehicle(scene, x, z, heading, civilianColor(i));
      v.topSpeed = 13; v.trafficDir = dir; v.vertical = vertical; v.lane = lane;
      v.cruise = 9 + rnd() * 4;
      this.cars.push(v);
    }
  }
  update(dt) {
    for (const v of this.cars) {
      if (v.occupied) continue; // the player is driving this one
      const target = v.cruise;
      v.speed += Math.sign(target - v.speed) * Math.min(Math.abs(target - v.speed), 6 * dt);
      const f = v.forward();
      v.pos.x += f.x * v.speed * dt;
      v.pos.z += f.z * v.speed * dt;
      if (v.pos.x > 165 || v.pos.x < -165 || v.pos.z > 165 || v.pos.z < -165) {
        // Wrap to the opposite edge of the same lane.
        if (v.vertical) v.pos.z = v.pos.z > 0 ? -160 : 160; else v.pos.x = v.pos.x > 0 ? -160 : 160;
      }
      v.mesh.rotation.y = v.heading;
      for (const w of v.mesh.userData.wheels) w.rotation.x += (v.speed * dt) / 0.36;
    }
  }
  nearest(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const v of this.cars) {
      const d = v.pos.distanceTo(pos);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
}
