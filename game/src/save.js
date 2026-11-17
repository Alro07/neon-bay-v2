// save.js — save / load progress in localStorage (cash, health, ammo, wanted,
// mission, position, clock, statistics). Auto-saves during play; no account,
// no network. Version 2 of the save format.
import { createStats } from './stats.js';

const SAVE_KEY = 'neonbay-save-v2';

export function saveGame(state) {
  try {
    const data = {
      version: 2,
      cash: Math.floor(state.cash),
      health: state.health,
      ammo: state.ammo,
      wanted: state.wanted,
      missionIndex: state.missionIndex,
      clockMinutes: state.clockMinutes,
      pos: { x: state.player.pos.x, z: state.player.pos.z },
      stats: state.stats,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    /* storage unavailable */
  }
}

export function mergeSaveStats(data) {
  const stats = createStats();
  if (data && data.stats) Object.assign(stats, data.stats);
  return stats;
}
