// daynight.js — a slow day/night cycle driven by the in-game clock. The sun
// swings across the sky, the sky and fog shift from noon blue to golden dusk
// to deep night blue, the lamps glow after dark and the building windows burn
// brighter. One full in-game day takes about 40 minutes of play.
import * as THREE from 'three';
import { clamp, lerp } from './util.js';

const SKY = {
  day: new THREE.Color(0x87bfe8),
  dusk: new THREE.Color(0xff9a5c),
  night: new THREE.Color(0x0d1533),
};
const FOG = {
  day: new THREE.Color(0x9fd0ee),
  dusk: new THREE.Color(0xe88a6a),
  night: new THREE.Color(0x0d1533),
};
const SUN = {
  day: new THREE.Color(0xfff2d0),
  dusk: new THREE.Color(0xffb36b),
  night: new THREE.Color(0x8fa8ff),
};

function dayFactor(minutes) {
  // 1 at noon, 0 at midnight; smooth through dawn and dusk.
  const h = ((minutes / 60) % 24 + 24) % 24;
  const t = Math.sin(((h - 6) / 12) * Math.PI);
  return clamp(t, 0, 1);
}

function duskFactor(minutes) {
  const h = ((minutes / 60) % 24 + 24) % 24;
  const d1 = 1 - Math.min(1, Math.abs(h - 18.5) / 1.6);
  const d2 = 1 - Math.min(1, Math.abs(h - 6.5) / 1.6);
  return clamp(Math.max(d1, d2), 0, 1);
}

export function updateDayNight(state, renderer, sun, hemi, dt) {
  const day = dayFactor(state.clockMinutes);
  const dusk = duskFactor(state.clockMinutes);
  const h = ((state.clockMinutes / 60) % 24 + 24) % 24;
  // Sun position follows the hour; below the horizon at night.
  const ang = ((h - 6) / 12) * Math.PI;
  sun.position.set(Math.cos(ang) * 90, Math.sin(ang) * 90 + 12, -40);
  const sky = SKY.night.clone().lerp(SKY.day, day).lerp(SKY.dusk, dusk * 0.7);
  renderer.setClearColor(sky);
  state.scene.fog.color.copy(FOG.night.clone().lerp(FOG.day, day).lerp(FOG.dusk, dusk * 0.7));
  sun.color.copy(SUN.night.clone().lerp(SUN.day, day).lerp(SUN.dusk, dusk * 0.7));
  sun.intensity = lerp(0.7, 2.8, day) + dusk * 0.5;
  hemi.intensity = lerp(0.7, 1.5, day);
  const lampGlow = day < 0.25;
  for (const mat of state.city.lamps) {
    mat.color.setHex(lampGlow ? 0xffe9a3 : 0x8a8a7a);
  }
  // Building windows glow brighter at night.
  const winGlow = lerp(0.75, 0.28, day);
  for (const b of state.city.buildingMeshes) {
    if (b.material && b.material.emissiveIntensity !== undefined) {
      b.material.emissiveIntensity = winGlow;
    }
  }
  state.isNight = day < 0.25;
  state.isDusk = dusk > 0.4;
}
