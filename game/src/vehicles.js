// VehicleFactory + Vehicle: every car in Serena Bay, from sleepy sedans to the
// BCPD cruiser with its lightbar and livery. Arcade physics: throttle, brake and
// steering feed a speed/heading model; garage tiers multiply the top speed, add
// armor and unlock nitro. Steering sign convention: pressing D (steer = +1) turns
// the car to ITS right — heading decreases while moving forward.

import * as THREE from 'three';

export const VEHICLE_KINDS = {
  sedan: { len: 4.4, wid: 1.9, topSpeed: 33, accel: 13, colors: [0xc23b2e, 0x2e6fc2, 0xd8d8d8, 0x30363c, 0x2ea8a0, 0xd9a441] },
  coupe: { len: 4.2, wid: 1.85, topSpeed: 38, accel: 16, colors: [0xf2b138, 0x8e44ad, 0x16a085, 0xecf0f1] },
  pickup: { len: 4.9, wid: 2.0, topSpeed: 30, accel: 12, colors: [0x7f8c8d, 0x935116, 0x1a5276] },
  cruiser: { len: 4.6, wid: 1.95, topSpeed: 40, accel: 17, colors: [0xf4f6f7] },
};

function cruiserLivery() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f6f7'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#123a5c'; g.fillRect(0, 44, 256, 40);
  g.fillStyle = '#ffffff'; g.font = 'bold 30px system-ui, sans-serif';
  g.textAlign = 'center'; g.fillText('BCPD', 128, 76);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
let liveryTex = null;

export function createVehicleMesh(kind, color) {
  const spec = VEHICLE_KINDS[kind];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2126 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x9fd4e8 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(spec.wid, 0.62, spec.len), kind === 'cruiser'
    ? new THREE.MeshLambertMaterial({ map: (liveryTex ??= cruiserLivery()) })
    : bodyMat);
  body.position.y = 0.55; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.wid - 0.35, 0.5, spec.len * 0.45), kind === 'pickup' ? bodyMat : glassMat);
  cabin.position.set(0, 1.05, kind === 'pickup' ? -spec.len * 0.18 : -spec.len * 0.04);
  group.add(cabin);
  if (kind === 'pickup') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(spec.wid - 0.2, 0.35, spec.len * 0.4), darkMat);
    bed.position.set(0, 0.95, spec.len * 0.24); group.add(bed);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  for (const [wx, wz] of [[-spec.wid / 2, spec.len / 2 - 0.8], [spec.wid / 2, spec.len / 2 - 0.8], [-spec.wid / 2, -spec.len / 2 + 0.8], [spec.wid / 2, -spec.len / 2 + 0.8]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
  }
  const lightGeo = new THREE.BoxGeometry(0.34, 0.1, 0.08);
  const head = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  head.position.set(-spec.wid / 2 + 0.3, 0.62, spec.len / 2 + 0.02); group.add(head);
  const head2 = head.clone(); head2.position.x = spec.wid / 2 - 0.3; group.add(head2);
  const tail = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xd42a20 }));
  tail.position.set(-spec.wid / 2 + 0.3, 0.62, -spec.len / 2 - 0.02); group.add(tail);
  const tail2 = tail.clone(); tail2.position.x = spec.wid / 2 - 0.3; group.add(tail2);

  if (kind === 'cruiser') {
    const bar = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.09, 0.4), darkMat);
    bar.add(base);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.36), new THREE.MeshBasicMaterial({ color: 0xff2a20 }));
    red.position.x = -0.33; bar.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.36), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    blue.position.x = 0.33; bar.add(blue);
    bar.position.set(0, 1.38, -0.2);
    group.add(bar);
    group.userData.lightbar = bar;
  }
  group.userData.len = spec.len;
  group.userData.wid = spec.wid;
  return group;
}

export class Vehicle {
  constructor(kind, color, x, z, heading) {
    this.kind = kind;
    this.spec = VEHICLE_KINDS[kind];
    this.mesh = createVehicleMesh(kind, color);
    this.mesh.position.set(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.hp = 100;
    this.driver = 'parked'; // 'parked' | 'ai' | 'police' | 'player'
    this.disabled = false;
    this.syncMesh();
  }

  get pos() { return this.mesh.position; }

  forward() { return { x: Math.sin(this.heading), z: Math.cos(this.heading) }; }
  right() { return { x: -Math.cos(this.heading), z: Math.sin(this.heading) }; }

  // Top speed with garage tiers applied (engine +9.7% a tier, as fitted in R6 tests).
  topSpeed(tiers) {
    const engine = tiers ? tiers.engine : 0;
    return this.spec.topSpeed * Math.pow(1.097, engine);
  }

  // throttle: -1..1 (brake/reverse below 0), steer: -1..1 (+1 = D = turn right).
  update(dt, throttle, steer, tiers, boost) {
    if (this.disabled) { this.speed = 0; return; }
    const top = this.topSpeed(tiers) * (boost ? 1.3 : 1);
    if (throttle > 0) {
      this.speed += this.spec.accel * throttle * dt * (this.speed < 0 ? 2.4 : 1);
      if (this.speed > top) this.speed = Math.max(top, this.speed - 22 * dt);
    } else if (throttle < 0) {
      this.speed += (this.speed > 0.5 ? -26 : -8) * dt;
      if (this.speed < -9) this.speed = -9;
    } else {
      this.speed -= this.speed * Math.min(1, 0.55 * dt) * 3.2 * dt * 3; // engine drag
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }
    if (steer !== 0 && this.speed !== 0) {
      const grip = Math.min(1, Math.abs(this.speed) / 9);
      this.heading -= steer * 1.85 * grip * dt * Math.sign(this.speed);
    }
    const f = this.forward();
    this.mesh.position.x += f.x * this.speed * dt;
    this.mesh.position.z += f.z * this.speed * dt;
    this.syncMesh();
  }

  syncMesh() {
    this.mesh.rotation.y = this.heading;
  }

  damage(amount, tiers) {
    const armor = tiers ? tiers.armor : 0;
    this.hp -= amount * (1 - armor * 0.18);
    if (this.hp <= 0 && !this.disabled) {
      this.disabled = true;
      this.speed = 0;
    }
  }
}
