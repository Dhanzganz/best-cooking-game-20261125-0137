// main.js — boot + game loop + chef movement + demo autopilot + self-test.
// Sizzle & Serve: a timed order-fulfilment kitchen game.

import { createInput, moveVector, wasPressed, endFrame } from './input.js';
import {
  createKitchen, stationById, stationAtPoint, nearestStation,
  interact, updateKitchen, prepStationFor, isPlate, isItem, FLOOR,
} from './kitchen.js';
import {
  createOrderBoard, updateOrders, oldestOrder, spawnOrder,
  SHIFT_SECONDS, difficultyAt,
} from './orders.js';
import { RECIPES, recipeById, plateMatchesRecipe, INGREDIENTS, CRATE_ORDER } from './recipes.js';
import { drawGame, PAUSE_BUTTON } from './render.js';
import * as audio from './audio.js';

const CHEF_SPEED = 315; // was 275: the live demo served only 1-2 dishes per
// 150s — each dish needs ~9 station trips across a 1280px kitchen, so a
// ~15% faster walk lifts throughput without touching patience/burn balance.
const CHEF_RADIUS = 20;
const COMBO_WINDOW = 12; // seconds between serves to keep the combo alive

// --- Game state --------------------------------------------------------------

export function createGame() {
  const game = {
    phase: 'title', // 'title' | 'playing' | 'paused' | 'over'
    timeLeft: SHIFT_SECONDS,
    shiftSeconds: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    lastServeAt: -100,
    chef: { x: 640, y: 470, tx: 640, ty: 470, moving: false, carrying: null,
      detour: null, stuckTime: 0, detourTime: 0, prevDist: undefined },
    kitchen: createKitchen(),
    board: createOrderBoard(),
    particles: [],
    popups: [],
    hint: '',
    hintTimer: 0,
    animTime: 0,
    hoverStation: null,
    autoTarget: null, // station id to interact with on arrival
    demo: null,
    chopSoundTimer: 0,
    sceneServeAt: -1, // scene hook: auto-serve at this elapsed time
    onEvent: null,
  };
  game.onEvent = (e) => handleGameEvent(game, e);
  return game;
}

function showHint(game, msg, seconds = 2.5) {
  game.hint = msg;
  game.hintTimer = seconds;
}

// --- Particles & popups ------------------------------------------------------

function addPopup(game, text, x, y, color = '#fff', size = 22) {
  game.popups.push({ text, x, y, color, size, life: 2.5, maxLife: 2.5 });
}

function addSteam(game, x, y, n = 1) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      shape: 'steam', x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 8, vy: -28 - Math.random() * 18,
      size: 5 + Math.random() * 6, life: 1.1, maxLife: 1.1, alpha: 0.55,
    });
  }
}

function addSparks(game, x, y, color = '#ffd54a') {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 90;
    game.particles.push({
      shape: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      size: 3 + Math.random() * 3, life: 0.5, maxLife: 0.5, color, alpha: 1,
    });
  }
}

function addConfetti(game, x, y) {
  const colors = ['#ff5252', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc'];
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
    const sp = 120 + Math.random() * 160;
    game.particles.push({
      shape: 'confetti', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      size: 6 + Math.random() * 5, life: 1.4, maxLife: 1.4,
      color: colors[i % colors.length], rot: Math.random() * Math.PI, alpha: 1,
    });
  }
}

function updateParticles(game, dt) {
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.shape === 'confetti') { p.vy += 260 * dt; p.rot += dt * 6; }
    if (p.shape === 'steam') { p.vy -= 6 * dt; }
  }
  game.particles = game.particles.filter((p) => p.life > 0);
  for (const pop of game.popups) {
    pop.life -= dt;
    pop.y -= 34 * dt;
  }
  game.popups = game.popups.filter((p) => p.life > 0);
}

// --- Game events (sound + feedback) ------------------------------------------

function stationCenter(game, stationId) {
  const s = stationById(game.kitchen, stationId);
  return s ? { x: s.x + s.w / 2, y: s.y + s.h / 2 } : { x: 640, y: 400 };
}

