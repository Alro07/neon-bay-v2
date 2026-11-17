// input.js — keyboard + mouse input. WASD drive/walk, mouse orbit (pointer
// lock), E interact, F punch, click shoot, Space brake, Shift sprint,
// Q cycle radio, M restart mission, P/Esc pause.
export function createInput() {
  return {
    keys: new Set(),
    forward: false, back: false, left: false, right: false,
    sprint: false, brake: false,
    mouseDX: 0, mouseDY: 0,
    locked: false,
  };
}

export function bindInput(input, canvas, callbacks) {
  const KEYMAP = {
    KeyW: 'forward', ArrowUp: 'forward',
    KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint',
    Space: 'brake',
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (input.keys.has(e.code)) return;
    input.keys.add(e.code);
    const mapped = KEYMAP[e.code];
    if (mapped) input[mapped] = true;
    if (e.code === 'KeyE' && callbacks.onInteract) callbacks.onInteract();
    if (e.code === 'KeyF' && callbacks.onPunch) callbacks.onPunch();
    if (e.code === 'KeyQ' && callbacks.onRadio) callbacks.onRadio();
    if (e.code === 'KeyM' && callbacks.onRestartMission) callbacks.onRestartMission();
    if ((e.code === 'KeyP' || e.code === 'Escape') && callbacks.onPause) callbacks.onPause();
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    const mapped = KEYMAP[e.code];
    if (mapped) input[mapped] = false;
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.forward = input.back = input.left = input.right = false;
    input.sprint = input.brake = false;
  });
  document.addEventListener('pointerlockchange', () => {
    input.locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (e) => {
    if (!input.locked) return;
    input.mouseDX += e.movementX || 0;
    input.mouseDY += e.movementY || 0;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (!input.locked) {
      if (callbacks.onLockRequest) callbacks.onLockRequest();
      return;
    }
    if (callbacks.onShoot) callbacks.onShoot();
  });
  canvas.addEventListener('click', () => {
    if (callbacks.onDialogAdvance) callbacks.onDialogAdvance();
  });
}

export function consumeMouse(input) {
  const dx = input.mouseDX;
  const dy = input.mouseDY;
  input.mouseDX = 0;
  input.mouseDY = 0;
  return { dx, dy };
}
