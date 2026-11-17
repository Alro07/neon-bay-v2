# Neon Bay — Open-World Crime

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alro07/neon-bay-v2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alro07/neon-bay-v2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Bay** is a 3D open-world crime game built with three.js — a sun-soaked fictional
coastal city you explore on foot or by car. You play **Rio Voss**, a courier new to town,
taking jobs from **Mara**, the bay's fixer, while the Bay PD watches your every move.
Everything here is original: the city, the characters, the story, the art and the sound.

## What's in the game

- **Open world** — a grid city with neon buildings, a beach, a pier, a park and the Neon
  Tower, free to explore on foot or by car (third-person camera), with a day/night cycle:
  golden dusk, glowing lamps and lit windows after dark.
- **Traffic & pedestrians** — cars loop the roads, brake for obstacles and stop at red
  lights; pedestrians stroll the sidewalks and scatter when trouble starts.
- **Steal & drive cars** — walk up to any parked car and press **E** to take it. Four body
  styles with different speed and handling. Stealing raises your wanted level, and hard
  hits damage your car until it smokes and wrecks.
- **Wanted level & police** — 5 stars. Punching, shooting, stealing and hitting
  pedestrians raise the heat; Bay PD cruisers with flashing light bars chase and ram you,
  set up roadblocks at 3 stars, and bust you if they catch you on foot — cash seized.
  Break line of sight and stay calm to lose stars.
- **Story missions** — 7 sequential jobs from Mara with dialog, waypoint beacons and
  payouts: First Delivery, Hot Wheels (steal a car), Heat (lose the cops), Night Run
  (75-second timed delivery), Taxi Trouble (pick up a fare), Stash Run (collect 3 cash
  stashes), and Own the Bay (two-stop finale).
- **Side work** — hidden green cash stashes (+$60 each) and yellow ammo crates around the
  city, always worth a detour.
- **Combat** — punch (**F**) and shoot (mouse click) with a limited ammo pool, tracers,
  impact bursts and smoke; pedestrians and cruisers react.
- **HUD + live minimap** — cash, health, car health, ammo, wanted stars, clock, radio
  station, mission objective, speed, and a circular minimap showing you, the waypoint,
  police, roadblocks, traffic, pedestrians and stashes.
- **Radio** — press **Q** to cycle three synth stations (Neon Nights, Bay Drive, Sunset FM).
- **Start screen, pause menu, run stats, save/load** — progress auto-saves to localStorage.
- **Synthetic sound** — WebAudio engine hum, sirens, gunshots and synth music. No audio
  files, no network requests — everything is vendored or generated.

## How to play

Serve the `game/` folder with any static server, e.g. `node serve.ts`, then open
http://localhost:8080 in desktop Chrome.

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse | Look (click the game to lock the pointer) |
| E | Steal / exit car, advance dialog |
| F | Punch |
| Click | Shoot |
| Space | Brake |
| Shift | Sprint |
| Q | Cycle radio station |
| M | Restart mission |
| P / Esc | Pause (stats + save) |

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=q57bcks6&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
