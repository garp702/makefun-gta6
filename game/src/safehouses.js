// SafehouseSystem: three places Kai Mercer can disappear into. The Palm
// Boulevard Apartment is his from the start; the Canal Warehouse Loft opens at
// Hustler respect and the Marina Penthouse at Shot Caller. Resting at one heals
// him, writes the save, moves the clock on two hours — and the BCPD loses the
// trail completely: wanted clears and dispatch calls the hunt off.

import * as THREE from 'three';

export const SAFEHOUSES = [
  { id: 'palm', name: 'Palm Boulevard Apartment', x: 166, z: -100, unlockRank: 0 },
  { id: 'canal', name: 'Canal Warehouse Loft', x: -166, z: 50, unlockRank: 2 },
  { id: 'marina', name: 'Marina Penthouse', x: 166, z: 118, unlockRank: 4 },
];

function houseIconTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = '#f2b138';
  g.beginPath();
  g.moveTo(64, 14); g.lineTo(112, 54); g.lineTo(100, 54); g.lineTo(100, 108);
  g.lineTo(76, 108); g.lineTo(76, 78); g.lineTo(52, 78); g.lineTo(52, 108);
  g.lineTo(28, 108); g.lineTo(28, 54); g.lineTo(16, 54); g.closePath(); g.fill();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SafehouseSystem {
  constructor(game) {
    this.game = game;
    this.markers = [];
    const tex = houseIconTexture();
    for (const house of SAFEHOUSES) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.4, 3.4, 30),
        new THREE.MeshBasicMaterial({ color: 0x59d98c, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(house.x, 0.14, house.z);
      game.scene.add(ring);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(3.2, 3.2, 1);
      sprite.position.set(house.x, 3.4, house.z);
      game.scene.add(sprite);
      this.markers.push({ house, ring, sprite });
    }
  }

  isUnlocked(house) { return this.game.respect.rankIndex >= house.unlockRank; }

  nearest(pos) {
    let best = null;
    for (const house of SAFEHOUSES) {
      const d = Math.hypot(pos.x - house.x, pos.z - house.z);
      if (!best || d < best.dist) best = { house, dist: d };
    }
    return best;
  }

  // The E-key action at a safehouse door. Returns a message for the HUD either way.
  use(house) {
    const g = this.game;
    if (!this.isUnlocked(house)) {
      const need = ['Nobody', 'Runner', 'Hustler', 'Operator', 'Shot Caller'][house.unlockRank];
      return `${house.name} unlocks at ${need} respect.`;
    }
    g.player.hp = 100;
    g.wanted.clear();
    g.dispatch.suspectLost();
    g.advanceClock(120);
    g.saveGame();
    g.audio.pickup();
    return `Rested at ${house.name} — healed, saved, heat gone.`;
  }

  update() {
    const t = performance.now() * 0.003;
    for (const m of this.markers) {
      const unlocked = this.isUnlocked(m.house);
      m.ring.material.color.setHex(unlocked ? 0x59d98c : 0x77808a);
      m.ring.material.opacity = 0.5 + Math.sin(t + m.house.x) * 0.22;
      m.sprite.position.y = 3.4 + Math.sin(t * 0.8 + m.house.z) * 0.25;
      m.sprite.material.opacity = unlocked ? 1 : 0.45;
    }
  }
}
