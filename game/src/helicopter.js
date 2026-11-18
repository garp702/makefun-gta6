// Air Unit Pelican — the PD helicopter, piloted by Rosa Quintana.
// Spawns when wanted reaches 4, tracks the player from the air with a
// visible spotlight cone, and withdraws when wanted drops below 3.
import * as THREE from 'three';

export class Helicopter {
  constructor(scene) {
    this.pilot = 'Rosa Quintana';
    this.name = 'Air Unit Pelican';
    this.active = false;
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.4, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 5.2), bodyMat);
    this.group.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), bodyMat);
    tail.position.set(0, 0.3, -4.4); this.group.add(tail);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.4, 5.26), new THREE.MeshStandardMaterial({ color: 0x1d4e89 }));
    stripe.position.y = -0.3; this.group.add(stripe);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0x22282c }));
    this.rotor.position.y = 1.25; this.group.add(this.rotor);
    this.tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.3), this.rotor.material);
    this.tailRotor.position.set(0.35, 0.3, -6.4); this.group.add(this.tailRotor);
    // Spotlight: a real SpotLight plus a translucent cone so players can
    // see the beam and stand in it for screenshots.
    this.spot = new THREE.SpotLight(0xfff2c0, 900, 90, 0.32, 0.45, 1.2);
    this.group.add(this.spot);
    this.spotTarget = new THREE.Object3D();
    scene.add(this.spotTarget);
    this.spot.target = this.spotTarget;
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(6.5, 26, 20, 1, true), coneMat);
    this.group.add(this.cone);
    this.group.visible = false;
    scene.add(this.group);
    this.distance = 0;
    this.status = 'STANDBY';
  }
  update(dt, wanted, targetPos, t) {
    const shouldFly = wanted >= 4;
    if (shouldFly && !this.active) {
      this.active = true;
      this.group.visible = true;
      this.group.position.set(targetPos.x - 34, 26, targetPos.z - 30);
    }
    if (wanted < 3 && this.active) {
      this.active = false;
      this.group.visible = false;
      this.status = 'STANDBY';
    }
    if (!this.active) return;
    // Orbit-track: hold a station ~40 m out from the target, 24 m up.
    const orbit = t * 0.16;
    const want = new THREE.Vector3(
      targetPos.x + Math.cos(orbit) * 30,
      24 + Math.sin(t * 0.7) * 1.6,
      targetPos.z + Math.sin(orbit) * 26,
    );
    this.group.position.lerp(want, Math.min(1, dt * 1.6));
    this.group.lookAt(targetPos.x, 0, targetPos.z);
    this.rotor.rotation.y += dt * 28;
    this.tailRotor.rotation.x += dt * 30;
    this.distance = Math.round(this.group.position.distanceTo(targetPos));
    this.status = `TRACKING · ${this.distance}m`;
    // Aim the beam at the target: cone hangs below the fuselage.
    this.spot.position.set(0, -1, 0);
    this.spotTarget.position.copy(targetPos);
    this.cone.position.set(0, -13.5, 0);
    this.cone.rotation.x = 0;
  }
  panelLine() {
    return this.active
      ? `${this.name} — Pilot ${this.pilot}: ${this.status}`
      : `${this.name} — standby`;
  }
}
