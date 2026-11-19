// CityBuilder: Serena Bay itself — a seeded, sun-soaked coastal grid.
// Seven streets each way make the blocks; the east edge gives up to Palm Boulevard,
// the sand and the ocean. Districts (Marina, Canal District, Old Town, Hillcrest)
// are named on street signs and in the HUD. Buildings register AABB colliders and
// every parked-car spot is guaranteed to sit on road tarmac, never inside a block.

import * as THREE from 'three';

export const STREETS = [-150, -100, -50, 0, 50, 100, 150];
export const BLOCK_CENTERS = [-125, -75, -25, 25, 75, 125];
export const WORLD = { minX: -190, maxX: 235, minZ: -195, maxZ: 195 };

export function createSeededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nearestStreet(v) {
  let best = STREETS[0];
  for (const s of STREETS) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return best;
}

// Snap a point onto the road it is travelling along (used by roadblocks).
export function snapToRoad(x, z, dirX, dirZ) {
  if (Math.abs(dirZ) >= Math.abs(dirX)) return { x: nearestStreet(x), z, alongZ: true };
  return { x, z: nearestStreet(z), alongZ: false };
}

export function districtAt(x, z) {
  if (x > 140) return 'Palm Boulevard';
  if (z > 95 && x > 0) return 'The Marina';
  if (x < -85) return 'Canal District';
  if (z < -95) return 'Hillcrest';
  if (z > 35) return 'Old Town';
  return 'Serena Bay Central';
}

export function resolveCollisions(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const dx = pos.x - Math.max(c.minX, Math.min(pos.x, c.maxX));
    const dz = pos.z - Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (radius - d);
        pos.z += (dz / d) * (radius - d);
      } else {
        // Centre inside the box: push out along the smallest penetration axis.
        const pl = pos.x - c.minX, pr = c.maxX - pos.x, pt = pos.z - c.minZ, pb = c.maxZ - pos.z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) pos.x = c.minX - radius; else if (m === pr) pos.x = c.maxX + radius;
        else if (m === pt) pos.z = c.minZ - radius; else pos.z = c.maxZ + radius;
      }
    }
  }
  pos.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, pos.x));
  pos.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, pos.z));
  return hit;
}

function facadeTexture(rng, base, litRatio) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffd98c' : 'rgba(20,34,44,0.85)';
      g.fillRect(10 + col * 23, 12 + row * 20, 14, 11);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#0d3a3a'; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#f2b138'; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112);
  g.fillStyle = '#f5f8fa'; g.font = 'bold 52px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#2f3338'; g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#3a3f45'; g.fillRect(0, 0, 5, 128); g.fillRect(59, 0, 5, 128);
  g.fillStyle = '#e8c766'; g.fillRect(29, 8, 6, 52);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 26);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BUILDING_TINTS = ['#e8dcc8', '#d98f6a', '#7fb3ad', '#c96f5e', '#e6e2da', '#8fa8c9', '#d9b26a', '#a8c686'];

