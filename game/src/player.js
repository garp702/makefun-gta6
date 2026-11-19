// PlayerCharacter: Kai Mercer on foot — WASD movement steered by the camera,
// Shift to sprint, E to slip into the nearest car. Movement is camera-relative:
// W walks away from the camera, D strafes to the camera's right. In a car, Kai's
// position is the car's; stepping out puts him at the driver's door. Health and
// body armor live here; armor drinks 60% of every hit until it is gone.

import * as THREE from 'three';
import { createPersonMesh } from './pedestrians.js';
import { resolveCollisions } from './city.js';

export class PlayerCharacter {
  constructor(scene) {
    this.mesh = createPersonMesh(0x0f766e, 0x1f2937, 0xc68642);
    // Kai's gold cap.
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.44), new THREE.MeshLambertMaterial({ color: 0xf2b138 }));
    cap.position.y = 1.86;
    this.mesh.add(cap);
    this.mesh.position.set(150, 0, 130);
    scene.add(this.mesh);
    this.heading = Math.PI;
    this.hp = 100;
    this.armor = 0;
    this.inVehicle = null;
    this.moveSpeed = 0; // last frame's on-foot speed, for tests and the busted check
    this.walkPhase = 0;
  }

  get pos() { return this.mesh.position; }

  update(dt, game) {
    if (this.inVehicle) {
      this.pos.copy(this.inVehicle.pos);
      this.moveSpeed = Math.abs(this.inVehicle.speed);
      return;
    }
    const axis = game.input.axis();
    const sprint = game.input.down('ShiftLeft') || game.input.down('ShiftRight');
    const camYaw = game.camera.yaw;
    // Camera-relative: forward is where the camera looks, right is its right hand.
    const f = { x: Math.sin(camYaw), z: Math.cos(camYaw) };
    const r = { x: -Math.cos(camYaw), z: Math.sin(camYaw) };
    let mx = f.x * axis.z + r.x * axis.x;
    let mz = f.z * axis.z + r.z * axis.x;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      mx /= len; mz /= len;
      const speed = sprint ? 8.4 : 5.1;
      this.moveSpeed = speed;
      const want = Math.atan2(mx, mz);
      let dh = want - this.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      this.heading += dh * Math.min(1, dt * 14);
      this.pos.x += mx * speed * dt;
      this.pos.z += mz * speed * dt;
      this.walkPhase += dt * speed * 1.6;
    } else {
      this.moveSpeed = 0;
    }
    resolveCollisions(this.pos, 0.55, game.allColliders());
    this.mesh.rotation.y = this.heading;
    this.mesh.position.y = this.moveSpeed > 0 ? Math.abs(Math.sin(this.walkPhase)) * 0.05 : 0;
  }

  enterVehicle(vehicle) {
    this.inVehicle = vehicle;
    vehicle.driver = 'player';
    this.mesh.visible = false;
    this.pos.copy(vehicle.pos);
  }

  exitVehicle(game) {
    const v = this.inVehicle;
    if (!v) return;
    const r = v.right();
    this.pos.set(v.pos.x + r.x * 2.6, 0, v.pos.z + r.z * 2.6);
    this.heading = v.heading;
    this.inVehicle = null;
    this.mesh.visible = true;
    resolveCollisions(this.pos, 0.55, game.allColliders());
    game.traffic.releaseCar(v);
  }

  // Armor soaks 60% of a hit until it runs dry. Returns true when Kai drops.
  damage(amount, game) {
    const absorbed = Math.min(this.armor, amount * 0.6);
    this.armor -= absorbed;
    this.hp -= (amount - absorbed);
    game.audio.hurt();
    return this.hp <= 0;
  }
}
