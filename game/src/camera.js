// ChaseCamera: a smooth third-person camera with two modes.
// In a car it sits long and low behind the tail; on foot it closes in over the
// shoulder. Its yaw is the aim direction for shooting, so it turns with the mouse
// while the pointer is locked and otherwise trails the player's heading.

import * as THREE from 'three';

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class ChaseCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI; // looking north (-z) at spawn
    this.pos = new THREE.Vector3(150, 4, 160);
    this.mode = 'foot';
    this.snap = true;
  }

  viewDir() {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  update(dt, targetPos, targetHeading, input) {
    const inCar = this.mode === 'car';
    // Mouse steers the view when locked; otherwise the view trails the heading.
    if (input && document.pointerLockElement) {
      this.yaw -= input.movementX * 0.0026;
    } else {
      const rate = inCar ? 5.5 : 2.6;
      this.yaw = lerpAngle(this.yaw, targetHeading, 1 - Math.exp(-dt * rate));
    }
    const dist = inCar ? 9.6 : 6.4;
    const height = inCar ? 3.7 : 2.7;
    const dir = this.viewDir();
    const desired = new THREE.Vector3(
      targetPos.x - dir.x * dist,
      targetPos.y + height,
      targetPos.z - dir.z * dist,
    );
    if (this.snap) {
      this.pos.copy(desired);
      this.snap = false;
    } else {
      this.pos.lerp(desired, 1 - Math.exp(-dt * (inCar ? 9 : 7)));
    }
    this.camera.position.copy(this.pos);
    const look = new THREE.Vector3(
      targetPos.x + dir.x * 5,
      targetPos.y + 1.55,
      targetPos.z + dir.z * 5,
    );
    this.camera.lookAt(look);
  }

  // Staging: park the camera in one exact spot (screenshots freeze the frame).
  placeDirect(pos, lookAt) {
    this.pos.copy(pos);
    this.camera.position.copy(pos);
    this.camera.lookAt(lookAt);
    this.yaw = Math.atan2(lookAt.x - pos.x, lookAt.z - pos.z);
  }
}
