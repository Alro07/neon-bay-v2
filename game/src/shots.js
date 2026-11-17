// shots.js — deterministic staging for screenshots. ?shot=cover|drive|foot|mission
// places the player, sets the wanted level, spawns police and opens the right
// mission state BEFORE the first frame renders, so each screenshot shows the
// system it is meant to show. Used by the maker only; normal play ignores it.
import { startMission, MISSIONS } from './missions.js';
import { spawnPoliceCar } from './police.js';

export function shotName() {
  const q = new URLSearchParams(window.location.search).get('shot');
  return ['cover', 'drive', 'foot', 'mission'].includes(q) ? q : null;
}

function enterCarForShot(state, index) {
  const car = state.parked[index % state.parked.length];
  car.parked = false;
  car.stolen = true;
  state.player.car = car;
  state.player.inCar = true;
  state.player.onFoot = false;
  state.player.pos.set(car.group.position.x, 0, car.group.position.z);
  return car;
}

export function applyShot(state, name) {
  if (!name) return;
  state.started = true;
  state.shotMode = name;
  document.getElementById('start-screen').classList.add('hidden');
  if (name === 'cover') {
    // Golden-hour police chase: player in a sport coupe, 3 wanted stars,
    // cruisers closing in, a roadblock ahead, mission 1 active with its
    // waypoint on the HUD and minimap.
    state.clockMinutes = 18 * 60 + 25;
    const car = enterCarForShot(state, 1);
    state.player.pos.set(0, 0, 10);
    car.group.position.set(0, 0, 10);
    car.heading = Math.PI;
    car.group.rotation.y = Math.PI;
    car.speed = 14;
    state.wanted = 3;
    spawnPoliceCar(state);
    spawnPoliceCar(state);
    state.police[0].group.position.set(-4, 0, 26);
    state.police[1].group.position.set(5, 0, 30);
    state.cameraYaw = Math.PI;
    state.cameraPitch = 0.32;
    startMission(state, 0);
    state.dialogVisible = false;
    document.getElementById('dialog').classList.remove('on');
  } else if (name === 'drive') {
    // Midday cruise down a boulevard with traffic and a green light.
    state.clockMinutes = 12 * 60 + 10;
    const car = enterCarForShot(state, 4);
    state.player.pos.set(30, 0, -20);
    car.group.position.set(30, 0, -20);
    car.heading = 0;
    car.group.rotation.y = 0;
    car.speed = 18;
    state.cameraYaw = 0;
    state.cameraPitch = 0.3;
    startMission(state, 0);
    state.dialogVisible = false;
    document.getElementById('dialog').classList.remove('on');
  } else if (name === 'foot') {
    // Morning on foot by the park: pedestrians nearby, a glowing stash
    // crate ahead, mission 6 (Stash Run) active.
    state.clockMinutes = 9 * 60 + 40;
    state.player.pos.set(0, 0, -52);
    state.player.yaw = Math.PI;
    state.cameraYaw = Math.PI;
    state.cameraPitch = 0.28;
    for (let i = 0; i < 4 && i < state.peds.length; i++) {
      state.peds[i].mesh.position.set(3 + i * 1.8, 0, -58 - i * 1.5);
    }
    startMission(state, 5);
    document.getElementById('dialog').classList.remove('on');
  } else if (name === 'mission') {
    // Afternoon story beat: Mara's dialog open for the taxi job, the fare
    // waving by the park, waypoint beacon and objective on screen.
    state.clockMinutes = 15 * 60 + 5;
    state.player.pos.set(-28, 0, -48);
    state.player.yaw = -0.7;
    state.cameraYaw = -0.7;
    state.cameraPitch = 0.3;
    for (let i = 0; i < 3 && i < state.peds.length; i++) {
      state.peds[i].mesh.position.set(-40 + i * 2.2, 0, -40 - i * 1.6);
    }
    startMission(state, 4);
  }
}
