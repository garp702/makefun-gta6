// Serena Bay PD ground units: three named officers in marked cars.
// Each unit reports a live status — PURSUING when close and closing,
// EN ROUTE while driving to the player, SEARCHING when the trail is cold.
import { Vehicle } from './vehicles.js';

export const OFFICERS = [
  { name: 'Ofc. Dana Reyes', unit: 'Unit 7' },
  { name: 'Ofc. Marcus Vale', unit: 'Unit 12' },
  { name: 'Sgt. Priya Nair', unit: 'Unit 3' },
];

export class Police {
  constructor(scene) {
    this.units = OFFICERS.map((o, i) => {
      const v = new Vehicle(scene, -140 + i * 30, -140, 0, 0xf5f6fa, 'police');
      v.topSpeed = 36; v.accel = 15;
      v.mesh.visible = false;
      return { ...o, vehicle: v, status: 'EN ROUTE', active: false, searchAngle: i * 2.1 };
    });
  }
  activeCount(wanted) { return wanted >= 3 ? 3 : wanted >= 1 ? wanted : 0; }
  update(dt, wanted, targetPos, t) {
    const n = this.activeCount(wanted);
    let anySee = false;
    this.units.forEach((u, i) => {
      u.active = i < n && wanted > 0;
      const v = u.vehicle;
      v.mesh.visible = u.active;
      if (!u.active) { u.status = 'STANDBY'; return; }
      const d = v.pos.distanceTo(targetPos);
      if (d < 60) anySee = true;
      let dest = targetPos, cruise = 30;
      if (wanted === 1 && d > 55) { u.status = 'SEARCHING'; dest = null; }
      else u.status = d < 26 ? 'PURSUING' : 'EN ROUTE';
      if (dest) {
        // Steer toward a point slightly behind the target, per-unit offset.
        const back = 5 + i * 3;
        const tx = dest.x - Math.sin(Math.atan2(dest.x - v.pos.x, dest.z - v.pos.z)) * 0 + (i - 1) * 4;
        const tz = dest.z - back;
        const ang = Math.atan2(tx - v.pos.x, tz - v.pos.z);
        let diff = ang - v.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 1.6));
        const throttle = Math.abs(diff) > 2.2 ? -0.6 : 1;
        v.update(dt, throttle, steer);
        if (v.speed > cruise) v.speed = cruise;
      } else {
        u.searchAngle += dt * 0.25;
        const cx = targetPos.x + Math.cos(u.searchAngle + i * 2) * 34;
        const cz = targetPos.z + Math.sin(u.searchAngle + i * 2) * 34;
        const ang = Math.atan2(cx - v.pos.x, cz - v.pos.z);
        let diff = ang - v.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        v.update(dt, 0.7, Math.max(-1, Math.min(1, diff * 1.6)));
        if (v.speed > 14) v.speed = 14;
      }
      const bar = v.mesh.userData.lightBar;
      if (bar) bar.material.emissiveIntensity = (Math.sin(t * 9 + i * 2) > 0) ? 1.8 : 0.15;
      u.distance = Math.round(d);
    });
    return anySee;
  }
  spawnNear(pos) {
    for (const u of this.units) {
      if (u.vehicle.pos.distanceTo(pos) > 70) {
        u.vehicle.pos.set(pos.x + (Math.random() - 0.5) * 60, 0, pos.z - 46);
        u.vehicle.speed = 0;
      }
    }
  }
  panelLines() {
    return this.units.map((u) => ({
      name: `${u.name} — ${u.unit}`,
      status: u.active ? u.status : 'STANDBY',
      distance: u.active ? u.distance ?? 0 : null,
    }));
  }
}