export function buildCity(scene, rng) {
  const colliders = [];
  const addCollider = (cx, cz, w, d) => colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });

  // Ground, roads, sidewalks.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(760, 640), new THREE.MeshLambertMaterial({ color: 0x5b6066 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(20, -0.05, 0); scene.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ map: roadTexture() });
  for (const sx of STREETS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 400), roadMat);
    road.rotation.x = -Math.PI / 2; road.position.set(sx, 0.01, 0); scene.add(road);
  }
  for (const sz of STREETS) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 400), roadMat);
    road.rotation.x = -Math.PI / 2; road.rotation.z = Math.PI / 2; road.position.set(0, 0.012, sz); scene.add(road);
  }

  // Beach, ocean, canal.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(38, 400), new THREE.MeshLambertMaterial({ color: 0xe6c88f }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(185, 0.02, 0); scene.add(sand);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(520, 640), new THREE.MeshLambertMaterial({ color: 0x1f88a8 }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(466, -0.25, 0); scene.add(ocean);
  const canal = new THREE.Mesh(new THREE.PlaneGeometry(26, 400), new THREE.MeshLambertMaterial({ color: 0x1d6d8c }));
  canal.rotation.x = -Math.PI / 2; canal.position.set(-125, 0.0, 0); scene.add(canal);
  const bankMat = new THREE.MeshLambertMaterial({ color: 0x8b8f8c });
  for (const bx of [-139.5, -110.5]) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 400), bankMat);
    bank.position.set(bx, 0.35, 0); scene.add(bank);
  }
  for (const bz of [-50, 0, 50]) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(31, 0.5, 11), new THREE.MeshLambertMaterial({ color: 0x3a3f45 }));
    bridge.position.set(-125, 0.42, bz); scene.add(bridge);
  }

  // Blocks: slabs, then buildings (or special lots).
  const facades = [facadeTexture(rng, '#cfd4d8', 0.32), facadeTexture(rng, '#bfc8cc', 0.2), facadeTexture(rng, '#d8d2c4', 0.45)];
  const slabMat = new THREE.MeshLambertMaterial({ color: 0x74797d });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x3c4043 });
  const garagePos = { x: 66, z: 66 };
  const gunShopPos = { x: -66, z: -66 };

  function building(cx, cz, w, d, h, tint, facade) {
    const mat = new THREE.MeshLambertMaterial({ map: facade, color: tint });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, h / 2 + 0.15, cz);
    scene.add(mesh);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.5, d + 0.7), roofMat);
    roof.position.set(cx, h + 0.4, cz); scene.add(roof);
    addCollider(cx, cz, w + 0.4, d + 0.4);
  }

  function signPost(text, x, z, ry) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 6), new THREE.MeshLambertMaterial({ color: 0x555c60 }));
    pole.position.set(x, 2.2, z); scene.add(pole);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.6), new THREE.MeshBasicMaterial({ map: signTexture(text), side: THREE.DoubleSide }));
    board.position.set(x, 4.6, z); board.rotation.y = ry; scene.add(board);
  }

  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(46, 0.3, 46), slabMat);
      slab.position.set(bx, 0.0, bz); scene.add(slab);
      if (bx === -125) continue; // canal column stays water and banks
      if (bx === 75 && bz === 75) {
        building(88, 88, 17, 13, 6.5, '#e8dcc8', facades[0]);
        signPost('BAYLINE GARAGE', 74, 57.5, Math.PI);
        continue;
      }
      if (bx === -75 && bz === -75) {
        building(-88, -88, 15, 12, 5.5, '#d98f6a', facades[1]);
        signPost('HARBOR ARMS', -74, -57.5, 0);
        continue;
      }
      if (bx === 125 && bz === 125) {
        // Marina lot: crates and a low dock office, no tower.
        building(133, 133, 12, 9, 4.5, '#7fb3ad', facades[2]);
        const crateMat = new THREE.MeshLambertMaterial({ color: 0x9a7448 });
        for (let i = 0; i < 6; i++) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), crateMat);
          crate.position.set(114 + rng() * 10, 0.85 + (i > 3 ? 1.7 : 0), 112 + rng() * 12);
          crate.rotation.y = rng() * 0.6; scene.add(crate);
        }
        continue;
      }
      const tall = bz < -95 ? 1.5 : 1.0; // Hillcrest towers
      if (rng() < 0.42) {
        building(bx, bz, 20 + rng() * 8, 20 + rng() * 8, (15 + rng() * 22) * tall, BUILDING_TINTS[(rng() * 8) | 0], facades[(rng() * 3) | 0]);
      } else {
        for (const ox of [-11.5, 11.5]) for (const oz of [-11.5, 11.5]) {
          if (rng() < 0.22) continue;
          building(bx + ox, bz + oz, 13 + rng() * 5, 13 + rng() * 5, (8 + rng() * 13) * tall, BUILDING_TINTS[(rng() * 8) | 0], facades[(rng() * 3) | 0]);
        }
      }
    }
  }

  // Palms along the boulevard and in the city.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b48 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d, side: THREE.DoubleSide });
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 5.6, 6);
  const frondGeo = new THREE.BoxGeometry(0.16, 0.05, 2.9);
  function palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.8; trunk.rotation.z = (rng() - 0.5) * 0.14; g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(frondGeo, frondMat);
      const a = (i / 6) * Math.PI * 2;
      f.position.set(Math.sin(a) * 1.2, 5.7 - Math.abs(Math.sin(i * 2.3)) * 0.3, Math.cos(a) * 1.2);
      f.rotation.y = a; f.rotation.z = Math.sin(a) * 0.5; f.rotation.x = -Math.cos(a) * 0.5;
      g.add(f);
    }
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let z = -186; z <= 186; z += 17) { if (rng() < 0.85) palm(163.5, z + rng() * 4); }
  for (let i = 0; i < 16; i++) palm(BLOCK_CENTERS[(rng() * 6) | 0] + 20, BLOCK_CENTERS[(rng() * 6) | 0] - 20);

  // Marina piers and boats on the east water.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7d6244 });
  const hullMat = new THREE.MeshLambertMaterial({ color: 0xf0f2ee });
  const cabinMat = new THREE.MeshLambertMaterial({ color: 0x2ea8a0 });
  for (const pz of [104, 132, 160]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 3.2), pierMat);
    pier.position.set(184, 0.35, pz); scene.add(pier);
    for (const bx of [192, 199]) {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 2.1), hullMat);
      hull.position.set(bx, 0.35, pz + (bx === 192 ? -3.4 : 3.4)); scene.add(hull);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.5), cabinMat);
      cabin.position.set(bx, 1.3, pz + (bx === 192 ? -3.4 : 3.4)); scene.add(cabin);
    }
  }

  // Lighthouse on its pier, south-east water.
  const pierBase = new THREE.Mesh(new THREE.BoxGeometry(34, 1.2, 12), new THREE.MeshLambertMaterial({ color: 0x6d6a63 }));
  pierBase.position.set(208, 0.1, -168); scene.add(pierBase);
  const lhWhite = new THREE.MeshLambertMaterial({ color: 0xf2efe8 });
  const lhRed = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.0, 3, 10), new THREE.MeshLambertMaterial({ color: 0x55524c }));
  lhBase.position.set(220, 1.5, -168); scene.add(lhBase);
  const lh1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.7, 6, 10), lhWhite); lh1.position.set(220, 6, -168); scene.add(lh1);
  const lh2 = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 5, 10), lhRed); lh2.position.set(220, 11.5, -168); scene.add(lh2);
  const lh3 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 4, 10), lhWhite); lh3.position.set(220, 16, -168); scene.add(lh3);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lamp.position.set(220, 19, -168); scene.add(lamp);
  const lhLight = new THREE.PointLight(0xffd9a0, 900, 90, 1.8);
  lhLight.position.set(220, 19, -168); scene.add(lhLight);
  addCollider(220, -168, 7.5, 7.5);

  // District signs.
  signPost('PALM BOULEVARD', 157, -143, -Math.PI / 2);
  signPost('THE MARINA', 96, 143, Math.PI);
  signPost('OLD TOWN', 7.5, 57, Math.PI / 2);
  signPost('CANAL DISTRICT', -93, 7.5, 0);
  signPost('HILLCREST', -57, -143, Math.PI / 2);

  // Parked-car spots: all on street tarmac, clear of blocks and colliders.
  const parkedSpots = [
    { x: 153.8, z: 118, heading: Math.PI },
    { x: 53.8, z: -32, heading: 0 },
    { x: -46.2, z: 82, heading: Math.PI },
    { x: 3.8, z: -118, heading: 0 },
    { x: -103.8, z: -58, heading: Math.PI },
    { x: 96.2, z: 38, heading: 0 },
    { x: 28, z: -53.8, heading: Math.PI / 2 },
    { x: -82, z: 103.8, heading: -Math.PI / 2 },
    { x: 118, z: 46.2, heading: Math.PI / 2 },
    { x: -146.2, z: -108, heading: 0 },
  ];

  return { colliders, parkedSpots, garagePos, gunShopPos };
}
