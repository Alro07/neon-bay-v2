// missions.js — the Neon Bay story: seven sequential jobs from Mara, the
// bay's fixer, plus side work that always pays: hidden cash stashes around
// the city and taxi fares from waving pedestrians. Each mission has dialog,
// a waypoint beacon in the world and on the minimap, and a cash payout.
import * as THREE from 'three';
import { addWanted } from './police.js';
import { dist2d } from './util.js';

export const MISSIONS = [
  {
    id: 'first-delivery', title: '1 — First Delivery', payout: 150, kind: 'goto',
    intro: 'Rio. Welcome to Neon Bay. I need a package run to the boardwalk cafe — no questions, no stops. The yellow beacon marks the spot. Go.',
    objective: 'Deliver the package to the boardwalk cafe (yellow beacon).',
    waypoints: [{ x: -45, z: -66, label: 'Boardwalk Cafe' }],
  },
  {
    id: 'hot-wheels', title: '2 — Hot Wheels', payout: 250, kind: 'car',
    intro: 'Nice work. Next job needs wheels — fast ones. Grab any parked car on the street. The PD will notice, so don\'t hang around. Bring it to the garage on 5th.',
    objective: 'Steal a parked car (press E near one), then drive it to the garage.',
    waypoints: [{ x: 45, z: 15, label: 'Mara\'s Garage' }],
  },
  {
    id: 'heat', title: '3 — Heat', payout: 300, kind: 'goto', startWanted: 2,
    intro: 'The cops are onto us after that lift. Lose them, then meet my runner at the Neon Tower plaza. Keep your head down — if they catch you, the job is blown.',
    objective: 'Drop your wanted level, then reach the Neon Tower plaza.',
    waypoints: [{ x: 76, z: 60, label: 'Neon Tower Plaza' }],
  },
  {
    id: 'night-run', title: '4 — Night Run', payout: 400, kind: 'timed', timed: 75,
    intro: 'A buyer is waiting across town with a fat wallet, but the window is tight: 75 seconds. Drive like the bay is on fire. Don\'t be late.',
    objective: 'Reach the buyer at the marina within 75 seconds!',
    waypoints: [{ x: -75, z: 45, label: 'Marina Buyer' }],
  },
  {
    id: 'taxi-trouble', title: '5 — Taxi Trouble', payout: 350, kind: 'fare',
    intro: 'A regular of mine is stranded by the park, arm in the air. Pick them up — in a car — and drop them at the pier. No funny business, and no cops.',
    objective: 'Pick up the waving fare by the park, then drive them to the pier.',
    fareAt: { x: -38, z: -38 },
    waypoints: [{ x: -60, z: -118, label: 'Pier Drop-off' }],
  },
  {
    id: 'stash-run', title: '6 — Stash Run', payout: 500, kind: 'collect', collect: 3,
    intro: 'Three of my cash stashes are sitting around the bay — green crates, glowing. Grab all three and bring yourself home. The PD patrols the beach, so stay sharp.',
    objective: 'Collect 3 glowing green stash crates around the city.',
    waypoints: [],
  },
  {
    id: 'own-the-bay', title: '7 — Own the Bay', payout: 700, kind: 'goto',
    intro: 'Last one, Rio. Two stops: the drop at the pier, then the pickup at the north gate. Do this clean and the whole bay is yours. Mara out.',
    objective: 'Drop at the pier, then pick up at the north gate.',
    waypoints: [{ x: -60, z: -118, label: 'Pier Drop' }, { x: 60, z: -60, label: 'North Gate' }],
  },
];

let beacon = null;
let beaconRing = null;
let farePed = null;
let fareStage = 0;

export function setWaypoint(state, x, z, label) {
  clearWaypoint(state);
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.6, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  beam.position.y = 15;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.28, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.35;
  group.add(ring);
  group.position.set(x, 0, z);
  state.scene.add(group);
  beacon = group;
  beaconRing = ring;
  state.waypoint = { x, z, label };
}

