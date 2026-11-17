// pedestrians.js — sidewalk walkers with simple wander AI. They stroll
// between random sidewalk points, and scatter (flee) when the player punches,
// shoots, or drives at them. Hitting one raises the wanted level. One walker
// at a time can be a taxi fare: they wait, arm raised, until the player
// pulls up beside them.
import * as THREE from 'three';
import { resolveBuildingCollision, clampToCity } from './city.js';
import { turnToward } from './util.js';

const SHIRTS = [0xff5da2, 0x39e6ff, 0xffd23e, 0x7dff8a, 0xff7a3d, 0xb678ff, 0xf2f2f2, 0xff4d6d];
const SKINS = [0xf2c89b, 0xc98d5f, 0x8a5a34, 0xffd9b3];

export function makePedestrianMesh(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(rng() * SHIRTS.length)] });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.36), shirt);
  body.position.y = 1.05;
  group.add(body);
  const skin = new THREE.MeshLambertMaterial({ color: SKINS[Math.floor(rng() * SKINS.length)] });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), skin);
  head.position.y = 1.78;
  group.add(head);
  const legs = new THREE.MeshLambertMaterial({ color: 0x232a3d });
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.24), legs);
    leg.position.set(sx, 0.3, 0);
    leg.name = sx < 0 ? 'legL' : 'legR';
    group.add(leg);
  }
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), skin);
  armR.position.set(0.42, 1.15, 0);
  armR.name = 'armR';
  group.add(armR);
  return group;
}

export function spawnPedestrians(scene, rng, count = 36) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = makePedestrianMesh(rng);
    const x = -85 + rng() * 170;
    const z = -70 + rng() * 155;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, heading: rng() * Math.PI * 2, speed: 1.4 + rng() * 1.2,
      target: null, fleeing: false, fleeTimer: 0, down: false, downTimer: 0,
      walkPhase: rng() * 10, fare: false, waiting: false,
    });
  }
  return peds;
}

function pickTarget(ped, rng) {
  const x = Math.max(-88, Math.min(88, ped.mesh.position.x + (rng() - 0.5) * 60));
  const z = Math.max(-72, Math.min(88, ped.mesh.position.z + (rng() - 0.5) * 60));
  ped.target = { x, z };
}

export function scarePedestrians(state, x, z, radius) {
  for (const ped of state.peds) {
    if (ped.waiting) continue;
    const d = Math.hypot(ped.mesh.position.x - x, ped.mesh.position.z - z);
    if (d < radius) {
      ped.fleeing = true;
      ped.fleeTimer = 3 + Math.random() * 2;
    }
  }
}

export function updatePedestrians(state, dt, rng) {
  for (const ped of state.peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      ped.mesh.rotation.x = -Math.PI / 2 * 0.9;
      if (ped.downTimer <= 0) {
        ped.down = false;
        ped.mesh.rotation.x = 0;
        ped.fleeing = true;
        ped.fleeTimer = 4;
      }
      continue;
    }
    // A waiting fare stands still, arm raised, waving.
    if (ped.waiting) {
      const arm = ped.mesh.getObjectByName('armR');
      if (arm) arm.rotation.z = -2.4 + Math.sin(state.elapsed * 6) * 0.35;
      ped.mesh.rotation.y += dt * 0.4;
      continue;
    }
    let speed = ped.speed;
    let tx;
    let tz;
    if (ped.fleeing) {
      ped.fleeTimer -= dt;
      if (ped.fleeTimer <= 0) ped.fleeing = false;
      const dx = ped.mesh.position.x - state.player.pos.x;
      const dz = ped.mesh.position.z - state.player.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      tx = ped.mesh.position.x + (dx / d) * 10;
      tz = ped.mesh.position.z + (dz / d) * 10;
      speed = 5.2;
    } else {
      if (!ped.target) pickTarget(ped, rng);
      tx = ped.target.x;
      tz = ped.target.z;
    }
    const dx = tx - ped.mesh.position.x;
    const dz = tz - ped.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2 && !ped.fleeing) {
      ped.target = null;
      continue;
    }
    const want = Math.atan2(dx, dz);
    ped.heading = turnToward(ped.heading, want, 3, dt);
    const nx = ped.mesh.position.x + Math.sin(ped.heading) * speed * dt;
    const nz = ped.mesh.position.z + Math.cos(ped.heading) * speed * dt;
    const fixed = resolveBuildingCollision(state.city.colliders, nx, nz, 0.6);
    const clamped = clampToCity(fixed.x, fixed.z, 2);
    ped.mesh.position.x = clamped.x;
    ped.mesh.position.z = clamped.z;
    ped.mesh.rotation.y = ped.heading;
    ped.walkPhase += dt * speed * 3.2;
    ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.06;
    const legL = ped.mesh.getObjectByName('legL');
    const legR = ped.mesh.getObjectByName('legR');
    if (legL && legR) {
      legL.rotation.x = Math.sin(ped.walkPhase) * 0.55;
      legR.rotation.x = -Math.sin(ped.walkPhase) * 0.55;
    }
  }
}
