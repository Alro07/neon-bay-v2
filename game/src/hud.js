// hud.js — the HUD: cash, health, car health, ammo, wanted stars, clock,
// radio station, objective, speed, and a live circular minimap drawn on a 2D
// canvas (player, waypoint, police, traffic, pedestrians, stashes, beach).
// Also owns the toast, dialog, damage flash and stats panel.
import { MISSIONS } from './missions.js';
import { money, clockText } from './util.js';
import { statsLines } from './stats.js';

const els = {};
let minimapCtx = null;

export function initHud() {
  const el = (id) => document.getElementById(id);
  els.cash = el('cash');
  els.clock = el('clock');
  els.stars = el('stars');
  els.health = el('health-bar');
  els.carBar = el('car-bar');
  els.carWrap = el('car-wrap');
  els.ammo = el('ammo');
  els.speed = el('speed');
  els.objective = el('objective-text');
  els.toast = el('toast');
  els.prompt = el('prompt');
  els.dialog = el('dialog');
  els.dialogText = el('dialog-text');
  els.crosshair = el('crosshair');
  els.hud = el('hud');
  els.radio = el('radio');
  els.statsList = el('stats-list');
  els.busted = el('busted');
  els.flash = el('flash');
  const mm = document.getElementById('minimap');
  minimapCtx = mm.getContext('2d');
}

export function showHud(on) {
  els.hud.classList.toggle('on', on);
}

export function showDialog(text) {
  els.dialogText.textContent = text;
  els.dialog.classList.add('on');
}

export function hideDialog() {
  els.dialog.classList.remove('on');
}

export function showToast(state, text, seconds) {
  state.toastText = text;
  state.toastUntil = state.elapsed + seconds;
}

export function showBusted(state, lost) {
  els.busted.querySelector('.lost').textContent = 'The Bay PD seized $' + lost + ' of your cash.';
  els.busted.classList.remove('hidden');
  setTimeout(() => els.busted.classList.add('hidden'), 2600);
}

export function renderStats(state) {
  els.statsList.innerHTML = statsLines(state.stats)
    .map(([k, v]) => '<div><span>' + k + '</span><b>' + v + '</b></div>')
    .join('');
}

export function updateHud(state) {
  els.cash.textContent = money(state.cash);
  let clock = clockText(state.clockMinutes);
  if (state.missionIndex < MISSIONS.length && MISSIONS[state.missionIndex].timed) {
    clock += '  ⏱ ' + Math.max(0, Math.ceil(state.missionTimer)) + 's';
  }
  els.clock.textContent = clock;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    stars += '<span class="' + (i < state.wanted ? 'lit' : 'dim') + '">★</span>';
  }
  els.stars.innerHTML = stars;
  els.health.style.width = Math.max(0, state.health) + '%';
  if (state.player.car) {
    els.carWrap.style.display = 'block';
    els.carBar.style.width = Math.max(0, state.player.car.health) + '%';
    els.carBar.style.background = state.player.car.health < 35
      ? 'linear-gradient(90deg,#ff2222,#ff7a3d)' : 'linear-gradient(90deg,#39e6ff,#7dff8a)';
  } else {
    els.carWrap.style.display = 'none';
  }
  els.ammo.textContent = '🔫 ' + state.ammo + ' / ' + state.ammoMax;
  els.radio.textContent = '♪ ' + state.sound.stationName();
  els.speed.textContent = state.player.car
    ? Math.round(state.speedMph) + ' mph  •  ' + (state.player.car.police ? 'BAY PD CRUISER' : 'YOUR CAR')
    : 'ON FOOT';
  els.objective.textContent = state.objective;
  els.crosshair.style.display = (!state.player.car && state.started && !state.paused) ? 'block' : 'none';
  if (state.toastText && state.elapsed < state.toastUntil) {
    els.toast.textContent = state.toastText;
  } else {
    els.toast.textContent = '';
    state.toastText = '';
  }
  els.prompt.textContent = state.promptText || '';
  els.flash.style.opacity = state.damageFlash > 0 ? String(Math.min(0.55, state.damageFlash)) : '0';
  drawMinimap(state);
}

function toMap(state, x, z) {
  const s = 190 / 240;
  return [95 + (x + 5) * s, 95 + (z + 5) * s];
}

function drawMinimap(state) {
  const g = minimapCtx;
  if (!g) return;
  g.clearRect(0, 0, 190, 190);
  g.save();
  g.beginPath();
  g.arc(95, 95, 94, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = state.isNight ? '#0e1830' : '#1d2b45';
  g.fillRect(0, 0, 190, 190);
  const [, sandY] = toMap(state, 0, -85);
  g.fillStyle = '#c9a86a';
  g.fillRect(0, sandY, 190, 190 - sandY);
  const [, waterY] = toMap(state, 0, -119);
  g.fillStyle = '#1e7fb8';
  g.fillRect(0, waterY, 190, 190 - waterY);
  g.strokeStyle = '#5a6274';
  g.lineWidth = 5;
  for (const c of [-60, -30, 0, 30, 60]) {
    const [x] = toMap(state, c, 0);
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 190);
    g.stroke();
    const [, y] = toMap(state, 0, c);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(190, y);
    g.stroke();
  }
  // North marker.
  g.fillStyle = '#ffffff';
  g.font = 'bold 13px sans-serif';
  g.fillText('N', 91, 14);
  const dot = (x, z, color, r) => {
    const [mx, my] = toMap(state, x, z);
    g.fillStyle = color;
    g.beginPath();
    g.arc(mx, my, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const car of state.traffic) dot(car.group.position.x, car.group.position.z, '#cfd6e4', 2.5);
  for (const ped of state.peds) dot(ped.mesh.position.x, ped.mesh.position.z, '#ff9ecf', 1.6);
  for (const cop of state.police) dot(cop.group.position.x, cop.group.position.z, '#ff4444', 3.5);
  for (const rb of state.roadblocks) dot(rb.group.position.x, rb.group.position.z, '#ff8800', 3.5);
  for (const s of state.stashes) {
    if (!s.taken) dot(s.x, s.z, '#7dff8a', 2.6);
  }
  if (state.waypoint) {
    const [wx, wy] = toMap(state, state.waypoint.x, state.waypoint.z);
    const pulse = 5 + Math.sin(state.elapsed * 5) * 1.5;
    g.fillStyle = '#ffd23e';
    g.beginPath();
    g.moveTo(wx, wy - pulse);
    g.lineTo(wx + pulse, wy);
    g.lineTo(wx, wy + pulse);
    g.lineTo(wx - pulse, wy);
    g.closePath();
    g.fill();
  }
  const [px, py] = toMap(state, state.player.pos.x, state.player.pos.z);
  g.save();
  g.translate(px, py);
  g.rotate(Math.atan2(Math.sin(state.player.yaw), Math.cos(state.player.yaw)));
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, 6);
  g.lineTo(-5, 6);
  g.closePath();
  g.fill();
  g.restore();
  g.restore();
  g.strokeStyle = '#39e6ff';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(95, 95, 93, 0, Math.PI * 2);
  g.stroke();
}
