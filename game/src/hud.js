// HudDirector: every pixel of the interface that is not the 3D world. It reads
// the game state each frame and paints the clock, stars, mission banner and card,
// the BCPD dispatch panel (roster + chatter), the minimap with its route line,
// the respect and health bars, the radio and weapon readouts, and the transient
// layers — dialog, messages, rank-up banner, weapon wheel and the shop panel.

import { WEAPONS } from './weapons.js';
import { districtAt, STREETS } from './city.js';

const el = (id) => document.getElementById(id);

export class HudDirector {
  constructor(game) {
    this.game = game;
    this.els = {
      hud: el('hud'), clock: el('hud-clock'), district: el('hud-district'), stars: el('wanted-stars'),
      bannerTitle: el('mission-banner-title'), bannerSub: el('mission-banner-sub'),
      cardTitle: el('mission-card-title'), cardText: el('mission-card-text'),
      roster: el('dispatch-roster'), dispatchLog: el('dispatch-log'),
      minimap: el('minimap'), speed: el('hud-speed'),
      cash: el('hud-cash'), respectLine: el('hud-respect-line'), rank: el('hud-rank'),
      respectFill: el('respect-bar-fill'), healthFill: el('hud-health-fill'), armorFill: el('hud-armor-fill'),
      radio: el('hud-radio'), weapon: el('hud-weapon'),
      dialog: el('dialog-box'), dialogName: el('dialog-name'), dialogText: el('dialog-text'),
      prompt: el('interact-prompt'), message: el('hud-message'),
      rankBanner: el('rank-banner'), wheel: el('weapon-wheel'), wheelList: el('wheel-list'),
      shop: el('shop-panel'), shopTitle: el('shop-title'), shopList: el('shop-list'), shopHint: el('shop-hint'),
    };
    this.mapCtx = this.els.minimap.getContext('2d');
    this.dialogTimer = 0;
    this.messageTimer = 0;
    this.rankTimer = 0;
    this.shopPanelShown = null;
    this.els.shop.style.pointerEvents = 'auto';
  }

  showHud() { this.els.hud.classList.remove('hidden'); }
  hideHud() { this.els.hud.classList.add('hidden'); }

  showDialog(name, text, seconds = 6) {
    this.els.dialogName.textContent = name;
    this.els.dialogText.textContent = text;
    this.els.dialog.classList.remove('hidden');
    this.dialogTimer = seconds;
  }

  showMessage(text, seconds = 3) {
    this.els.message.textContent = text;
    this.els.message.classList.remove('hidden');
    this.messageTimer = seconds;
  }

  showRankBanner(rankName) {
    this.els.rankBanner.querySelector('.rb-name').textContent = rankName.toUpperCase();
    this.els.rankBanner.classList.remove('hidden');
    this.rankTimer = 3.4;
  }

  setPrompt(text) {
    if (text) {
      this.els.prompt.textContent = text;
      this.els.prompt.classList.remove('hidden');
    } else this.els.prompt.classList.add('hidden');
  }

