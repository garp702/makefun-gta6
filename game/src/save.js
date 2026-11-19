// SaveSystem: the whole run in one localStorage record — cash, respect, story
// progress, the clock, garage tiers, ammo and where Kai was standing. Safehouses,
// job completions and purchases all write it; Continue on the title screen reads it.

export const SAVE_KEY = 'bayline-city-save-v1';

export class SaveSystem {
  exists() {
    try { return !!window.localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  save(state) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, ...state }));
      return true;
    } catch { return false; }
  }

  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && data.v === 1 ? data : null;
    } catch { return null; }
  }

  clear() {
    try { window.localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
  }
}
