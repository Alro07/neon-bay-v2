// city.js — Neon Bay, an original sun-soaked coastal city: a road grid with
// sidewalks and dashed centre lines, a beach and the bay to the south, a pier,
// a park and a tower plaza, neon towers with lit windows, palms, street lamps
// and four signalled intersections. Deterministic (seeded) so every run of
// the game looks the same. Exports the colliders, the water and beacon for
// the day/night system, the lamp meshes that glow after dark, and the
// traffic-light heads the traffic system switches.
import * as THREE from 'three';
import { makeRng } from './util.js';

export const CITY_BOUND = 96;
export const ROAD_LINES = [-60, -30, 0, 30, 60];
const ROAD_W = 9;

function litWindowsTexture(rng) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#a8adc2';
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = rng() < 0.55;
      g.fillStyle = lit ? (rng() < 0.7 ? '#ffe9a3' : '#8ef6ff') : '#3a4060';
      g.fillRect(x, y, 8, 7);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const rng = makeRng(20261117);
  const colliders = [];
  const lamps = [];
  const lights = [];
  const group = new THREE.Group();
  group.name = 'NeonBayCity';

  // Ground slab, then sand and water to the south.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280),
    new THREE.MeshLambertMaterial({ color: 0x5a6b4e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -10);
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 36),
    new THREE.MeshLambertMaterial({ color: 0xe8d29a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.05, -104);
  group.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 100),
    new THREE.MeshLambertMaterial({ color: 0x1e7fb8, emissive: 0x0a3d66 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, -172);
  water.name = 'bayWater';
  group.add(water);

  // The pier: wooden boards jutting into the bay, with posts.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a45 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 46), pierMat);
  pier.position.set(-60, 0.4, -140);
  group.add(pier);
  for (let z = -124; z >= -160; z -= 9) {
    for (const sx of [-4.4, 4.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.4, 6), pierMat);
      post.position.set(-60 + sx, 0.2, z);
      group.add(post);
    }
  }

  // Roads, sidewalks and dashed centre lines on the grid.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x33343f });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x9a9fb0 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
  for (const c of ROAD_LINES) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 210), roadMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.08, -5);
    group.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(210, ROAD_W), roadMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(-5, 0.08, c);
    group.add(ew);
    for (const off of [-7.5, 7.5]) {
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(3, 210), walkMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(c + off, 0.06, -5);
      group.add(s1);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(210, 3), walkMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(-5, 0.06, c + off);
      group.add(s2);
    }
    for (let d = -95; d < 95; d += 8) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 3.4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.1, d);
      group.add(dash);
    }
  }

  // Central park: green square with a pond and benches, no buildings.
  const park = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshLambertMaterial({ color: 0x3f8f4f }),
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(-45, 0.07, -45);
  group.add(park);
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(5, 20),
    new THREE.MeshLambertMaterial({ color: 0x2f8fc9, emissive: 0x0a3d66 }),
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-45, 0.09, -45);
  group.add(pond);

  // Buildings: one or two per block, bright neon palette, lit windows.
  // The park block stays empty.
  const palette = [0xff5da2, 0x39e6ff, 0xffd23e, 0x7dff8a, 0xff7a3d, 0xb678ff, 0x4dc3ff, 0xff4d6d];
  const winTex = litWindowsTexture(rng);
  const blocks = [];
  for (let i = 0; i < ROAD_LINES.length - 1; i++) {
    for (let j = 0; j < ROAD_LINES.length - 1; j++) {
      blocks.push([ROAD_LINES[i] + 15, ROAD_LINES[j] + 15]);
    }
  }
  const buildingMeshes = [];
  for (const [bx, bz] of blocks) {
    if (bx === -45 && bz === -45) continue; // the park
    const count = rng() < 0.5 ? 1 : 2;
    for (let k = 0; k < count; k++) {
      const w = 9 + rng() * 7;
      const d = 9 + rng() * 7;
      const h = 8 + rng() * rng() * 34;
      const cx = bx + (count === 2 ? (k === 0 ? -5 : 5) : 0) + (rng() - 0.5) * 2;
      const cz = bz + (rng() - 0.5) * 2;
      const color = palette[Math.floor(rng() * palette.length)];
      const mat = new THREE.MeshLambertMaterial({
        color, map: winTex, emissive: color, emissiveIntensity: 0.28,
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx, h / 2, cz);
      group.add(b);
      buildingMeshes.push(b);
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff2ea6 }),
      );
      trim.position.set(cx, h + 0.25, cz);
      group.add(trim);
    }
  }

  // Neon Tower landmark on the north-east plaza.
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(16, 62, 16),
    new THREE.MeshLambertMaterial({ color: 0x27306e, map: winTex, emissive: 0x331133 }),
  );
  tower.position.set(76, 31, 76);
  group.add(tower);
  colliders.push({ minX: 68, maxX: 84, minZ: 68, maxZ: 84, h: 62 });
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 2.2, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff2ea6, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beacon.position.set(76, 75, 76);
  beacon.name = 'towerBeacon';
  group.add(beacon);

  // Palm trees along the beach boulevard and around the park.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f });
  const palmSpots = [];
  for (let x = -85; x <= 85; x += 10) palmSpots.push([x, -72]);
  for (const [px, pz] of [[-58, -32], [-32, -58], [-58, -58], [-32, -32]]) palmSpots.push([px, pz]);
  for (const [x, z] of palmSpots) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 8), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 8), leafMat);
    crown.position.set(x, 8.4, z);
    group.add(crown);
  }

  // Street lamps at intersections; their bulbs glow after dark.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x30343f });
  for (const cx of ROAD_LINES) {
    for (const cz of ROAD_LINES) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), poleMat);
      pole.position.set(cx + 6, 3, cz + 6);
      group.add(pole);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), bulbMat);
      bulb.position.set(cx + 6, 6.2, cz + 6);
      group.add(bulb);
      lamps.push(bulbMat);
    }
  }

  // Traffic lights at four busy intersections: one head per approach.
  for (const [ix, iz] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.4, 6), poleMat);
    pole.position.set(ix + 5.4, 2.7, iz + 5.4);
    group.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.7, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x14161c }),
    );
    head.position.set(ix + 5.4, 5.6, iz + 5.4);
    group.add(head);
    const nsMat = new THREE.MeshBasicMaterial({ color: 0x22ff66 });
    const ns = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), nsMat);
    ns.position.set(ix + 5.4, 6.1, iz + 5.4);
    group.add(ns);
    const ewMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const ew = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), ewMat);
    ew.position.set(ix + 5.4, 5.35, iz + 5.4);
    group.add(ew);
    lights.push({ x: ix, z: iz, nsMat, ewMat });
  }

  scene.add(group);
  return { group, colliders, buildingMeshes, water, beacon, lamps, lights };
}

// Push a circle (x, z, radius) out of every building collider it overlaps.
export function resolveBuildingCollision(colliders, x, z, radius) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(px, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pz, c.maxZ));
    const dx = px - nx;
    const dz = pz - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        px = nx + (dx / d) * radius;
        pz = nz + (dz / d) * radius;
      } else {
        px = c.maxX + radius;
      }
    }
  }
  return { x: px, z: pz };
}

export function clampToCity(x, z, margin = 4) {
  return {
    x: Math.max(-CITY_BOUND + margin, Math.min(CITY_BOUND - margin, x)),
    z: Math.max(-118, Math.min(CITY_BOUND - margin, z)),
  };
}
