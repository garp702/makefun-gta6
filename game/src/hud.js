// All 2D overlay work: clock/cash/wanted, mission banner, the Serena Bay
// PD panel (ground units + air unit), NPC dialog, prompts, and the minimap
// with blips and the gold route line to the current objective.
export class Hud {
  constructor() {
    this.el = {};
    for (const id of ['hud','clock','cash','rep','wanted','banner','policeUnits','airUnit','dialog','dialogText','prompt','objective','speed','radioLine','weaponLine','toast']) {
      this.el[id] = document.getElementById(id);
    }
    this.map = document.getElementById('minimap').getContext('2d');
    this.toastTimer = 0;
  }
  show() { this.el.hud.style.display = 'block'; }
  toast(msg, seconds = 2.6) { this.el.toast.textContent = msg; this.el.toast.style.display = 'block'; this.toastTimer = seconds; }
  update(dt, s) {
    if (this.toastTimer > 0) { this.toastTimer -= dt; if (this.toastTimer <= 0) this.el.toast.style.display = 'none'; }
    const hh = String(Math.floor(s.minuteOfDay / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(s.minuteOfDay % 60)).padStart(2, '0');
    this.el.clock.textContent = `Day ${s.day} · ${hh}:${mm}`;
    this.el.cash.textContent = `$${s.cash}`;
    this.el.rep.textContent = `REP ${s.rep}`;
    this.el.wanted.innerHTML = s.wantedStars;
    this.el.banner.textContent = s.banner;
    this.el.radioLine.textContent = s.radioLabel;
    this.el.weaponLine.textContent = s.weaponLabel;
    this.el.speed.innerHTML = `${s.speedKmh} <small>km/h</small>`;
    this.el.dialogText.textContent = s.dialog;
    this.el.objective.innerHTML = s.objectiveHtml;
    if (s.prompt) { this.el.prompt.style.display = 'block'; this.el.prompt.textContent = s.prompt; }
    else this.el.prompt.style.display = 'none';
    // Police panel: three named ground units, then the air unit line.
    this.el.policeUnits.innerHTML = s.policeLines.map((u) =>
      `<div class="unit"><b>${u.name}</b><br><span class="st">${u.status}</span>${u.distance !== null && u.distance !== undefined ? ` · ${u.distance}m` : ''}</div>`).join('');
    this.el.airUnit.textContent = s.airLine;
    this.drawMap(s);
  }
  drawMap(s) {
    const g = this.map, W = 196, scale = W / 340;
    const toMap = (x, z) => [(x + 170) * scale, (z + 170) * scale];
    g.fillStyle = '#0d3b2e'; g.fillRect(0, 0, W, W);
    g.strokeStyle = '#3d4a52'; g.lineWidth = 5;
    for (const v of [-120, -80, -40, 0, 40, 80, 120]) {
      const [x] = toMap(v, 0); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, W); g.stroke();
      const [, y] = toMap(0, v); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.fillStyle = '#118ab2'; const [, seaY] = toMap(0, 165); g.fillRect(0, seaY, W, W - seaY);
    const [px, py] = toMap(s.playerPos.x, s.playerPos.z);
    if (s.objective) {
      const [ox, oy] = toMap(s.objective.x, s.objective.z);
      g.strokeStyle = '#ffd76a'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(px, py);
      // Route: along x first, then along z — reads as a street route.
      g.lineTo(ox, py); g.lineTo(ox, oy); g.stroke();
      g.fillStyle = '#ffd76a'; g.beginPath(); g.arc(ox, oy, 5, 0, 7); g.fill();
    }
    const blip = (p, color, r = 3) => { const [x, y] = toMap(p.x, p.z); g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    for (const p of s.policePos) blip(p, '#ff4757');
    for (const p of s.trafficPos) blip(p, '#dfe6e9', 2);
    if (s.heliPos) blip(s.heliPos, '#ff9ff3', 3.5);
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill();
    g.strokeStyle = '#ffb347'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(px, py);
    g.lineTo(px + Math.sin(s.playerHeading) * 10, py + Math.cos(s.playerHeading) * 10); g.stroke();
  }
}
