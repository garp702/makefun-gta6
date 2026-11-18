// Bayline Garage + supply counter. One panel, real purchases:
// Engine raises the player car's top speed 34 → 40 m/s, Armor/Nitro are
// car upgrades, and the counter sells body armour and ammunition boxes
// that raise reserve stock (a pistol box adds exactly 24 rounds, so a
// stock of 36 becomes 60 — the live stock is always shown on the row).
export const CATALOG = [
  { id: 'engine', name: 'Engine Tune', desc: 'Top speed 34 → 40 m/s', price: 300, max: 1 },
  { id: 'armorCar', name: 'Car Armor', desc: 'Police rams hurt less', price: 220, max: 1 },
  { id: 'nitro', name: 'Nitro Kit', desc: 'Shift boost while driving', price: 260, max: 1 },
  { id: 'bodyArmor', name: 'Body Armor', desc: '+50 protection vest', price: 150, max: 3 },
  { id: 'ammoPistol', name: 'Pelican 9 Ammo Box', desc: '+24 pistol rounds', price: 60, max: 99 },
  { id: 'ammoSmg', name: 'Marlin-9 Ammo Box', desc: '+60 SMG rounds', price: 90, max: 99 },
];

export class Shop {
  constructor(state, weapons, onChange) {
    this.state = state; this.weapons = weapons; this.onChange = onChange;
    this.el = document.getElementById('shopScreen');
    this.rowsEl = document.getElementById('shopRows');
    this.cashEl = document.getElementById('shopCash');
    this.open = false;
  }
  owned(item) {
    if (item.id === 'ammoPistol') return this.state.reservePistol;
    if (item.id === 'ammoSmg') return this.state.reserveSmg;
    return this.state[item.id] || 0;
  }
  canBuy(item) {
    if (this.state.cash < item.price) return false;
    if (item.id.startsWith('ammo')) return true;
    return (this.state[item.id] || 0) < item.max;
  }
  buy(id) {
    const item = CATALOG.find((i) => i.id === id);
    if (!item || !this.canBuy(item)) return false;
    this.state.cash -= item.price;
    if (id === 'ammoPistol') this.weapons.addReserve('pistol', 24);
    else if (id === 'ammoSmg') this.weapons.addReserve('smg', 60);
    else this.state[id] = (this.state[id] || 0) + 1;
    this.render();
    this.onChange();
    return true;
  }
  render() {
    this.cashEl.textContent = `Cash: $${this.state.cash} · REP ${this.state.rep}`;
    this.rowsEl.innerHTML = '';
    for (const item of CATALOG) {
      const row = document.createElement('div');
      row.className = 'shopRow';
      const owned = this.owned(item);
      const label = item.id.startsWith('ammo')
        ? `${item.name} — ${item.desc} (stock: ${owned})`
        : `${item.name} — ${item.desc}${item.max === 1 ? (owned ? ' · FITTED' : '') : ` · owned ${owned}`}`;
      const left = document.createElement('span'); left.textContent = label;
      const btn = document.createElement('button');
      btn.className = 'btn'; btn.id = `buy-${item.id}`;
      btn.textContent = `$${item.price}`;
      btn.disabled = !this.canBuy(item);
      btn.addEventListener('click', () => this.buy(item.id));
      row.appendChild(left); row.appendChild(btn);
      this.rowsEl.appendChild(row);
    }
  }
  show() { this.open = true; this.render(); this.el.style.display = 'flex'; }
  hide() { this.open = false; this.el.style.display = 'none'; }
}
