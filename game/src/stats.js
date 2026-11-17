// stats.js — the player's run statistics: missions, money, cars, distance,
// stashes, fares and busts. The pause menu shows them, the save file keeps
// them, and the HUD's mission counter draws from them.
export function createStats() {
  return {
    missionsDone: 0,
    cashEarned: 0,
    carsStolen: 0,
    distanceM: 0,
    stashes: 0,
    fares: 0,
    busts: 0,
    shotsFired: 0,
    playSeconds: 0,
  };
}

export function statsLines(s) {
  const mins = Math.floor(s.playSeconds / 60);
  return [
    ['Missions completed', String(s.missionsDone)],
    ['Cash earned', '$' + Math.floor(s.cashEarned).toLocaleString('en-US')],
    ['Cars stolen', String(s.carsStolen)],
    ['Distance driven', (s.distanceM / 1000).toFixed(1) + ' km'],
    ['Stashes found', String(s.stashes)],
    ['Fares driven', String(s.fares)],
    ['Times busted', String(s.busts)],
    ['Shots fired', String(s.shotsFired)],
    ['Time played', mins + ' min'],
  ];
}
