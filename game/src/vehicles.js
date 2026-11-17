// vehicles.js — procedural cars: four body styles (sedan, coupe, van, sport),
// parked cars to steal, and the player's arcade driving. Every car now has
// health: hard hits smoke it, and at zero it is a wreck that cannot drive.
import * as THREE from 'three';
import { resolveBuildingCollision, clampToCity } from './city.js';
import { clamp } from './util.js';

export const CAR_COLORS = [0xe63946, 0x39e6ff, 0xffd23e, 0x7dff8a, 0xf2f2f2, 0xff7a3d, 0xb678ff, 0x2ec4b6];

// body: 0 sedan, 1 low coupe, 2 boxy van, 3 wide sport
const BODY_SPECS = [
  { len: 4.3, wide: 2.0, cabLen: 2.1, cabH: 0.55, top: 34, accel: 22 },
  { len: 4.0, wide: 1.9, cabLen: 1.7, cabH: 0.42, top: 38, accel: 26 },
  { len: 4.8, wide: 2.1, cabLen: 3.4, cabH: 0.8, top: 27, accel: 16 },
  { len: 4.5, wide: 2.15, cabLen: 1.9, cabH: 0.45, top: 42, accel: 30 },
];

export function makeCarMesh(color, isPolice = false, body = 0) {
  const spec = BODY_SPECS[body] || BODY_SPECS[0];
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: isPolice ? 0x101418 : color });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(spec.wide, 0.62, spec.len), bodyMat);
  shell.position.y = 0.55;
  group.add(shell);
  const cabinMat = new THREE.MeshLambertMaterial({
    color: isPolice ? 0xf2f2f2 : 0x1a2436,
    emissive: isPolice ? 0x111111 : 0x05070f,
  });
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(spec.wide - 0.3, spec.cabH, spec.cabLen), cabinMat);
  cabin.position.set(0, 1.05 + spec.cabH / 2 - 0.27, -0.25);
  group.add(cabin);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const sx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headMat);
    h.position.set(sx, 0.55, spec.len / 2 + 0.01);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  for (const sx of [-0.7, 0.7]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), tailMat);
    t.position.set(sx, 0.55, -spec.len / 2 - 0.01);
    group.add(t);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0c0c0c });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    bar.position.set(0, 1.5, -0.25);
    bar.name = 'lightBar';
    group.add(bar);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(spec.wide + 0.02, 0.2, spec.len + 0.02),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    stripe.position.y = 0.62;
    group.add(stripe);
  }
  group.traverse((o) => { o.castShadow = false; });
  return { group, wheels };
}

export function createCar(scene, x, z, heading, color, opts = {}) {
  const body = opts.police ? 0 : (opts.body ?? 0);
  const { group, wheels } = makeCarMesh(color, opts.police === true, body);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    group, wheels, heading, speed: 0, color, body,
    police: opts.police === true, parked: opts.parked === true,
    health: opts.police ? 3 : 100, wrecked: false, stolen: false,
    topSpeed: opts.police ? 36 : BODY_SPECS[body].top,
    accel: BODY_SPECS[body].accel,
    smokeTimer: 0,
  };
}

export function spawnParkedCars(scene, rng) {
  const spots = [
    [-60, -18, 0, 1], [-30, 12, Math.PI, 3], [0, -42, 0, 0], [30, 48, Math.PI, 2],
    [60, -6, 0, 3], [-30, -48, Math.PI, 1], [0, 24, 0, 0], [30, -18, Math.PI, 0],
    [-60, 42, 0, 2], [60, 30, Math.PI, 1], [-45, -12, 0, 3], [45, -42, Math.PI, 0],
  ];
  const cars = [];
  spots.forEach(([x, z, h, body], i) => {
    const side = rng() < 0.5 ? 5.6 : -5.6;
    const c = createCar(scene, x + side, z, h, CAR_COLORS[i % CAR_COLORS.length], { parked: true, body });
    cars.push(c);
  });
  return cars;
}

// Damage a car; returns true when it just became a wreck.
export function damageCar(car, amount) {
  if (car.wrecked || car.police) {
    if (car.police) {
      car.health -= amount;
      if (car.health <= 0) return true;
    }
    return false;
  }
  car.health = Math.max(0, car.health - amount);
  if (car.health <= 0) {
    car.wrecked = true;
    car.speed = 0;
    return true;
  }
  return false;
}

// Arcade driving for the car the player sits in. Returns speed in mph.
export function updatePlayerCar(state, dt) {
  const car = state.player.car;
  if (!car) return 0;
  if (car.wrecked) {
    car.speed = 0;
    return 0;
  }
  const input = state.input;
  const maxSpeed = car.topSpeed;
  if (input.forward) car.speed += car.accel * dt;
  if (input.back) car.speed -= (car.speed > 0.5 ? 34 : 10) * dt;
  if (input.brake) car.speed -= Math.sign(car.speed) * 30 * dt;
  if (!input.forward && !input.back) car.speed -= Math.sign(car.speed) * 8 * dt;
  if (Math.abs(car.speed) < 0.4 && !input.forward && !input.back) car.speed = 0;
  car.speed = clamp(car.speed, -12, maxSpeed);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * 1.9 * dt * dir * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  const nx = car.group.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.group.position.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = resolveBuildingCollision(state.city.colliders, nx, nz, 1.6);
  const clamped = clampToCity(fixed.x, fixed.z);
  const hitWall = fixed.x !== nx || fixed.z !== nz || clamped.x !== nx || clamped.z !== nz;
  if (hitWall) {
    const impact = Math.abs(car.speed);
    car.speed *= 0.55;
    if (impact > 12) {
      damageCar(car, impact * 0.9);
      state.damageFlash = 0.3;
      if (car.wrecked) state.toast('Your car is wrecked — get out and find another!', 3);
    }
  }
  car.group.position.x = clamped.x;
  car.group.position.z = clamped.z;
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += car.speed * dt * 2.4;
  state.player.pos.set(car.group.position.x, 0, car.group.position.z);
  state.player.yaw = car.heading;
  return Math.abs(car.speed) * 2.2;
}

// Simple circle-vs-circle bump between two cars; pushes them apart.
export function bumpCars(a, b, strength = 1) {
  const dx = b.group.position.x - a.group.position.x;
  const dz = b.group.position.z - a.group.position.z;
  const d = Math.hypot(dx, dz) || 0.01;
  if (d < 3.4) {
    const push = (3.4 - d) * 0.5 * strength;
    const ux = dx / d;
    const uz = dz / d;
    b.group.position.x += ux * push;
    b.group.position.z += uz * push;
    a.group.position.x -= ux * push * 0.5;
    a.group.position.z -= uz * push * 0.5;
    return true;
  }
  return false;
}
