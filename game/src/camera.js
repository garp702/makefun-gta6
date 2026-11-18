// Chase camera: orbits with the mouse yaw/pitch, sits higher and further
// back when driving, and always looks at the player (or the player's car).
import * as THREE from 'three';

export class ChaseCamera {
  constructor(camera) { this.camera = camera; this.smooth = new THREE.Vector3(0, 6, -10); }
  update(dt, targetPos, input, driving) {
    const dist = driving ? 11.5 : 7.5;
    const height = driving ? 4.6 : 3.1;
    const back = new THREE.Vector3(
      targetPos.x - Math.sin(input.yaw) * Math.cos(input.pitch) * dist,
      targetPos.y + height + Math.sin(input.pitch) * dist * 0.7,
      targetPos.z - Math.cos(input.yaw) * Math.cos(input.pitch) * dist,
    );
    const k = Math.min(1, dt * (driving ? 5 : 8));
    this.smooth.lerp(back, k);
    if (this.smooth.y < 1.2) this.smooth.y = 1.2;
    this.camera.position.copy(this.smooth);
    this.camera.lookAt(targetPos.x, targetPos.y + 1.4, targetPos.z);
  }
  snap(targetPos, input, driving) {
    const dist = driving ? 11.5 : 7.5;
    this.smooth.set(
      targetPos.x - Math.sin(input.yaw) * dist,
      targetPos.y + (driving ? 4.6 : 3.1),
      targetPos.z - Math.cos(input.yaw) * dist,
    );
    this.camera.position.copy(this.smooth);
    this.camera.lookAt(targetPos.x, targetPos.y + 1.4, targetPos.z);
  }
}