export function clearWaypoint(state) {
  if (beacon) {
    state.scene.remove(beacon);
    beacon = null;
    beaconRing = null;
  }
  state.waypoint = null;
}

export function startMission(state, index) {
  const m = MISSIONS[index];
  if (!m) {
    state.missionIndex = MISSIONS.length;
    state.missionStage = 0;
    clearWaypoint(state);
    state.objective = 'All jobs done — Neon Bay is yours, Rio.';
    return;
  }
  state.missionIndex = index;
  state.missionStage = 0;
  state.missionTimer = m.timed || 0;
  state.missionCollected = 0;
  fareStage = 0;
  if (farePed) {
    farePed.waiting = false;
    farePed.fare = false;
    farePed = null;
  }
  if (m.startWanted) state.wanted = Math.max(state.wanted, m.startWanted);
  state.objective = m.objective;
  state.dialog(m.intro);
  if (m.kind === 'fare') {
    // Flag the nearest walker as the fare and park them at the pickup spot.
    let best = null;
    let bestD = Infinity;
    for (const ped of state.peds) {
      if (ped.down) continue;
      const d = dist2d(ped.mesh.position.x, ped.mesh.position.z, m.fareAt.x, m.fareAt.z);
      if (d < bestD) {
        bestD = d;
        best = ped;
      }
    }
    if (best) {
      farePed = best;
      farePed.fare = true;
      farePed.waiting = true;
      farePed.fleeing = false;
      farePed.mesh.position.set(m.fareAt.x, 0, m.fareAt.z);
      setWaypoint(state, m.fareAt.x, m.fareAt.z, 'Pick up the fare');
      state.toast('Look for the waving fare by the park', 3);
    } else {
      setWaypoint(state, m.waypoints[0].x, m.waypoints[0].z, m.waypoints[0].label);
    }
  } else if (m.kind === 'collect') {
    state.objective = m.objective + '  (0/' + m.collect + ')';
    state.toast(m.title, 3);
  } else if (m.waypoints.length > 0) {
    const wp = m.waypoints[0];
    setWaypoint(state, wp.x, wp.z, wp.label);
    state.toast(m.title, 3);
  }
  if (typeof state.onMissionStart === 'function') state.onMissionStart(m);
}

export function restartMission(state) {
  startMission(state, Math.min(state.missionIndex, MISSIONS.length - 1));
}

export function completeMission(state) {
  const m = MISSIONS[state.missionIndex];
  state.cash += m.payout;
  state.stats.missionsDone += 1;
  state.stats.cashEarned += m.payout;
  state.toast('Mission complete!  +$' + m.payout, 3.5);
  if (typeof state.onMissionComplete === 'function') state.onMissionComplete(m);
  if (typeof state.playPickup === 'function') state.playPickup();
  startMission(state, state.missionIndex + 1);
}

export function updateMissions(state, dt) {
  if (state.missionIndex >= MISSIONS.length) return;
  const m = MISSIONS[state.missionIndex];
  if (m.timed) {
    state.missionTimer -= dt;
    if (state.missionTimer <= 0) {
      state.toast('Too slow — the buyer walked. Mission restarted.', 3);
      restartMission(state);
      return;
    }
  }
  if (m.kind === 'fare' && fareStage === 0 && farePed) {
    // Pick up: player in a car, close to the waiting fare.
    if (state.player.car && dist2d(state.player.pos.x, state.player.pos.z, farePed.mesh.position.x, farePed.mesh.position.z) < 5) {
      farePed.waiting = false;
      farePed.fare = false;
      state.scene.remove(farePed.mesh);
      state.peds = state.peds.filter((p) => p !== farePed);
      farePed = null;
      fareStage = 1;
      state.stats.fares += 1;
      state.toast('Fare aboard — drive them to the pier!', 2.5);
      const wp = m.waypoints[0];
      setWaypoint(state, wp.x, wp.z, wp.label);
    }
    return;
  }
  if (m.kind === 'collect') {
    state.objective = m.objective + '  (' + state.missionCollected + '/' + m.collect + ')';
    if (state.missionCollected >= m.collect) completeMission(state);
    return;
  }
  if (!state.waypoint) return;
  if (m.kind === 'car' && state.missionStage === 0 && state.player.car) {
    state.missionStage = 1;
    state.toast('Car secured. Now drive it to the garage!', 2.5);
  }
  const d = dist2d(state.player.pos.x, state.player.pos.z, state.waypoint.x, state.waypoint.z);
  if (d < 5) {
    if (state.missionStage < m.waypoints.length - 1) {
      state.missionStage += 1;
      const wp = m.waypoints[state.missionStage];
      setWaypoint(state, wp.x, wp.z, wp.label);
      state.toast('Next stop: ' + wp.label, 2.5);
    } else {
      completeMission(state);
    }
  }
  if (beaconRing) {
    const s = 1 + Math.sin(state.elapsed * 4) * 0.12;
    beaconRing.scale.set(s, s, 1);
  }
}

