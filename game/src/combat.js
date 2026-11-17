// combat.js — punch (F) and shoot (mouse click) with a limited ammo pool.
// Punch knocks a nearby pedestrian down; shooting fires a tracer at the
// nearest target in front of the player and spends one bullet. Causing
// trouble raises the wanted level and scares the crowd. Impact bursts and
// smoke puffs are spawned here and animated by updateParticles.
import * as THREE from 'three';
import { addWanted } from './police.js';
import { scarePedestrians } from './pedestrians.js';
import { damageCar } from './vehicles.js';

let tracer = null;
let tracerTimer = 0;
const particles = [];

export function spawnBurst(scene, x, y, z, color, count = 14) {
  const geo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x, y, z);
    scene.add(p);
    particles.push({
      mesh: p, life: 0.5 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 9, vy: Math.random() * 6 + 2, vz: (Math.random() - 0.5) * 9,
    });
  }
}

export function spawnSmoke(scene, x, y, z) {
  const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const mat = new THREE.MeshBasicMaterial({ color: 0x555560, transparent: true, opacity: 0.55 });
  const p = new THREE.Mesh(geo, mat);
  p.position.set(x, y, z);
  scene.add(p);
  particles.push({ mesh: p, life: 1.1, vx: (Math.random() - 0.5) * 1.5, vy: 2.2, vz: (Math.random() - 0.5) * 1.5, smoke: true });
}

export function updateParticles(state, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.scene.remove(p.mesh);
      particles.splice(i, 1);
      continue;
    }
    if (!p.smoke) p.vy -= 18 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    if (p.mesh.position.y < 0.1) p.mesh.position.y = 0.1;
    if (p.smoke) {
      p.mesh.scale.setScalar(1 + (1.1 - p.life) * 1.6);
      p.mesh.material.opacity = Math.max(0, p.life * 0.5);
    }
  }
  if (tracer) {
    tracerTimer -= dt;
    if (tracerTimer <= 0) {
      state.scene.remove(tracer);
      tracer = null;
    }
  }
}

function aimDirection(state) {
  const yaw = state.player.car ? state.player.yaw : state.cameraYaw;
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function tryPunch(state) {
  if (state.punchCooldown > 0 || !state.started || state.paused) return false;
  state.punchCooldown = 0.45;
  const dir = aimDirection(state);
  let hit = null;
  let best = 2.8;
  for (const ped of state.peds) {
    if (ped.down || ped.waiting) continue;
    const dx = ped.mesh.position.x - state.player.pos.x;
    const dz = ped.mesh.position.z - state.player.pos.z;
    const d = Math.hypot(dx, dz);
    const dot = d > 0.01 ? (dx * dir.x + dz * dir.z) / d : 0;
    if (d < best && dot > 0.25) {
      best = d;
      hit = ped;
    }
  }
  if (hit) {
    hit.down = true;
    hit.downTimer = 2.2;
    spawnBurst(state.scene, hit.mesh.position.x, 1.4, hit.mesh.position.z, 0xffd23e, 10);
    addWanted(state, 1, 'Assault!');
    scarePedestrians(state, state.player.pos.x, state.player.pos.z, 14);
  }
  if (typeof state.playPunch === 'function') state.playPunch();
  return !!hit;
}

export function tryShoot(state) {
  if (state.shootCooldown > 0 || !state.started || state.paused) return false;
  if (state.ammo <= 0) {
    state.toast('Out of ammo — find a yellow ammo crate!', 2);
    state.shootCooldown = 0.4;
    return false;
  }
  state.shootCooldown = 0.28;
  state.ammo -= 1;
  const dir = aimDirection(state);
  const ox = state.player.pos.x;
  const oz = state.player.pos.z;
  const oy = state.player.car ? 1.4 : 1.5;
  let hit = null;
  let best = 34;
  let hitKind = '';
  const consider = (x, z, obj, kind) => {
    const dx = x - ox;
    const dz = z - oz;
    const d = Math.hypot(dx, dz);
    if (d < 1 || d > best) return;
    const dot = (dx * dir.x + dz * dir.z) / d;
    if (dot > 0.93) {
      best = d;
      hit = obj;
      hitKind = kind;
    }
  };
  for (const ped of state.peds) {
    if (!ped.down && !ped.waiting) consider(ped.mesh.position.x, ped.mesh.position.z, ped, 'ped');
  }
  for (const cop of state.police) consider(cop.group.position.x, cop.group.position.z, cop, 'cop');
  const endX = ox + dir.x * best;
  const endZ = oz + dir.z * best;
  if (tracer) state.scene.remove(tracer);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(ox, oy, oz),
    new THREE.Vector3(endX, 1.2, endZ),
  ]);
  tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a3 }));
  state.scene.add(tracer);
  tracerTimer = 0.09;
  if (typeof state.playShot === 'function') state.playShot();
  if (hit) {
    spawnBurst(state.scene, endX, 1.2, endZ, 0xff6b3d, 16);
    if (hitKind === 'ped') {
      hit.down = true;
      hit.downTimer = 3;
      addWanted(state, 1, 'Shots fired!');
    } else if (hitKind === 'cop') {
      hit.health -= 1;
      spawnBurst(state.scene, endX, 1, endZ, 0x9fb0ff, 12);
      addWanted(state, 1, 'You shot a cop!');
      if (hit.health <= 0) state.toast('Cruiser disabled!', 2);
    }
    scarePedestrians(state, ox, oz, 20);
    return true;
  }
  return false;
}

// Called when the player's car is hit hard or rammed: sparks + smoke.
export function carImpact(state, car, x, z) {
  spawnBurst(state.scene, x, 1, z, 0xffd23e, 8);
  if (car.health < 35 && !car.wrecked) spawnSmoke(state.scene, x, 1.6, z);
}
