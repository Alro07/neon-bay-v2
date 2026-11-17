// traffic.js — AI traffic cars that loop around city blocks on the road grid,
// braking for obstacles ahead and stopping at red lights. The light cycle is
// shared: north-south green, then east-west green, eight seconds each.
import * as THREE from 'three';
import { createCar, bumpCars } from './vehicles.js';
import { turnToward } from './util.js';

const LOOPS = [
  [[-60, -60], [60, -60], [60, 60], [-60, 60]],
  [[-30, -30], [30, -30], [30, 30], [-30, 30]],
  [[-60, 0], [60, 0], [60, 30], [-60, 30]],
  [[0, -60], [0, 60], [-30, 60], [-30, -60]],
  [[-60, -30], [-60, 30], [30, 30], [30, -30]],
  [[-30, -60], [60, -60], [60, 0], [-30, 0]],
  [[-60, -45], [60, -45], [60, -15], [-60, -15]],
  [[-45, -60], [-45, 60], [-15, 60], [-15, -60]],
];

export function spawnTraffic(scene, rng) {
  const cars = [];
  LOOPS.forEach((loop, i) => {
    const start = loop[i % loop.length];
    const c = createCar(scene, start[0], start[1], 0, 0x9aa3b2, { body: i % 3 === 2 ? 2 : 0 });
    c.loop = loop;
    c.loopIndex = (i + 1) % loop.length;
    c.cruise = 9 + rng() * 4;
    c.wait = 0;
    cars.push(c);
  });
  // Two extra cruisers on the beach boulevard loop.
  const extra = createCar(scene, -60, -84, Math.PI / 2, 0x8a94a6, { body: 1 });
  extra.loop = [[-60, -84], [60, -84], [60, -66], [-60, -66]];
  extra.loopIndex = 1;
  extra.cruise = 11;
  extra.wait = 0;
  cars.push(extra);
  const extra2 = createCar(scene, 60, -66, -Math.PI / 2, 0x7a8494, { body: 0 });
  extra2.loop = [[60, -66], [-60, -66], [-60, -84], [60, -84]];
  extra2.loopIndex = 1;
  extra2.cruise = 10;
  extra2.wait = 0;
  cars.push(extra2);
  return cars;
}

// Which axis is this car travelling on, and is its light red?
function lightIsRed(state, car) {
  const ns = Math.abs(Math.cos(car.heading)) > Math.abs(Math.sin(car.heading));
  const nsGreen = state.lightPhase === 'ns';
  return ns ? !nsGreen : nsGreen;
}

function nearLight(car, state) {
  for (const L of state.city.lights) {
    const dx = L.x - car.group.position.x;
    const dz = L.z - car.group.position.z;
    const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
    const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
    if (along > 0 && along < 9 && side < 3.5) return true;
  }
  return false;
}

function obstacleAhead(state, car, dist) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  const px = car.group.position.x;
  const pz = car.group.position.z;
  const check = (x, z) => {
    const dx = x - px;
    const dz = z - pz;
    const along = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    return along > 0 && along < dist && side < 2.2;
  };
  if (state.player.car !== car && check(state.player.pos.x, state.player.pos.z)) return true;
  for (const other of state.traffic) {
    if (other !== car && check(other.group.position.x, other.group.position.z)) return true;
  }
  for (const cop of state.police) {
    if (check(cop.group.position.x, cop.group.position.z)) return true;
  }
  for (const rb of state.roadblocks) {
    if (check(rb.group.position.x, rb.group.position.z)) return true;
  }
  return false;
}

export function updateTrafficLights(state, dt) {
  state.lightTimer -= dt;
  if (state.lightTimer <= 0) {
    state.lightTimer = 8;
    state.lightPhase = state.lightPhase === 'ns' ? 'ew' : 'ns';
  }
  const nsGreen = state.lightPhase === 'ns';
  for (const L of state.city.lights) {
    L.nsMat.color.setHex(nsGreen ? 0x22ff66 : 0xff3333);
    L.ewMat.color.setHex(nsGreen ? 0xff3333 : 0x22ff66);
  }
}

export function updateTraffic(state, dt) {
  for (const car of state.traffic) {
    const target = car.loop[car.loopIndex];
    const dx = target[0] - car.group.position.x;
    const dz = target[1] - car.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.5) {
      car.loopIndex = (car.loopIndex + 1) % car.loop.length;
      continue;
    }
    const wantHeading = Math.atan2(dx, dz);
    car.heading = turnToward(car.heading, wantHeading, 2.2, dt);
    const blocked = obstacleAhead(state, car, 9);
    const atRed = nearLight(car, state) && lightIsRed(state, car);
    const targetSpeed = blocked || atRed ? 0 : car.cruise;
    car.speed += (targetSpeed - car.speed) * Math.min(1, 2.5 * dt);
    car.group.position.x += Math.sin(car.heading) * car.speed * dt;
    car.group.position.z += Math.cos(car.heading) * car.speed * dt;
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  }
  for (let i = 0; i < state.traffic.length; i++) {
    for (let j = i + 1; j < state.traffic.length; j++) {
      bumpCars(state.traffic[i], state.traffic[j], 0.6);
    }
  }
}
