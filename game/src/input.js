// input.js — keyboard (WASD / arrows, E / Space interact, 1-8 quick
// crates, P pause, R restart) and mouse (click-to-move, click a station
// to walk there and use it). Coordinates are canvas coordinates.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    // Latest mouse position in canvas coordinates.
    mouseX: 0,
    mouseY: 0,
    // Clicks queued since the last frame was read.
    clicks: [],
    // Keys pressed since the last frame was read (edge-triggered).
    pressed: new Set(),
  };

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(k);
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    input.keys.delete(k);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.clicks.push(p);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toCanvas(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });

  return input;
}

// Movement vector from held keys, normalised.
export function moveVector(input) {
  let x = 0, y = 0;
  if (input.keys.has('a') || input.keys.has('ArrowLeft')) x -= 1;
  if (input.keys.has('d') || input.keys.has('ArrowRight')) x += 1;
  if (input.keys.has('w') || input.keys.has('ArrowUp')) y -= 1;
  if (input.keys.has('s') || input.keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function wasPressed(input, key) {
  return input.pressed.has(key);
}

// Clear the per-frame edge queues. Call once per frame after reading.
export function endFrame(input) {
  input.clicks.length = 0;
  input.pressed.clear();
}
