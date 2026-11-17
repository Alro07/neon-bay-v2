// police.js — Bay PD: cruisers spawn while the player is wanted, chase and
// ram, and flash their light bars. At 3 stars and above the PD sets up
// roadblocks on the road ahead of the player. Wanted stars cool down once the
// player breaks line of sight and stays calm — but if a cruiser catches the
// player on foot, or the player is beaten down while wanted, it is BUSTED:
// cash is seized and the player wakes up at the plaza.
import * as THREE from 'three';
import { createCar, bumpCars, damageCar } from './vehicles.js';
import { resolveBuildingCollision, clampToCity } from './city.js';
import { turnToward, dist2d } from './util.js';

export function addWanted(state, amount, reason) {
  if (amount <= 0) return;
  state.wanted = Math.min(5, state.wanted + amount);
  state.wantedTimer = 0;
  state.lastCrimeAt = state.elapsed;
  if (reason) state.toast(reason + '  +' + amount + '★', 2.2);
}

export function spawnPoliceCar(state) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 26 + Math.random() * 14;
  const c = clampToCity(
    state.player.pos.x + Math.sin(angle) * dist,
    state.player.pos.z + Math.cos(angle) * dist,
    6,
  );
  const cop = createCar(state.scene, c.x, c.z, 0, 0x101418, { police: true });
  cop.cruise = 24 + state.wanted * 1.5;
  cop.flashPhase = Math.random() * 10;
  state.police.push(cop);
  return cop;
}

function spawnRoadblock(state) {
  // Two cruisers parked across the road ahead of the player's heading.
  const hx = Math.sin(state.player.yaw);
  const hz = Math.cos(state.player.yaw);
  const bx = state.player.pos.x + hx * 34;
  const bz = state.player.pos.z + hz * 34;
  const perp = state.player.yaw + Math.PI / 2;
  const blocks = [];
  for (const side of [-3.2, 3.2]) {
    const x = bx + Math.sin(perp) * side;
    const z = bz + Math.cos(perp) * side;
    const car = createCar(state.scene, x, z, perp, 0x101418, { police: true });
    car.parked = true;
    car.speed = 0;
    car.flashPhase = Math.random() * 10;
    state.scene.add(car.group);
    state.roadblocks.push(car);
    blocks.push(car);
  }
  state.toast('ROADBLOCK AHEAD — Bay PD is closing in!', 3);
  return blocks;
}

function clearRoadblocks(state) {
  for (const rb of state.roadblocks) state.scene.remove(rb.group);
  state.roadblocks = [];
}

export function updatePolice(state, dt) {
  const wantCount = state.wanted > 0 ? Math.min(3, state.wanted) : 0;
  while (state.police.length < wantCount) spawnPoliceCar(state);
  while (state.police.length > wantCount) {
    const cop = state.police.pop();
    state.scene.remove(cop.group);
  }

  // Roadblocks while the heat is high; cleared when it cools off.
  if (state.wanted >= 3 && state.roadblocks.length === 0 && state.elapsed - (state.lastRoadblockAt || -999) > 25) {
    spawnRoadblock(state);
    state.lastRoadblockAt = state.elapsed;
  }
  if (state.wanted < 3 && state.roadblocks.length > 0) clearRoadblocks(state);

  for (const cop of state.police) {
    const px = state.player.pos.x;
    const pz = state.player.pos.z;
    const dx = px - cop.group.position.x;
    const dz = pz - cop.group.position.z;
    const dist = Math.hypot(dx, dz);
    const wantHeading = Math.atan2(dx, dz);
    const turnRate = dist < 6 ? 3.4 : 2.4;
    cop.heading = turnToward(cop.heading, wantHeading, turnRate, dt);
    const targetSpeed = cop.health <= 0 ? 0 : (dist < 4 ? cop.cruise * 0.4 : cop.cruise);
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, 2 * dt);
    const nx = cop.group.position.x + Math.sin(cop.heading) * cop.speed * dt;
    const nz = cop.group.position.z + Math.cos(cop.heading) * cop.speed * dt;
    const fixed = resolveBuildingCollision(state.city.colliders, nx, nz, 1.6);
    const cl = clampToCity(fixed.x, fixed.z, 2);
    cop.group.position.x = cl.x;
    cop.group.position.z = cl.z;
    cop.group.rotation.y = cop.heading;
    for (const w of cop.wheels) w.rotation.x += cop.speed * dt * 2.4;
    cop.flashPhase += dt * 9;
    const bar = cop.group.getObjectByName('lightBar');
    if (bar) bar.material.color.setHex(Math.sin(cop.flashPhase) > 0 ? 0xff2222 : 0x2244ff);
    // Ram the player: bump their car, or hurt them on foot.
    if (state.player.car) {
      if (bumpCars(cop, state.player.car, 1.4)) {
        state.player.car.speed *= 0.82;
        cop.speed *= 0.7;
        state.damageFlash = 0.35;
        state.health = Math.max(0, state.health - 2 * dt * 10);
        if (Math.abs(cop.speed) > 6 || Math.abs(state.player.car.speed) > 10) {
          damageCar(state.player.car, 4 * dt * 10);
          if (state.player.car.wrecked) state.toast('Your car is wrecked — bail out!', 3);
        }
      }
    } else if (dist < 2.6) {
      state.health = Math.max(0, state.health - 12 * dt);
      state.damageFlash = 0.4;
      // Caught on foot: the bust timer runs while a cruiser is on top of you.
      state.bustTimer += dt;
      if (state.bustTimer > 1.2) {
        state.bustTimer = 0;
        if (typeof state.onBusted === 'function') state.onBusted();
      }
    } else {
      state.bustTimer = Math.max(0, state.bustTimer - dt * 2);
    }
    if (cop.health <= 0) {
      cop.speed = Math.max(0, cop.speed - 20 * dt);
      cop.group.position.y = 0;
    }
  }

  // Flash the roadblock light bars too.
  for (const rb of state.roadblocks) {
    rb.flashPhase += dt * 9;
    const bar = rb.group.getObjectByName('lightBar');
    if (bar) bar.material.color.setHex(Math.sin(rb.flashPhase) > 0 ? 0xff2222 : 0x2244ff);
  }

  // Wanted cooldown: no cop within 42m for a while -> lose a star.
  if (state.wanted > 0) {
    let nearest = Infinity;
    for (const cop of state.police) {
      nearest = Math.min(nearest, dist2d(cop.group.position.x, cop.group.position.z, state.player.pos.x, state.player.pos.z));
    }
    const calm = nearest > 42 || state.police.length === 0;
    if (calm) {
      state.wantedTimer += dt;
      if (state.wantedTimer > 9) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        state.toast(state.wanted > 0 ? 'Heat cooling off… ' + state.wanted + '★ left' : 'You lost the cops!', 2.5);
      }
    } else {
      state.wantedTimer = 0;
    }
  }
}

export function clearAllPolice(state) {
  for (const cop of state.police) state.scene.remove(cop.group);
  state.police = [];
  clearRoadblocks(state);
}
