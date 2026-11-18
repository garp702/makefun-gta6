// Low-poly car factory + the vehicle record every driver (player, traffic,
// police) shares: position lives on the THREE group, physics in plain fields.
import * as THREE from 'three';

const COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6, 0xecf0f1, 0x1abc9c];

export function makeCarMesh(color, kind = 'civilian') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.62, 4.3), bodyMat);
  body.position.y = 0.62; body.castShadow = true; g.add(body);
  const cabinMat = new THREE.MeshStandardMaterial({ color: kind === 'police' ? 0xf5f6fa : 0x22384a, roughness: 0.2, metalness: 0.4 });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), cabinMat);
  cabin.position.set(0, 1.18, -0.2); g.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14181a, roughness: 0.95 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); wheels.push(w);
  }
  if (kind === 'police') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.2, 4.34), new THREE.MeshStandardMaterial({ color: 0x1d4e89 }));
    stripe.position.y = 0.66; g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff2020, emissiveIntensity: 1.4 }));
    bar.position.set(0, 1.55, -0.2); g.add(bar); g.userData.lightBar = bar;
  }
  if (kind === 'player') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.5), bodyMat);
    spoiler.position.set(0, 1.05, -2.05); g.add(spoiler);
  }
  g.userData.wheels = wheels;
  return g;
}

export class Vehicle {
  constructor(scene, x, z, heading, color, kind = 'civilian') {
    this.mesh = makeCarMesh(color, kind);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.kind = kind;
    this.color = color;
    this.topSpeed = 34;      // m/s, raised to 40 by the garage Engine upgrade
    this.accel = 13;
    this.occupied = false;
    this.hp = 100;
  }
  get pos() { return this.mesh.position; }
  forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }
  update(dt, throttle, steer) {
    const top = throttle < 0 ? 12 : this.topSpeed;
    if (throttle !== 0) {
      this.speed += throttle * this.accel * dt;
    } else {
      this.speed -= this.speed * 1.4 * dt;
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }
    this.speed = Math.max(-12, Math.min(top, this.speed));
    if (Math.abs(this.speed) > 0.1) {
      this.heading -= steer * dt * 1.55 * Math.sign(this.speed) * Math.min(1, Math.abs(this.speed) / 9);
    }
    const f = this.forward();
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    this.pos.x = Math.max(-158, Math.min(168, this.pos.x));
    this.pos.z = Math.max(-158, Math.min(158, this.pos.z));
    this.mesh.rotation.y = this.heading;
    for (const w of this.mesh.userData.wheels) w.rotation.x += (this.speed * dt) / 0.36;
  }
  speedKmh() { return Math.abs(Math.round(this.speed * 3.6)); }
}

export function civilianColor(i) { return COLORS[i % COLORS.length]; }