  update(dt) {
    const g = this.game;
    if (!g.running) return;
    const frozen = g.frozen;

    // Clock, district, stars.
    const hh = String(Math.floor(g.clockMinutes / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(g.clockMinutes % 60)).padStart(2, '0');
    this.els.clock.innerHTML = `DAY ${g.day} &middot; ${hh}:${mm}`;
    const p = g.playerPos();
    this.els.district.textContent = districtAt(p.x, p.z);
    const stars = g.wanted.stars;
    this.els.stars.innerHTML = '★'.repeat(stars) + `<span class="off">${'★'.repeat(5 - stars)}</span>`;

    // Mission banner + card.
    this.els.bannerTitle.textContent = g.jobs.bannerTitle();
    let sub = g.jobs.objectiveLabel();
    if (g.jobs.phaseTimer !== null && !g.jobs.done) sub += ` · ${Math.ceil(g.jobs.phaseTimer)}s`;
    this.els.bannerSub.textContent = sub;
    this.els.cardTitle.textContent = g.jobs.bannerTitle();
    const job = g.jobs.job;
    this.els.cardText.innerHTML = job
      ? `${g.jobs.objectiveLabel()}<br><span style="color:#59d98c">$${job.pay}</span> · +${job.respect} Respect`
      : 'Free roam — the city is yours.';

    // Dispatch roster + chatter.
    const rows = g.dispatch.buildRoster(g.police.units, g.roadblocks.blocks, g.heli, p);
    if (!rows.length) {
      this.els.roster.innerHTML = `<div class="roster-row"><span class="unit">No active units</span><span class="status">QUIET</span></div>`;
    } else {
      this.els.roster.innerHTML = rows.map((r) =>
        `<div class="roster-row"><span class="unit">${r.unit} — ${r.officer}</span><span class="status${r.status === 'AT ROADBLOCK' || r.status === 'TRACKING' ? ' hot' : ''}">${r.status} · ${r.dist}m</span></div>`).join('');
    }
    this.els.dispatchLog.innerHTML = g.dispatch.log.slice(-3).join('<br>');

    // Bottom-right stack.
    this.els.cash.textContent = `$${g.cash}`;
    this.els.respectLine.textContent = `RESPECT ${g.respect.points}`;
    this.els.rank.textContent = g.respect.rankName;
    this.els.respectFill.style.width = `${Math.round(g.respect.progress * 100)}%`;
    this.els.healthFill.style.width = `${Math.max(0, Math.round(g.player.hp))}%`;
    this.els.armorFill.style.width = `${Math.round(g.player.armor)}%`;
    this.els.radio.innerHTML = g.player.inVehicle ? `&#9836; ${g.radio.stationName}` : '&#9836; —';
    this.els.weapon.textContent = g.arsenal.ammoText();
    const speedMs = g.player.inVehicle ? Math.abs(g.player.inVehicle.speed) : g.player.moveSpeed;
    this.els.speed.textContent = `${Math.round(speedMs * 3.6)} km/h`;

    this.drawMinimap();

    // Transient layers and their timers (frozen staging holds them forever).
    if (!frozen) {
      if (this.dialogTimer > 0) { this.dialogTimer -= dt; if (this.dialogTimer <= 0) this.els.dialog.classList.add('hidden'); }
      if (this.messageTimer > 0) { this.messageTimer -= dt; if (this.messageTimer <= 0) this.els.message.classList.add('hidden'); }
      if (this.rankTimer > 0) { this.rankTimer -= dt; if (this.rankTimer <= 0) this.els.rankBanner.classList.add('hidden'); }
    }

    // Weapon wheel.
    if (g.wheelOpen) {
      this.els.wheel.classList.remove('hidden');
      this.els.wheelList.innerHTML = WEAPONS.map((w, i) => {
        const unlocked = g.arsenal.isUnlocked(w, g.respect);
        const ammo = w.mag === Infinity ? '∞' : `${g.arsenal.mags[w.id]} / ${g.arsenal.reserves[w.id]}`;
        const cls = ['wheel-row', i === g.arsenal.current ? 'sel' : '', unlocked ? '' : 'locked'].join(' ');
        return `<div class="${cls}"><span>[${w.slot}] ${w.name}${unlocked ? '' : ' — locked'}</span><span>${unlocked ? ammo : ''}</span></div>`;
      }).join('');
    } else this.els.wheel.classList.add('hidden');

    // Shop panel.
    const panel = g.activeShopPanel;
    if (panel) {
      this.els.shop.classList.remove('hidden');
      this.els.shopTitle.textContent = g.shop.panelTitle(panel);
      this.els.shopHint.textContent = g.shop.panelHint(panel);
      const rowsHtml = g.shop.rows(panel).map((r, i) =>
        `<div class="shop-row" data-row="${i}"><span>${r.label} <span class="dots">${r.dots}</span></span><span class="price">${r.price}</span></div>`).join('');
      if (this.shopPanelShown !== panel || this.els.shopList.innerHTML !== rowsHtml) {
        this.els.shopList.innerHTML = rowsHtml;
        this.shopPanelShown = panel;
        for (const rowEl of this.els.shopList.querySelectorAll('.shop-row')) {
          rowEl.style.cursor = 'pointer';
          rowEl.addEventListener('click', () => g.shop.buy(panel, Number(rowEl.dataset.row)));
        }
      }
    } else {
      this.els.shop.classList.add('hidden');
      this.shopPanelShown = null;
    }
  }

  drawMinimap() {
    const g = this.game;
    const ctx = this.mapCtx;
    const S = 192 / 442;
    const mx = (x) => (x + 196) * S;
    const my = (z) => (z + 202) * S;
    ctx.fillStyle = '#101e28';
    ctx.fillRect(0, 0, 192, 192);
    // Ocean, beach, canal.
    ctx.fillStyle = '#1d6d8c';
    ctx.fillRect(mx(204), 0, 192 - mx(204), 192);
    ctx.fillRect(mx(-138), 0, (26) * S, 192);
    ctx.fillStyle = 'rgba(230,200,143,0.55)';
    ctx.fillRect(mx(166), 0, (204 - 166) * S, 192);
    // Roads.
    ctx.strokeStyle = '#46525c';
    ctx.lineWidth = 2;
    for (const s of STREETS) {
      ctx.beginPath(); ctx.moveTo(mx(s), 0); ctx.lineTo(mx(s), 192); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, my(s)); ctx.lineTo(192, my(s)); ctx.stroke();
    }
    const p = g.playerPos();
    // Route line to the objective.
    const obj = g.jobs.objectivePos();
    if (obj) {
      ctx.strokeStyle = '#f2b138';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(mx(p.x), my(p.z)); ctx.lineTo(mx(obj.x), my(obj.z)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f2b138';
      ctx.beginPath(); ctx.arc(mx(obj.x), my(obj.z), 4, 0, Math.PI * 2); ctx.fill();
    }
    // Safehouses and shops.
    for (const m of g.safehouses.markers) {
      ctx.fillStyle = g.safehouses.isUnlocked(m.house) ? '#59d98c' : '#77808a';
      ctx.fillRect(mx(m.house.x) - 2.5, my(m.house.z) - 2.5, 5, 5);
    }
    ctx.fillStyle = '#2ea8a0';
    ctx.fillRect(mx(g.cityData.garagePos.x) - 2.5, my(g.cityData.garagePos.z) - 2.5, 5, 5);
    ctx.fillStyle = '#f2b138';
    ctx.fillRect(mx(g.cityData.gunShopPos.x) - 2.5, my(g.cityData.gunShopPos.z) - 2.5, 5, 5);
    // Police, roadblocks, Air One.
    for (const u of g.police.units) {
      ctx.fillStyle = u.disabled ? '#666' : '#ff5040';
      ctx.fillRect(mx(u.pos.x) - 2.5, my(u.pos.z) - 2.5, 5, 5);
    }
    for (const b of g.roadblocks.blocks) {
      ctx.fillStyle = '#ff9a3c';
      ctx.fillRect(mx(b.pos.x) - 3, my(b.pos.z) - 3, 6, 6);
    }
    if (g.heli.active) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(mx(g.heli.group.position.x), my(g.heli.group.position.z), 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const heading = g.player.inVehicle ? g.player.inVehicle.heading : g.player.heading;
    const px = mx(p.x), py = my(p.z);
    const fx = Math.sin(heading), fy = Math.cos(heading);
    const rx = -Math.cos(heading), ry = Math.sin(heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px + fx * 7, py + fy * 7);
    ctx.lineTo(px - fx * 5 + rx * 4, py - fy * 5 + ry * 4);
    ctx.lineTo(px - fx * 5 - rx * 4, py - fy * 5 - ry * 4);
    ctx.closePath(); ctx.fill();
  }
}
