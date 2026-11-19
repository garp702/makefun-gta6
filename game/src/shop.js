// GarageShop: two storefronts. Bayline Garage fits Engine, Armor and Nitro in
// three tiers each (keys 1–3 while parked up) and repairs the car with any
// fitting; Harbor Arms sells ammunition and body armor to a customer on foot
// (keys 1–5). Tier prices climb; the garage tiers live here and are read by the
// vehicle physics and damage code every frame.

import * as THREE from 'three';

export const TIER_PRICES = {
  engine: [900, 1400, 2100],
  armor: [350, 600, 950],
  nitro: [300, 550, 900],
};
export const TIER_NAMES = { engine: 'Engine', armor: 'Armor', nitro: 'Nitro' };

export const GUN_ROWS = [
  { label: 'Pelican 9 ammo ×24', price: 60, ammoId: 'pelican', amount: 24 },
  { label: 'Breaker shells ×12', price: 80, ammoId: 'breaker', amount: 12 },
  { label: 'Marlin-9 ammo ×60', price: 120, ammoId: 'marlin', amount: 60 },
  { label: 'Longshot rounds ×10', price: 150, ammoId: 'longshot', amount: 10 },
  { label: 'Body armor', price: 250, ammoId: null, amount: 0 },
];

export class GarageShop {
  constructor(game) {
    this.game = game;
    this.tiers = { engine: 0, armor: 0, nitro: 0 };
    // Marker rings at both storefronts.
    this.rings = [];
    const mk = (pos, color) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.6, 30),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.14, pos.z);
      game.scene.add(ring);
      this.rings.push(ring);
    };
    mk(game.cityData.garagePos, 0x2ea8a0);
    mk(game.cityData.gunShopPos, 0xf2b138);
  }

  nearGarage() {
    const g = this.game;
    return !!g.player.inVehicle && g.player.pos.distanceTo(new THREE.Vector3(g.cityData.garagePos.x, 0, g.cityData.garagePos.z)) < 14;
  }

  nearGunShop() {
    const g = this.game;
    return !g.player.inVehicle && g.player.pos.distanceTo(new THREE.Vector3(g.cityData.gunShopPos.x, 0, g.cityData.gunShopPos.z)) < 10;
  }

  activePanel() {
    if (this.nearGarage()) return 'garage';
    if (this.nearGunShop()) return 'guns';
    return null;
  }

  dots(tier) { return '●'.repeat(tier) + '○'.repeat(3 - tier); }

  rows(panel) {
    if (panel === 'garage') {
      return ['engine', 'armor', 'nitro'].map((kind, i) => {
        const tier = this.tiers[kind];
        return {
          key: String(i + 1),
          label: `[${i + 1}] ${TIER_NAMES[kind]}`,
          dots: this.dots(tier),
          price: tier >= 3 ? 'MAX' : `$${TIER_PRICES[kind][tier]}`,
        };
      });
    }
    return GUN_ROWS.map((r, i) => ({ key: String(i + 1), label: `[${i + 1}] ${r.label}`, dots: '', price: `$${r.price}` }));
  }

  panelTitle(panel) { return panel === 'garage' ? 'BAYLINE GARAGE — UPGRADES' : 'HARBOR ARMS — AMMO & ARMOR'; }
  panelHint(panel) {
    return panel === 'garage' ? 'Keys 1–3 or click. Repairs are free with any fitting.' : 'Keys 1–5. Body armor soaks 60% of incoming fire.';
  }

  buyGarage(i) {
    const g = this.game;
    const kind = ['engine', 'armor', 'nitro'][i];
    if (!kind) return;
    const tier = this.tiers[kind];
    if (tier >= 3) { g.showMessage(`${TIER_NAMES[kind]} is already maxed.`, 2.5); return; }
    const price = TIER_PRICES[kind][tier];
    if (g.cash < price) { g.showMessage(`Need $${price} for ${TIER_NAMES[kind]} tier ${tier + 1}.`, 2.5); return; }
    g.cash -= price;
    this.tiers[kind]++;
    if (g.player.inVehicle) g.player.inVehicle.hp = 100;
    g.audio.cash();
    g.showMessage(`${TIER_NAMES[kind]} tier ${tier + 1} fitted — car repaired.`, 3);
    g.saveGame();
  }

  buyGun(i) {
    const g = this.game;
    const row = GUN_ROWS[i];
    if (!row) return;
    if (g.cash < row.price) { g.showMessage(`Need $${row.price}.`, 2.5); return; }
    g.cash -= row.price;
    if (row.ammoId) g.arsenal.addAmmo(row.ammoId, row.amount);
    else g.player.armor = 100;
    g.audio.cash();
    g.showMessage(`Bought ${row.label}.`, 2.5);
    g.saveGame();
  }

  buy(panel, i) { if (panel === 'garage') this.buyGarage(i); else this.buyGun(i); }

  update() {
    const t = performance.now() * 0.003;
    for (const r of this.rings) r.material.opacity = 0.55 + Math.sin(t) * 0.2;
  }
}