// --- side work: cash stashes -------------------------------------------------
const STASH_SPOTS = [
  [7.5, -66], [45, -45], [-75, 15], [15, 60], [75, -15], [-38, 30],
];

export function spawnStashes(scene) {
  const stashes = [];
  for (const [x, z] of STASH_SPOTS) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.1, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x1fae5f, emissive: 0x0a5a2e }),
    );
    box.position.y = 0.55;
    group.add(box);
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.22, 1.7),
      new THREE.MeshBasicMaterial({ color: 0x7dff8a }),
    );
    lid.position.y = 1.2;
    lid.name = 'lid';
    group.add(lid);
    group.position.set(x, 0, z);
    scene.add(group);
    stashes.push({ group, lid, x, z, taken: false, respawn: 0 });
  }
  return stashes;
}

export function updateStashes(state, dt) {
  for (const s of state.stashes) {
    if (s.taken) {
      s.respawn -= dt;
      if (s.respawn <= 0) {
        s.taken = false;
        s.group.visible = true;
      }
      continue;
    }
    s.lid.rotation.y += dt * 1.5;
    s.group.position.y = Math.abs(Math.sin(state.elapsed * 2 + s.x)) * 0.15;
    if (dist2d(state.player.pos.x, state.player.pos.z, s.x, s.z) < 3) {
      s.taken = true;
      s.respawn = 75;
      s.group.visible = false;
      state.cash += 60;
      state.stats.cashEarned += 60;
      state.stats.stashes += 1;
      state.toast('Stash found!  +$60', 2.5);
      if (typeof state.playPickup === 'function') state.playPickup();
      if (state.missionIndex < MISSIONS.length && MISSIONS[state.missionIndex].kind === 'collect') {
        state.missionCollected += 1;
      }
    }
  }
}

// --- side work: ammo crates --------------------------------------------------
const AMMO_SPOTS = [
  [-15, 30], [60, -30], [-60, 60],
];

export function spawnAmmoCrates(scene) {
  const crates = [];
  for (const [x, z] of AMMO_SPOTS) {
    const group = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.9, 1.2),
      new THREE.MeshLambertMaterial({ color: 0x8a6a2f, emissive: 0x332200 }),
    );
    box.position.y = 0.45;
    group.add(box);
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.18, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    );
    top.position.y = 0.98;
    group.add(top);
    group.position.set(x, 0, z);
    scene.add(group);
    crates.push({ group, x, z, taken: false, respawn: 0 });
  }
  return crates;
}

export function updateAmmoCrates(state, dt) {
  for (const c of state.ammoCrates) {
    if (c.taken) {
      c.respawn -= dt;
      if (c.respawn <= 0) {
        c.taken = false;
        c.group.visible = true;
      }
      continue;
    }
    if (dist2d(state.player.pos.x, state.player.pos.z, c.x, c.z) < 3) {
      c.taken = true;
      c.respawn = 60;
      c.group.visible = false;
      state.ammo = Math.min(state.ammoMax, state.ammo + 12);
      state.toast('Ammo restocked  (+12)', 2);
      if (typeof state.playPickup === 'function') state.playPickup();
    }
  }
}