function handleGameEvent(game, e) {
  switch (e.type) {
    case 'pickup':
      audio.playPop();
      break;
    case 'place':
      audio.playPlace();
      break;
    case 'plate': {
      audio.playPop();
      const c = stationCenter(game, 'plating');
      addSparks(game, c.x, c.y - 20, '#aeea00');
      break;
    }
    case 'trash':
      audio.playTrash();
      break;
    case 'serveFail':
      audio.playError();
      break;
    case 'done': {
      audio.playDing();
      const c = stationCenter(game, e.stationId);
      addPopup(game, 'Ready!', c.x, c.y - 50, '#43a047', 18);
      addSteam(game, c.x, c.y - 20, 3);
      break;
    }
    case 'burned': {
      audio.playBurn();
      showHint(game, 'Something burned! Trash it before it stinks up the kitchen.', 3);
      const c = stationCenter(game, e.stationId);
      addSteam(game, c.x, c.y - 20, 4);
      break;
    }
    case 'served': {
      const gap = game.elapsed - game.lastServeAt;
      game.combo = gap <= COMBO_WINDOW ? game.combo + 1 : 1;
      game.bestCombo = Math.max(game.bestCombo, game.combo);
      game.lastServeAt = game.elapsed;
      game.score += e.points;
      game.coins += e.points;
      audio.playServe();
      const c = stationCenter(game, 'pass');
      addPopup(game, '+' + e.points, c.x, c.y - 60, '#ffca28', 30);
      if (game.combo >= 2) addPopup(game, 'COMBO x' + game.combo + '!', c.x, c.y - 96, '#ff7043', 20);
      addConfetti(game, c.x, c.y - 40);
      break;
    }
    default:
      break;
  }
}

// --- Chef movement -------------------------------------------------------------

function clampToFloor(game) {
  const c = game.chef;
  c.x = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, c.x));
  c.y = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, c.y));
}

function resolveStationCollisions(game) {
  const c = game.chef;
  const r = CHEF_RADIUS;
  for (const s of game.kitchen.stations) {
    const ex = s.x - r, ey = s.y - r, ew = s.w + 2 * r, eh = s.h + 2 * r;
    if (c.x > ex && c.x < ex + ew && c.y > ey && c.y < ey + eh) {
      const pushL = c.x - ex, pushR = ex + ew - c.x;
      const pushT = c.y - ey, pushB = ey + eh - c.y;
      const m = Math.min(pushL, pushR, pushT, pushB);
      if (m === pushL) c.x = ex;
      else if (m === pushR) c.x = ex + ew;
      else if (m === pushT) c.y = ey;
      else c.y = ey + eh;
    }
  }
}

function moveChef(game, dt, input) {
  const c = game.chef;
  const mv = moveVector(input);
  if (mv.x !== 0 || mv.y !== 0) {
    // Keyboard movement overrides click-to-move.
    c.tx = c.x;
    c.ty = c.y;
    c.detour = null;
    c.stuckTime = 0;
    game.autoTarget = null;
    c.x += mv.x * CHEF_SPEED * dt;
    c.y += mv.y * CHEF_SPEED * dt;
    c.moving = true;
  } else {
    // Walk toward the detour waypoint first, then the real target.
    const tx = c.detour ? c.detour.x : c.tx;
    const ty = c.detour ? c.detour.y : c.ty;
    const dx = tx - c.x, dy = ty - c.y;
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      c.x += (dx / d) * CHEF_SPEED * dt;
      c.y += (dy / d) * CHEF_SPEED * dt;
      c.moving = true;
    } else {
      c.moving = false;
      // Arrived at a click-to-move station: use it.
      if (game.autoTarget) {
        const s = stationById(game.kitchen, game.autoTarget);
        game.autoTarget = null;
        if (s) {
          const res = interact(s, game);
          showHint(game, res.message, res.ok ? 1.6 : 2.2);
          if (!res.ok) audio.playError();
        }
      }
    }
    // Stuck detection: walking straight into a station's side never gets
    // closer, so route around its nearest corner instead.
    const dFinal = Math.hypot(c.tx - c.x, c.ty - c.y);
    if (dFinal > 8) {
      if (c.prevDist !== undefined && dFinal >= c.prevDist - 0.5) c.stuckTime += dt;
      else c.stuckTime = 0;
      c.prevDist = dFinal;
      if (c.stuckTime > 0.6 && !c.detour) {
        c.detour = findDetour(game, c);
        c.stuckTime = 0;
        c.detourTime = 0;
      }
    } else {
      c.stuckTime = 0;
      c.prevDist = undefined;
    }
    if (c.detour) {
      c.detourTime += dt;
      const dd = Math.hypot(c.detour.x - c.x, c.detour.y - c.y);
      if (dd < 12 || c.detourTime > 5) {
        c.detour = null;
        c.detourTime = 0;
        c.prevDist = undefined;
        c.stuckTime = 0;
      }
    }
  }
  clampToFloor(game);
  resolveStationCollisions(game);
}

