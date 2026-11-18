// localStorage persistence: cash, REP, story progress, upgrades, ammo.
const KEY = 'bayline-city-save-v1';
export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function storeSave(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode */ }
}
export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
export function freshState() {
  return {
    cash: 250, rep: 0, jobIndex: 0, day: 1, minuteOfDay: 8 * 60,
    engine: 0, armorCar: 0, nitro: 0, bodyArmor: 0,
    reservePistol: 24, reserveSmg: 60, done: false,
  };
}
