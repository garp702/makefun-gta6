// Serena Bay: a fictional island city on a strict 40 m road grid.
// Roads run exactly on multiples of PITCH in both axes — building lots are
// placed inside the blocks between them, never shifted by a half pitch,
// so streets, traffic lanes and the minimap all agree.
import * as THREE from 'three';

export const PITCH = 40;
export const GRID = [-120, -80, -40, 0, 40, 80, 120];
export const BOULEVARD_Z = 120; // Palm Boulevard, along the beach
export const WORLD = { min: -150, max: 150 };

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function isRoad(x, z) {
  const m = (v) => ((Math.round(v / PITCH) * PITCH) % PITCH + PITCH) % PITCH;
  const near = (v) => Math.abs(v - Math.round(v / PITCH) * PITCH) < 7;
  return near(x) || near(z) || Math.abs(z - BOULEVARD_Z) < 7;
}

const mat = (c, rough = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
const PALETTE = [0xf2e3c6, 0xe8b4b8, 0xa8d8ea, 0xf7d794, 0xc3e6c0, 0xf0a868, 0xdfe6e9, 0xf5cd79];

export function buildCity(scene, seed = 7) {
  const rnd = mulberry(seed);
  const group = new THREE.Group();
  scene.add(group);

  // Ground: island slab, road grid drawn as dark strips on the exact grid.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), mat(0x3f9e63, 1));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
  group.add(ground);
  const roadMat = mat(0x2d3436, 1);
  for (const v of [...GRID, BOULEVARD_Z]) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(340, 13), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.01, v); group.add(h);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(13, 340), roadMat);
    w.rotation.x = -Math.PI / 2; w.position.set(v, 0.012, 0); group.add(w);
  }
  // Beach + sea to the south.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(340, 34), mat(0xf3d9a4, 1));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, 148); group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), new THREE.MeshStandardMaterial({ color: 0x118ab2, roughness: 0.35, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, 330); group.add(sea);

  // Buildings: one per lot inside each block, inset from the roads.
  const winMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffca66, emissiveIntensity: 0.55 });
  for (const bx of GRID) for (const bz of GRID) {
    if (bz === BOULEVARD_Z) continue;
    for (const ox of [-1, 1]) for (const oz of [-1, 1]) {
      // Block centre is half a pitch from each road; lots sit ±9 m from it.
      const px = bx + PITCH / 2 + ox * 9;
      const pz = bz + PITCH / 2 + oz * 9;
      if (px > 148 || pz > 104) continue;
      if (Math.abs(px - 56) < 18 && Math.abs(pz - 56) < 18) continue; // garage block stays open
      const hgt = 8 + rnd() * 26;
      const b = new THREE.Mesh(new THREE.BoxGeometry(13, hgt, 13), mat(PALETTE[Math.floor(rnd() * PALETTE.length)]));
      b.position.set(px, hgt / 2, pz); b.castShadow = true; group.add(b);
      const win = new THREE.Mesh(new THREE.BoxGeometry(13.2, hgt * 0.5, 13.2), winMat);
      win.position.set(px, hgt * 0.45, pz); win.scale.set(1, 1, 1); win.material = winMat;
      win.visible = rnd() > 0.35; if (win.visible) group.add(win);
    }
  }

  // Palm trees along the boulevard and the beach.
  const trunkMat = mat(0x8d6e63); const leafMat = mat(0x27ae60);
  for (let x = -150; x <= 150; x += 15) {
    for (const z of [BOULEVARD_Z - 9, 138]) {
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 5.4, 6), trunkMat);
      trunk.position.y = 2.7; palm.add(trunk);
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.6, 4), leafMat);
        leaf.position.y = 5.6; leaf.rotation.z = 1.15; leaf.rotation.y = (i / 5) * Math.PI * 2;
        leaf.translateX(1.4); palm.add(leaf);
      }
      palm.position.set(x + (rnd() - 0.5) * 2, 0, z);
      group.add(palm);
    }
  }

  // Lighthouse on the south-east point.
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 17, 10), mat(0xf5f6fa));
  tower.position.y = 8.5; lh.add(tower);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.7, 3.4, 10), mat(0xe74c3c));
  stripe.position.y = 11; lh.add(stripe);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffdf6b, emissiveIntensity: 2.2 }));
  lamp.position.y = 18.2; lh.add(lamp);
  lh.position.set(158, 0, 146); group.add(lh);

  // Double-sided name board: two planes back to back so the text reads
  // correctly from both directions (a single plane mirrors from behind).
  const board = makeBoard('PALM BOULEVARD BEACH');
  board.position.set(-30, 6, BOULEVARD_Z - 8);
  group.add(board);
  const board2 = makeBoard('SERENA BAY');
  board2.position.set(60, 7, -60); board2.rotation.y = Math.PI / 4;
  group.add(board2);

  // Garage / shop lot: an open corner at the (40,40) intersection.
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), mat(0x636e72, 1));
  lot.rotation.x = -Math.PI / 2; lot.position.set(53, 0.03, 53); group.add(lot);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 12), mat(0xffb347));
  canopy.position.set(53, 5, 47); group.add(canopy);
  for (const [cx, cz] of [[44, 42], [62, 42], [44, 52], [62, 52]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 6), mat(0x2d3436));
    post.position.set(cx, 2.5, cz); group.add(post);
  }
  const gBoard = makeBoard('BAYLINE GARAGE');
  gBoard.position.set(53, 6.4, 41); group.add(gBoard);

  return { group, lighthouse: lh };
}

function makeBoard(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#07304a'; g.fillRect(0, 0, 512, 96);
  g.font = 'bold 44px Arial'; g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const tex = new THREE.CanvasTexture(c);
  const grp = new THREE.Group();
  for (const flip of [0, Math.PI]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(15, 2.8), new THREE.MeshBasicMaterial({ map: tex }));
    p.rotation.y = flip; p.position.z = flip === 0 ? 0.06 : -0.06;
    grp.add(p);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
  pole.position.y = -3.4; grp.add(pole);
  return grp;
}
