// RoadblockSystem: when the stars hit three, dispatch stops chasing and starts
// waiting — two BCPD cruisers angled across the road ahead, striped barriers in
// the gaps and an officer on foot. Blocks are physical: their barriers register
// colliders and their cruisers join the city's solid vehicles. They stand down
// when the suspect slips the net or the heat dies.

import * as THREE from 'three';
import { Vehicle } from './vehicles.js';
import { BLOCK_OFFICERS } from './dispatch.js';
import { snapToRoad } from './city.js';
import { createPersonMesh } from './pedestrians.js';

export class Roadblock {
  constructor(scene, x, z, alongZ, idx) {
    const def = BLOCK_OFFICERS[idx % BLOCK_OFFICERS.length];
    this.unitName = def.unit;
    this.officerName = def.officer;
    this.pos = new THREE.Vector3(x, 0, z);
    this.cruisers = [];
    this.meshes = [];
    this.colliders = [];

    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xe8e4da });
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
    const perp = alongZ ? 'x' : 'z';
    for (const off of [-4.4, 0, 4.4]) {
      const bx = alongZ ? x + off : x;
      const bz = alongZ ? z : z + off;
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 2.4 : 0.55, 0.95, alongZ ? 0.55 : 2.4), barrierMat);
      barrier.position.set(bx, 0.48, bz); scene.add(barrier); this.meshes.push(barrier);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(alongZ ? 2.44 : 0.58, 0.3, alongZ ? 0.58 : 2.44), stripeMat);
      stripe.position.set(bx, 0.55, bz); scene.add(stripe); this.meshes.push(stripe);
      this.colliders.push({ minX: bx - 1.25, maxX: bx + 1.25, minZ: bz - 1.25, maxZ: bz + 1.25 });
    }
    // Two cruisers angled across the running lanes, noses in.
    const spots = alongZ
      ? [{ dx: -2.5, dz: -2.2, h: Math.PI / 2 + 0.5 }, { dx: 2.5, dz: 2.2, h: -Math.PI / 2 - 0.5 }]
      : [{ dx: -2.2, dz: -2.5, h: 0.5 }, { dx: 2.2, dz: 2.5, h: Math.PI - 0.5 }];
    for (const s of spots) {
      const cruiser = new Vehicle('cruiser', 0xf4f6f7, x + s.dx, z + s.dz, s.h);
      cruiser.driver = 'police';
      scene.add(cruiser.mesh);
      this.cruisers.push(cruiser);
    }
    // The block officer, on foot beside the first cruiser.
    const officer = createPersonMesh(0x1d3a5f, 0x22262b, 0xe0ac69);
    officer.position.set(alongZ ? x - 5.6 : x, 0, alongZ ? z : z - 5.6);
    scene.add(officer);
    this.meshes.push(officer);
    this.perp = perp;
  }

  dispose(scene) {
    for (const c of this.cruisers) scene.remove(c.mesh);
    for (const m of this.meshes) scene.remove(m);
  }
}

export class RoadblockSystem {
  constructor(scene) {
    this.scene = scene;
    this.blocks = [];
    this.cooldown = 0;
    this.deployCount = 0;
  }

  get activeCount() { return this.blocks.length; }
  get colliders() { return this.blocks.flatMap((b) => b.colliders); }
  get cruisers() { return this.blocks.flatMap((b) => b.cruisers); }

  deployAt(x, z, alongZ) {
    const idx = this.deployCount++;
    const block = new Roadblock(this.scene, x, z, alongZ, idx);
    this.blocks.push(block);
    return block;
  }

  // Dynamic deployment: on the road, ~58m ahead of the suspect's nose.
  deployAhead(game) {
    const p = game.playerPos();
    const f = game.playerForward();
    const aheadX = p.x + f.x * 58;
    const aheadZ = p.z + f.z * 58;
    const snapped = snapToRoad(aheadX, aheadZ, f.x, f.z);
    const block = this.deployAt(snapped.x, snapped.z, snapped.alongZ);
    game.dispatch.roadblockDeployed(block);
    this.cooldown = 11;
    return block;
  }

  maintain(dt, game) {
    this.cooldown -= dt;
    const want = game.dispatch.responseFor(game.wanted.stars).roadblocks;
    const p = game.playerPos();
    for (const b of [...this.blocks]) {
      if (game.wanted.stars < 3 || b.pos.distanceTo(p) > 140) {
        b.dispose(this.scene);
        this.blocks.splice(this.blocks.indexOf(b), 1);
      }
    }
    if (this.blocks.length < want && this.cooldown <= 0 && game.wanted.stars >= 3) {
      this.deployAhead(game);
    }
    // Keep block lightbars strobing too.
    const t = performance.now() / 1000;
    for (const b of this.blocks) {
      for (const c of b.cruisers) {
        const bar = c.mesh.userData.lightbar;
        if (bar) {
          const phase = Math.sin(t * 9 + b.pos.x) > 0;
          bar.children[1].visible = phase;
          bar.children[2].visible = !phase;
        }
      }
    }
  }
}
