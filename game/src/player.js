// The player on foot: WASD movement relative to the camera yaw, sprint on
// Shift, and a simple low-poly figure that bobs while walking.
import * as THREE from 'three';
import { makePersonMesh } from './pedestrians.js';

export class Player {
  constructor(scene) {
    this.mesh = makePersonMesh(0xffb347);
    this.mesh.position.set(-20.5, 0, 109.5);
    scene.add(this.mesh);
    this.heading = 0;
    this.hp = 100;
    this.walkPhase = 0;
    this.inCar = null; // Vehicle while driving
  }
  get pos() { return this.mesh.position; }
  update(dt, input, camYaw) {
    if (this.inCar) { this.mesh.visible = false; return; }
    this.mesh.visible = true;
    let mx = 0, mz = 0;
    if (input.down('KeyW')) mz += 1;
    if (input.down('KeyS')) mz -= 1;
    if (input.down('KeyA')) mx -= 1;
    if (input.down('KeyD')) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    const speed = input.down('ShiftLeft') || input.down('ShiftRight') ? 8.4 : 4.6;
    if (moving) {
      const ang = Math.atan2(mx, mz) + camYaw;
      this.heading = ang;
      this.pos.x += Math.sin(ang) * speed * dt;
      this.pos.z += Math.cos(ang) * speed * dt;
      this.pos.x = Math.max(-158, Math.min(168, this.pos.x));
      this.pos.z = Math.max(-158, Math.min(160, this.pos.z));
      this.walkPhase += dt * speed * 2.4;
      this.mesh.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.07;
    }
    this.mesh.rotation.y = this.heading;
  }
  enterCar(vehicle) {
    this.inCar = vehicle;
    vehicle.occupied = true;
    this.mesh.visible = false;
  }
  exitCar() {
    if (!this.inCar) return null;
    const v = this.inCar;
    v.occupied = false;
    this.inCar = null;
    const side = new THREE.Vector3(Math.cos(v.heading), 0, -Math.sin(v.heading));
    this.pos.copy(v.pos).addScaledVector(side, 2.4);
    this.pos.y = 0;
    this.mesh.visible = true;
    return v;
  }
}
