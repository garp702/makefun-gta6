// AirOneUnit: the BCPD's eye in the sky. From four stars, Air One — Pilot Rosa
// Quintana — orbits the suspect with a spotlight cone pinned to them, calling
// TRACKING while it holds the picture and SEARCHING when it loses it. When the
// heat dies below four stars it climbs away and leaves the chase to the ground.

import * as THREE from 'three';

export class AirOneUnit {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.leaving = false;
    this.status = 'SEARCHING';
    this.orbit = 0;
    this.leaveTimer = 0;

    const group = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f6f7 });
    const blue = new THREE.MeshLambertMaterial({ color: 0x123a5c });
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4e8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), white);
    body.scale.set(1.05, 0.9, 1.9); group.add(body);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 8), glass);
    nose.position.set(0, 0.12, 1.9); group.add(nose);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 3.4), blue);
    stripe.position.set(0, -0.35, -0.4); group.add(stripe);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 3.6), white);
    tail.position.set(0, 0.25, -3.6); group.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.6), blue);
    fin.position.set(0, 0.6, -5.3); group.add(fin);
    this.rotor = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.07, 0.55), new THREE.MeshLambertMaterial({ color: 0x22262b }));
    this.rotor.position.set(0, 1.5, 0); group.add(this.rotor);
    const skidMat = new THREE.MeshLambertMaterial({ color: 0x333a40 });
    for (const sx of [-0.95, 0.95]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), skidMat);
      skid.position.set(sx, -1.35, 0); group.add(skid);
    }
    group.visible = false;
    scene.add(group);
    this.group = group;

    // Spotlight: a real light plus a translucent cone mesh from hull to suspect.
    this.spot = new THREE.SpotLight(0xffe9b0, 0, 130, 0.34, 0.55, 1.1);
    scene.add(this.spot);
    scene.add(this.spot.target);
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(2.3, 30, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff0b3, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.cone.visible = false;
    scene.add(this.cone);
  }

  activate(playerPos) {
    this.active = true;
    this.leaving = false;
    this.group.visible = true;
    this.cone.visible = true;
    this.group.position.set(playerPos.x + 55, 30, playerPos.z - 55);
    this.spot.intensity = 1500;
  }

  deactivate() {
    this.active = false;
    this.group.visible = false;
    this.cone.visible = false;
    this.spot.intensity = 0;
  }

  aimSpotlight(targetPos) {
    const from = this.group.position;
    this.spot.position.copy(from);
    this.spot.target.position.copy(targetPos);
    const mid = new THREE.Vector3().addVectors(from, targetPos).multiplyScalar(0.5);
    this.cone.position.copy(mid);
    const dir = new THREE.Vector3().subVectors(from, targetPos);
    const len = dir.length();
    this.cone.scale.set(1, len / 30, 1);
    this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }

  spinRotor(dt) { if (this.rotor) this.rotor.rotation.y += dt * 24; }

  update(dt, game) {
    const wantAir = game.dispatch.responseFor(game.wanted.stars).heli;
    const playerPos = game.playerPos();
    if (wantAir && !this.active) {
      this.activate(playerPos);
      game.dispatch.say('Air One overhead — Quintana has eyes on the suspect.');
    }
    if (!this.active) return;
    this.spinRotor(dt);

    if (!wantAir) {
      // Heat is dying: climb away and give up the chase.
      this.leaving = true;
      this.leaveTimer += dt;
      this.group.position.y += dt * 9;
      this.group.position.x += dt * 22;
      this.status = 'SEARCHING';
      this.aimSpotlight(playerPos);
      if (this.leaveTimer > 3.2) { this.deactivate(); this.leaveTimer = 0; }
      return;
    }
    this.leaving = false;
    this.orbit += dt * 0.5;
    const desired = new THREE.Vector3(
      playerPos.x + Math.sin(this.orbit) * 17,
      27,
      playerPos.z + Math.cos(this.orbit) * 17,
    );
    this.group.position.lerp(desired, 1 - Math.exp(-dt * 2.6));
    this.group.lookAt(playerPos.x, this.group.position.y - 4, playerPos.z);
    const dist = this.group.position.distanceTo(playerPos);
    this.status = dist < 62 ? 'TRACKING' : 'SEARCHING';
    if (this.status === 'TRACKING') game.notePlayerSeen();
    this.aimSpotlight(playerPos);
  }

  // Staging: freeze Air One in one photogenic spot, spotlight on the car.
  setStaged(x, y, z, targetPos) {
    this.active = true;
    this.leaving = false;
    this.group.visible = true;
    this.cone.visible = true;
    this.group.position.set(x, y, z);
    this.group.lookAt(targetPos.x, y - 5, targetPos.z);
    this.spot.intensity = 1500;
    this.status = 'TRACKING';
    this.aimSpotlight(targetPos);
  }
}