function expandedRect(s, pad) {
  return { x: s.x - pad, y: s.y - pad, w: s.w + 2 * pad, h: s.h + 2 * pad };
}

function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 12));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInRect(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r)) return true;
  }
  return false;
}

// Pick the corner of the blocking station nearest the final target.
function findDetour(game, c) {
  const pad = CHEF_RADIUS + 10;
  let blocker = null;
  for (const s of game.kitchen.stations) {
    const r = expandedRect(s, pad);
    if (pointInRect(c.x, c.y, r) || segmentHitsRect(c.x, c.y, c.tx, c.ty, r)) {
      blocker = r;
      break;
    }
  }
  if (!blocker) return null;
  const corners = [
    { x: blocker.x - 6, y: blocker.y - 6 },
    { x: blocker.x + blocker.w + 6, y: blocker.y - 6 },
    { x: blocker.x - 6, y: blocker.y + blocker.h + 6 },
    { x: blocker.x + blocker.w + 6, y: blocker.y + blocker.h + 6 },
  ];
  let best = null, bestD = Infinity;
  for (const corner of corners) {
    const insideAnother = game.kitchen.stations.some((s) => pointInRect(corner.x, corner.y, expandedRect(s, pad)));
    if (insideAnother) continue;
    const d = Math.hypot(corner.x - c.tx, corner.y - c.ty);
    if (d < bestD) { bestD = d; best = corner; }
  }
  return best;
}

// --- Shift flow ------------------------------------------------------------------

function startShift(game) {
  const fresh = createGame();
  Object.assign(game, fresh);
  // Object.assign copies fresh's onEvent closure, which points at the
  // discarded fresh object — rebind it to this game so scoring, popups
  // and sounds actually land on the live state.
  game.onEvent = (e) => handleGameEvent(game, e);
  game.phase = 'playing';
  game.board.spawnTimer = 1.0;
  showHint(game, 'First orders are coming in — grab ingredients from the crates!', 3.5);
}

function endShift(game) {
  game.phase = 'over';
  audio.setSizzle(false);
  addConfetti(game, 640, 300);
  audio.playServe();
}

