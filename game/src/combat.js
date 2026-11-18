// Hitscan combat. A shot fires from the player's position toward the aim
// heading; the nearest living target inside a narrow cone and the weapon's
// range takes the damage. Firing in the open raises wanted heat.
import * as THREE from 'three';

export class Combat {
  constructor(scene, audio) {
    this.audio = audio;
    this.flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffdf6b }),
    );
    this.flash.visible = false;
    scene.add(this.flash);
    this.flashTimer = 0;
    this.lastHit = null;
  }
  // targets: array of { hp, pos:Vector3, apply(dmg, fromPos) } hit-proxies.
  shoot(origin, heading, weaponDef, targets) {
    const dir = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    let best = null, bestScore = Infinity;
    for (const t of targets) {
      if (t.hp <= 0) continue;
      const to = new THREE.Vector3().subVectors(t.pos, origin); to.y = 0;
      const dist = to.length();
      if (dist > weaponDef.range || dist < 0.5) continue;
      const dot = to.normalize().dot(dir);
      if (dot < 0.965) continue; // ~15 degree cone
      const score = dist - dot * 4;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    this.flash.position.copy(origin).addScaledVector(dir, 1.1);
    this.flash.position.y = 1.45;
    this.flash.visible = true;
    this.flashTimer = 0.05;
    this.audio.shot(weaponDef.auto);
    if (best) {
      best.apply(weaponDef.damage, origin);
      this.lastHit = { target: best, hp: best.hp };
    }
    return best;
  }
  update(dt) {
    if (this.flashTimer > 0) { this.flashTimer -= dt; if (this.flashTimer <= 0) this.flash.visible = false; }
  }
}
