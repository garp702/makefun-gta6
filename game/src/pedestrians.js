// Named Serena Bay residents strolling the sidewalks. Each has hp so the
// combat system can register hits; hurt pedestrians flee from the shooter.
import * as THREE from 'three';
import { mulberry } from './city.js';

const NAMES = ['Paco Lima', 'Ines Duarte', 'Tomas Rey', 'Lucia Prado', 'Marco Senn', 'Ana Beltran', 'Rui Costa', 'Nina Vidal'];
const SHIRTS = [0xff6b6b, 0xfeca57, 0x48dbfb, 0x1dd1a1, 0xf368e0, 0xff9f43, 0x54a0ff, 0x5f27cd];

export function makePersonMesh(shirt) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.3), new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }));
  body.position.y = 1.05; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 }));
  head.position.y = 1.72; g.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
  legs.position.y = 0.31; g.add(legs);
  return g;
}

export class Pedestrians {
  constructor(scene, seed = 33) {
    this.list = [];
    const rnd = mulberry(seed);
    for (let i = 0; i < 10; i++) {
      const mesh = makePersonMesh(SHIRTS[i % SHIRTS.length]);
      const x = -130 + rnd() * 260, z = -130 + rnd() * 230;
      mesh.position.set(x, 0, z);
      scene.add(mesh);
      this.list.push({
        name: NAMES[i % NAMES.length], mesh, hp: 100, alive: true,
        heading: rnd() * Math.PI * 2, speed: 1.1 + rnd() * 0.7,
        fleeFrom: null, walkPhase: rnd() * 6,
      });
    }
  }
  hurt(ped, dmg, fromPos) {
    ped.hp -= dmg;
    ped.fleeFrom = fromPos.clone();
    if (ped.hp <= 0 && ped.alive) {
      ped.alive = false;
      ped.mesh.rotation.x = Math.PI / 2;
      ped.mesh.position.y = 0.25;
    }
    return ped.hp;
  }
  update(dt, t) {
    for (const p of this.list) {
      if (!p.alive) continue;
      let sp = p.speed;
      if (p.fleeFrom) {
        const away = Math.atan2(p.mesh.position.x - p.fleeFrom.x, p.mesh.position.z - p.fleeFrom.z);
        p.heading = away; sp = 3.6;
        if (p.mesh.position.distanceTo(p.fleeFrom) > 26) p.fleeFrom = null;
      }
      p.walkPhase += dt * sp * 3;
      p.mesh.position.x += Math.sin(p.heading) * sp * dt;
      p.mesh.position.z += Math.cos(p.heading) * sp * dt;
      p.mesh.position.y = Math.abs(Math.sin(p.walkPhase)) * 0.05;
      p.mesh.rotation.y = p.heading;
      if (Math.abs(p.mesh.position.x) > 155 || Math.abs(p.mesh.position.z) > 155) p.heading += Math.PI;
    }
  }
  nearest(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const p of this.list) {
      if (!p.alive) continue;
      const d = p.mesh.position.distanceTo(pos);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
}