// True when a canvas click lands on the floating pause button.
function hitPauseButton(p) {
  const b = PAUSE_BUTTON;
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

// --- Demo autopilot (?demo=1) ---------------------------------------------------
// Drives the SAME interact() functions the input handlers call, so the
// screenshots show real play: walk, chop, grill, plate, serve.

function demoFindCookedItem(game, kind, prep) {
  // Returns { stationId, slotIndex } where a finished item waits, or null.
  for (const s of game.kitchen.stations) {
    if (s.kind === 'board' || s.kind === 'pot') {
      if (s.slot && s.slot.state === 'done' && s.slot.item.kind === kind) return { stationId: s.id, slotIndex: 0 };
    }
    if (s.kind === 'grill') {
      for (let i = 0; i < s.slots.length; i++) {
        const slot = s.slots[i];
        if (slot && slot.state === 'done' && slot.item.kind === kind) return { stationId: s.id, slotIndex: i };
      }
    }
  }
  return null;
}

function demoFindCookingSlot(game, kind) {
  for (const s of game.kitchen.stations) {
    if (s.kind === 'board' || s.kind === 'pot') {
      if (s.slot && s.slot.item.kind === kind && s.slot.state === 'working') return { stationId: s.id, slotIndex: 0 };
    }
    if (s.kind === 'grill') {
      for (let i = 0; i < s.slots.length; i++) {
        const slot = s.slots[i];
        if (slot && slot.item.kind === kind && slot.state === 'working') return { stationId: s.id, slotIndex: i };
      }
    }
  }
  return null;
}

function demoBuildPlan(game) {
  const order = oldestOrder(game.board);
  const plan = [];
  if (!order) return plan;
  const recipe = recipeById(order.recipeId);
  const plating = stationById(game.kitchen, 'plating');
  const plate = plating.plate;
  // Clear a plate that can never complete.
  const bad = plate.some((p) => !recipe.needs.some((n) => n.kind === p.kind && n.prep === p.prep));
  if (bad || (plate.length > 0 && !recipe.needs.some((n) => plate.some((p) => p.kind === n.kind)))) {
    plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
    plan.push({ kind: 'goto', stationId: 'trash' }, { kind: 'interact', stationId: 'trash' });
    return plan;
  }
  for (const need of recipe.needs) {
    if (plate.some((p) => p.kind === need.kind && p.prep === need.prep)) continue;
    // Already cooked and waiting somewhere?
    const cooked = demoFindCookedItem(game, need.kind, need.prep);
    if (cooked) {
      plan.push({ kind: 'goto', stationId: cooked.stationId }, { kind: 'interact', stationId: cooked.stationId });
      plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
      continue;
    }
    // Already cooking? Wait for it, then fetch it.
    const cooking = demoFindCookingSlot(game, need.kind);
    if (cooking) {
      plan.push({ kind: 'wait', stationId: cooking.stationId, slotIndex: cooking.slotIndex });
      plan.push({ kind: 'goto', stationId: cooking.stationId }, { kind: 'interact', stationId: cooking.stationId });
      plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
      continue;
    }
    const prepStation = prepStationFor(need.kind);
    if (!prepStation) {
      // Direct ingredient: crate -> plating.
      plan.push({ kind: 'goto', stationId: 'crate-' + need.kind }, { kind: 'interact', stationId: 'crate-' + need.kind });
      plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
    } else {
      // Raw ingredient: crate -> prep station -> wait -> fetch -> plating.
      plan.push({ kind: 'goto', stationId: 'crate-' + need.kind }, { kind: 'interact', stationId: 'crate-' + need.kind });
      plan.push({ kind: 'goto', stationId: prepStation }, { kind: 'interact', stationId: prepStation });
      plan.push({ kind: 'wait', stationId: prepStation, slotIndex: 0 });
      plan.push({ kind: 'goto', stationId: prepStation }, { kind: 'interact', stationId: prepStation });
      plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
    }
  }
  plan.push({ kind: 'goto', stationId: 'plating' }, { kind: 'interact', stationId: 'plating' });
  plan.push({ kind: 'goto', stationId: 'pass' }, { kind: 'interact', stationId: 'pass' });
  return plan;
}

function demoSlotState(game, stationId, slotIndex) {
  const s = stationById(game.kitchen, stationId);
  if (!s) return null;
  if (s.kind === 'grill') return s.slots[slotIndex] || null;
  return s.slot || null;
}

function demoStep(game, dt) {
  const demo = game.demo;
  if (!demo) return;
  if (demo.plan.length === 0) {
    demo.plan = demoBuildPlan(game);
    demo.stepTimer = 0;
    if (demo.plan.length === 0) return; // no orders: idle
  }
  const step = demo.plan[0];
  demo.stepTimer += dt;
  const chef = game.chef;

  if (step.kind === 'goto') {
    const s = stationById(game.kitchen, step.stationId);
    if (!s) { demo.plan.shift(); return; }
    chef.tx = s.ax;
    chef.ty = s.ay;
    const d = Math.hypot(chef.tx - chef.x, chef.ty - chef.y);
    if (d < 14 || demo.stepTimer > 7) {
      demo.plan.shift();
      demo.stepTimer = 0;
    }
    return;
  }
  if (step.kind === 'interact') {
    const s = stationById(game.kitchen, step.stationId);
    if (!s) { demo.plan.shift(); return; }
    const d = Math.hypot(s.ax - chef.x, s.ay - chef.y);
    if (d > 90) {
      // Walk closer first.
      chef.tx = s.ax;
      chef.ty = s.ay;
      return;
    }
    interact(s, game);
    demo.plan.shift();
    demo.stepTimer = 0;
    return;
  }
  if (step.kind === 'wait') {
    const slot = demoSlotState(game, step.stationId, step.slotIndex);
    if (!slot) { demo.plan = []; return; } // slot emptied: replan
    if (slot.state === 'done') {
      demo.plan.shift();
      demo.stepTimer = 0;
    } else if (slot.state === 'burned') {
      // Fetch the burnt item and trash it, then replan.
      demo.plan = [
        { kind: 'goto', stationId: step.stationId },
        { kind: 'interact', stationId: step.stationId },
        { kind: 'goto', stationId: 'trash' },
        { kind: 'interact', stationId: 'trash' },
      ];
      demo.stepTimer = 0;
    } else if (demo.stepTimer > 20) {
      demo.plan = [];
    }
    // Wait in place near the station.
    const s = stationById(game.kitchen, step.stationId);
    if (s) { chef.tx = s.ax; chef.ty = s.ay; }
  }
}

// --- Scene presets for screenshots (?scene=...) -----------------------------------
// Each preset composes a real mid-game state using the same interact(),
// spawnOrder() and updateKitchen() the game itself uses — no fake pixels.

function sceneSetup(game, scene) {
  const chef = game.chef;
  const teleportInteract = (stationId) => {
    const s = stationById(game.kitchen, stationId);
    chef.x = s.ax; chef.y = s.ay; chef.tx = s.ax; chef.ty = s.ay;
    return interact(s, game);
  };
  const cookUntilDone = (stationId, slotIndex = 0) => {
    for (let i = 0; i < 40; i++) {
      const slot = demoSlotState(game, stationId, slotIndex);
      if (slot && slot.state === 'done') return true;
      if (slot && slot.state === 'burned') return false;
      updateKitchen(game.kitchen, 0.5);
    }
    return false;
  };
  const addDirect = (kind) => {
    teleportInteract('crate-' + kind);
    teleportInteract('plating');
  };
  const addChopped = (kind) => {
    teleportInteract('crate-' + kind);
    teleportInteract('board');
    cookUntilDone('board');
    teleportInteract('board');
    teleportInteract('plating');
  };
  const addGrilled = (kind) => {
    teleportInteract('crate-' + kind);
    teleportInteract('grill');
    cookUntilDone('grill');
    teleportInteract('grill');
    teleportInteract('plating');
  };

  if (scene === 'cover') {
    // Busy mid-game: 3 tickets, burger mid-assembly, patty grilling.
    spawnOrder(game.board, 5);
    spawnOrder(game.board, 5);
    spawnOrder(game.board, 5);
    addDirect('bun');
    addDirect('cheese');
    teleportInteract('crate-patty');
    teleportInteract('grill'); // patty sizzling on the grill
    addChopped('lettuce'); // chef carries chopped lettuce to the plate next
    teleportInteract('crate-tomato');
    teleportInteract('board'); // tomato chopping on the board
    chef.x = 700; chef.y = 480; chef.tx = 700; chef.ty = 480;
  } else if (scene === 'rush') {
    // Service rush: 5 tickets, several nearly out of patience.
    for (let i = 0; i < 5; i++) spawnOrder(game.board, 120);
    for (const o of game.board.orders) o.patience = 9 + Math.random() * 6;
    addDirect('bun');
    addGrilled('patty');
    teleportInteract('crate-lettuce');
    teleportInteract('board');
    chef.x = 640; chef.y = 480; chef.tx = 640; chef.ty = 480;
  } else if (scene === 'plating') {
    // Dish mid-assembly, close on the plating station: bun, grilled
    // patty and chopped lettuce are on the plate, chef carries the
    // cheese — about to add the last ingredient.
    spawnOrder(game.board, 5);
    spawnOrder(game.board, 5);
    addDirect('bun');
    addGrilled('patty');
    addChopped('lettuce');
    teleportInteract('crate-cheese'); // chef now carries the cheese
    chef.x = 1010; chef.y = 560; chef.tx = chef.x; chef.ty = chef.y;
  } else if (scene === 'serve') {
    // Finished plate in hand at the pass; serve fires shortly after load.
    spawnOrder(game.board, 5);
    spawnOrder(game.board, 5);
    // Force the oldest ticket to be a burger so the serve lands.
    game.board.orders[0].recipeId = 'burger';
    game.board.orders[0].name = 'Classic Burger';
    game.board.orders[0].color = '#e8b96a';
    addDirect('bun');
    addGrilled('patty');
    addChopped('lettuce');
    addDirect('cheese');
    teleportInteract('plating'); // pick up the finished burger
    const pass = stationById(game.kitchen, 'pass');
    chef.x = pass.ax; chef.y = pass.ay; chef.tx = pass.ax; chef.ty = pass.ay;
    game.sceneServeAt = 1.0;
  }
}

// --- Self-test (?selftest=1) -----------------------------------------------------
// Scripted assertions on a fresh game instance, using the same functions
// the player uses. Results are written into #selftest-result.

function runSelfTest() {
  const lines = [];
  let pass = 0, total = 0;
  const errors = [];
  const onError = (e) => errors.push(String(e.message || e));
  window.addEventListener('error', onError);
  const check = (name, cond) => {
    total += 1;
    if (cond) { pass += 1; lines.push('PASS: ' + name); }
    else lines.push('FAIL: ' + name);
  };
  try {
    const g = createGame();
    g.phase = 'playing';
    const go = (stationId) => {
      const s = stationById(g.kitchen, stationId);
      g.chef.x = s.ax; g.chef.y = s.ay;
      return interact(s, g);
    };
    const cookDone = (stationId, slotIndex = 0) => {
      for (let i = 0; i < 40; i++) {
        const slot = demoSlotState(g, stationId, slotIndex);
        if (slot && slot.state === 'done') return true;
        if (slot && slot.state === 'burned') return false;
        updateKitchen(g.kitchen, 0.5);
      }
      return false;
    };

    // 1. Orders spawn.
    const o1 = spawnOrder(g.board, 0);
    check('order spawns', !!o1 && g.board.orders.length === 1 && !!recipeById(o1.recipeId));

    // 2. Chopping completes.
    go('crate-lettuce');
    check('pick up lettuce', g.chef.carrying && g.chef.carrying.kind === 'lettuce');
    go('board');
    check('lettuce chopping starts', !!stationById(g.kitchen, 'board').slot);
    check('chop finishes', cookDone('board'));
    go('board');
    check('pick up chopped lettuce', g.chef.carrying && g.chef.carrying.prep === 'chopped');

    // 3. Grilling completes.
    g.chef.carrying = null;
    go('crate-patty');
    go('grill');
    check('patty grilling starts', !!stationById(g.kitchen, 'grill').slots[0]);
    check('grill finishes', cookDone('grill'));
    go('grill');
    check('pick up grilled patty', g.chef.carrying && g.chef.carrying.prep === 'grilled');

    // 4. Boiling completes.
    g.chef.carrying = null;
    go('crate-pasta');
    go('pot');
    check('pasta boiling starts', !!stationById(g.kitchen, 'pot').slot);
    check('boil finishes', cookDone('pot'));
    go('pot');
    check('pick up boiled pasta', g.chef.carrying && g.chef.carrying.prep === 'boiled');

    // 5. Plate assembles into a burger.
    g.chef.carrying = null;
    const plate = () => stationById(g.kitchen, 'plating').plate;
    go('crate-bun'); go('plating');
    go('crate-patty'); go('grill'); cookDone('grill'); go('grill'); go('plating');
    go('crate-lettuce'); go('board'); cookDone('board'); go('board'); go('plating');
    go('crate-cheese'); go('plating');
    const recipe = plateMatchesRecipe(plate());
    check('plate assembles Classic Burger', !!recipe && recipe.id === 'burger');

    // 6. Serving scores.
    g.board.orders = [];
    for (let i = 0; i < 12 && !g.board.orders.some((o) => o.recipeId === 'burger'); i++) spawnOrder(g.board, 0);
    // Deterministic: force the oldest ticket to be the burger we built,
    // so this test never depends on the spawn dice.
    if (g.board.orders.length > 0) {
      g.board.orders[0].recipeId = 'burger';
      g.board.orders[0].name = 'Classic Burger';
      g.board.orders[0].color = '#e8b96a';
    }
    check('a burger order is open', g.board.orders.some((o) => o.recipeId === 'burger'));
    const before = g.score;
    go('plating'); // pick up the finished plate
    check('pick up finished plate', isPlate(g.chef.carrying));
    const res = go('pass');
    check('serve succeeds', res.ok && g.score > before && g.board.served === 1);
    check('combo starts at 1', g.combo === 1);

    // 7. Burning fails (patty left too long).
    go('crate-patty'); go('grill');
    for (let i = 0; i < 40; i++) updateKitchen(g.kitchen, 0.5);
    const slot = stationById(g.kitchen, 'grill').slots[0];
    check('patty burns when neglected', !!slot && slot.state === 'burned');
    go('grill');
    check('burned patty is picked up', g.chef.carrying && g.chef.carrying.prep === 'burned');
    go('trash');
    check('burned patty trashed', g.chef.carrying === null);

    // 8. Orders expire.
    const lostBefore = g.board.lost;
    const exp = spawnOrder(g.board, 0);
    exp.patience = 0.1;
    updateOrders(g.board, 0.2, 0);
    check('order expires when patience runs out', g.board.lost === lostBefore + 1);

    // 9. Wrong dish cannot be served.
    g.board.orders = [];
    g.chef.carrying = null;
    go('crate-pasta'); go('pot'); cookDone('pot'); go('pot'); go('plating');
    go('crate-sauce'); go('plating');
    go('crate-cheese'); go('plating');
    go('plating');
    const scoreBefore = g.score;
    const bad = go('pass');
    check('serving with no matching order fails', !bad.ok && g.score === scoreBefore);

    // 10. No console errors during the whole test.
    check('no console errors', errors.length === 0);
  } catch (err) {
    lines.push('FAIL: exception — ' + (err && err.message));
    errors.push(String(err && err.message));
  }
  window.removeEventListener('error', onError);
  lines.push('SELFTEST: ' + pass + '/' + total + ' PASS');
  const el = document.getElementById('selftest-result');
  if (el) el.textContent = lines.join('\n');
  document.title = 'SELFTEST ' + pass + '/' + total;
  return { pass, total, lines };
}

// --- Boot -------------------------------------------------------------------------

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  const game = createGame();
  const input = createInput(canvas);
  window.__game = game; // harmless handle for debugging / screenshots

  // Capture page errors into the DOM so headless runs can prove zero errors.
  const errorBox = document.getElementById('errors');
  window.addEventListener('error', (e) => {
    if (errorBox) errorBox.textContent += 'ERROR: ' + (e.message || e.error) + '\n';
  });

  // First gesture unlocks audio.
  const unlock = () => audio.initAudio();
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  // Self-test mode: run assertions immediately, no rAF needed.
  if (params.has('selftest')) {
    runSelfTest();
  }

  // Demo / scene modes: skip the title screen, start the shift.
  const demoMode = params.has('demo');
  const scene = params.get('scene');
  if (demoMode || scene) {
    startShift(game);
    if (demoMode) game.demo = { plan: [], stepTimer: 0 };
    if (scene) sceneSetup(game, scene);
  }

  let last = performance.now();
  let debugTimer = 0;

  function frame(now) {
    // Guard against a negative or huge step (mixed real/virtual clocks).
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    game.animTime += dt;

    // --- Input: phase transitions -------------------------------------------
    if (game.phase === 'title') {
      if (wasPressed(input, 'Enter') || input.clicks.length > 0) startShift(game);
    } else if (game.phase === 'over') {
      if (wasPressed(input, 'r') || wasPressed(input, 'Enter') || input.clicks.length > 0) startShift(game);
    } else if (game.phase === 'playing') {
      if (wasPressed(input, 'p')) game.phase = 'paused';
    } else if (game.phase === 'paused') {
      if (wasPressed(input, 'p')) game.phase = 'playing';
      // Tap the ▶ button to resume.
      for (const click of input.clicks) {
        if (hitPauseButton(click)) game.phase = 'playing';
      }
    }
    if (wasPressed(input, 'r') && game.phase !== 'title') startShift(game);

    // --- Input: playing -------------------------------------------------------
    if (game.phase === 'playing') {
      // Clicks: walk to a station and use it, or just walk to a spot.
      for (const click of input.clicks) {
        audio.initAudio();
        // The pause button eats its own click — never also walks the chef.
        if (hitPauseButton(click)) { game.phase = 'paused'; continue; }
        const s = stationAtPoint(game.kitchen, click.x, click.y);
        game.chef.detour = null;
        game.chef.stuckTime = 0;
        if (s) {
          game.chef.tx = s.ax;
          game.chef.ty = s.ay;
          game.autoTarget = s.id;
        } else {
          game.chef.tx = click.x;
          game.chef.ty = click.y;
          game.autoTarget = null;
        }
      }
      // Quick-select: keys 1-8 walk to an ingredient crate.
      for (let i = 0; i < CRATE_ORDER.length; i++) {
        if (wasPressed(input, String(i + 1))) {
          const s = stationById(game.kitchen, 'crate-' + CRATE_ORDER[i]);
          game.chef.tx = s.ax;
          game.chef.ty = s.ay;
          game.autoTarget = s.id;
        }
      }
      // Interact with the nearest station.
      if (wasPressed(input, 'e') || wasPressed(input, ' ') || wasPressed(input, 'Spacebar')) {
        const s = nearestStation(game.kitchen, game.chef.x, game.chef.y);
        if (s) {
          const res = interact(s, game);
          showHint(game, res.message, res.ok ? 1.6 : 2.2);
          if (!res.ok) audio.playError();
        } else {
          showHint(game, 'Walk up to a station first!', 1.6);
        }
      }

      // --- Simulation ---------------------------------------------------------
      game.elapsed += dt;
      game.timeLeft -= dt;
      if (game.hintTimer > 0) game.hintTimer -= dt;
      if (game.combo > 0 && game.elapsed - game.lastServeAt > COMBO_WINDOW) game.combo = 0;

      const expired = updateOrders(game.board, dt, game.elapsed);
      if (expired.length > 0) {
        game.combo = 0;
        audio.playError();
        showHint(game, 'Order lost! Combo reset.', 2.5);
        addPopup(game, 'ORDER LOST', 640, 200, '#e53935', 24);
      }
      const events = updateKitchen(game.kitchen, dt);
      for (const e of events) handleGameEvent(game, e);

      // Chopping sound + sparks while the board works.
      const board = stationById(game.kitchen, 'board');
      if (board.slot && board.slot.state === 'working') {
        game.chopSoundTimer -= dt;
        if (game.chopSoundTimer <= 0) {
          game.chopSoundTimer = 0.55;
          audio.playChop();
          addSparks(game, board.x + 82, board.y + 58, '#ffd54a');
        }
      }
      // Sizzle while anything cooks.
      const cooking = game.kitchen.stations.some((s) =>
        (s.kind === 'grill' && s.slots.some((sl) => sl && sl.state === 'working')) ||
        ((s.kind === 'board' || s.kind === 'pot') && s.slot && s.slot.state === 'working'));
      audio.setSizzle(cooking);
      // Steam from anything hot.
      for (const s of game.kitchen.stations) {
        if (s.kind === 'grill' && s.slots.some((sl) => sl)) addSteam(game, s.x + s.w / 2, s.y + 20, 1);
        if (s.kind === 'pot' && s.slot) addSteam(game, s.x + s.w / 2, s.y + 20, 1);
      }

      moveChef(game, dt, input);
      if (game.demo) demoStep(game, dt);

      // Scene hook: auto-serve a finished plate shortly after load.
      if (game.sceneServeAt > 0 && game.elapsed >= game.sceneServeAt) {
        game.sceneServeAt = -1;
        const pass = stationById(game.kitchen, 'pass');
        const res = interact(pass, game);
        showHint(game, res.message, 2);
      }

      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        endShift(game);
      }
    }

    // Hover highlight follows the mouse.
    game.hoverStation = stationAtPoint(game.kitchen, input.mouseX, input.mouseY);

    updateParticles(game, dt);
    drawGame(ctx, game);

    // Debug readout for demo mode (verifiable via --dump-dom).
    debugTimer += dt;
    if (demoMode && debugTimer > 0.5) {
      debugTimer = 0;
      const dbg = document.getElementById('debug');
      if (dbg) {
        dbg.textContent = 'score=' + game.score + ' served=' + game.board.served +
          ' orders=' + game.board.orders.filter((o) => o.state === 'active').length +
          ' phase=' + game.phase + ' carrying=' + (game.chef.carrying ? game.chef.carrying.kind : 'none');
      }
    }

    endFrame(input);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', boot);
