// kitchen.js — the bistro kitchen: station layout, cooking timers
// (chop / grill / boil, with burning), plating, and every interaction
// the chef can do at a station. Pure state + rules; rendering lives in render.js.

import {
  INGREDIENTS, CRATE_ORDER, PREP_STATION, PREP_TIME, BURN_AFTER,
  plateMatchesRecipe, plateCanStillComplete,
} from './recipes.js';
import { serveOrder } from './orders.js';

// --- Station layout (canvas is 1280 x 800) -------------------------------
export const FLOOR = { x: 14, y: 150, w: 1252, h: 636 };

export function createKitchen() {
  const stations = [];
  // Ingredient crates along the top wall.
  CRATE_ORDER.forEach((kind, i) => {
    stations.push({
      id: 'crate-' + kind, kind: 'counter', name: INGREDIENTS[kind].name,
      ingredient: kind, x: 20 + i * 150, y: 158, w: 140, h: 60,
      ax: 20 + i * 150 + 70, ay: 158 + 60 + 30,
    });
  });
  // Chopping board, left wall.
  stations.push({
    id: 'board', kind: 'board', name: 'Chopping Board',
    x: 24, y: 300, w: 200, h: 110, ax: 124, ay: 300 + 110 + 30, slot: null,
  });
  // Grill (stove), two burners, bottom-left.
  stations.push({
    id: 'grill', kind: 'grill', name: 'Grill',
    x: 24, y: 620, w: 260, h: 130, ax: 154, ay: 620 - 30,
    slots: [null, null],
  });
  // Pasta pot (boiler), bottom-centre-left.
  stations.push({
    id: 'pot', kind: 'pot', name: 'Pasta Pot',
    x: 320, y: 620, w: 170, h: 130, ax: 405, ay: 620 - 30, slot: null,
  });
  // Plating station, right wall.
  stations.push({
    id: 'plating', kind: 'plating', name: 'Plating',
    x: 1020, y: 300, w: 236, h: 150, ax: 1138, ay: 300 + 150 + 30, plate: [],
  });
  // Serving pass (window), bottom-right.
  stations.push({
    id: 'pass', kind: 'pass', name: 'Serving Pass',
    x: 900, y: 620, w: 356, h: 130, ax: 1078, ay: 620 - 30,
  });
  // Trash can, bottom wall between the pot and the pass.
  stations.push({
    id: 'trash', kind: 'trash', name: 'Trash',
    x: 560, y: 620, w: 110, h: 90, ax: 615, ay: 620 - 30,
  });
  return { stations };
}

export function stationById(kitchen, id) {
  return kitchen.stations.find((s) => s.id === id) || null;
}

export function stationAtPoint(kitchen, x, y) {
  for (let i = kitchen.stations.length - 1; i >= 0; i--) {
    const s = kitchen.stations[i];
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
  }
  return null;
}

export function nearestStation(kitchen, x, y, maxDist = 78) {
  let best = null, bestD = maxDist;
  for (const s of kitchen.stations) {
    const dx = x - s.ax, dy = y - s.ay;
    const d = Math.hypot(dx, dy);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

// --- Cooking slots --------------------------------------------------------
// A slot holds { item, kind, prep, progress, total, state, burnTimer }.
// state: 'working' -> 'done' -> 'burned'.

function startCooking(slotItem, prepKind) {
  return {
    item: slotItem, prep: prepKind,
    progress: 0, total: PREP_TIME[prepKind],
    state: 'working', burnTimer: 0,
  };
}

function finishedPrep(prepKind) {
  return prepKind === 'chop' ? 'chopped' : prepKind === 'grill' ? 'grilled' : 'boiled';
}

// Tick every cooking slot. Returns events for sound/particles:
// { type: 'done'|'burned', stationId, slotIndex, kind }.
export function updateKitchen(kitchen, dt) {
  const events = [];
  const tickSlot = (slot, stationId, slotIndex) => {
    if (!slot) return;
    if (slot.state === 'working') {
      slot.progress += dt;
      if (slot.progress >= slot.total) {
        slot.progress = slot.total;
        slot.state = 'done';
        slot.burnTimer = 0;
        events.push({ type: 'done', stationId, slotIndex, kind: slot.item.kind });
      }
    } else if (slot.state === 'done') {
      const burnAfter = BURN_AFTER[slot.prep];
      if (burnAfter) {
        slot.burnTimer += dt;
        if (slot.burnTimer >= burnAfter) {
          slot.state = 'burned';
          events.push({ type: 'burned', stationId, slotIndex, kind: slot.item.kind });
        }
      }
    }
  };
  for (const s of kitchen.stations) {
    if (s.kind === 'board' || s.kind === 'pot') tickSlot(s.slot, s.id, 0);
    if (s.kind === 'grill') s.slots.forEach((slot, i) => tickSlot(slot, s.id, i));
  }
  return events;
}

// --- Carrying --------------------------------------------------------------
export function isPlate(carried) {
  return carried && carried.type === 'plate';
}
export function isItem(carried) {
  return carried && carried.type === 'item';
}

// --- Interaction -----------------------------------------------------------
// interact(station, game) performs the chef's action at a station.
// game carries: chef { carrying }, board (orders), kitchen, and callbacks
// the caller wires: game.onEvent({type, ...}) for sounds/particles/popups.
// Returns { ok, message } — message is shown as a hint when not ok.
export function interact(station, game) {
  const chef = game.chef;
  const carrying = chef.carrying;

  switch (station.kind) {
    case 'counter': {
      if (carrying) return { ok: false, message: 'Hands full!' };
      chef.carrying = { type: 'item', kind: station.ingredient, prep: 'raw' };
      game.onEvent({ type: 'pickup', kind: station.ingredient });
      return { ok: true, message: 'Picked up ' + INGREDIENTS[station.ingredient].name };
    }

    case 'board':
    case 'pot': {
      const prepKind = station.kind === 'board' ? 'chop' : 'boil';
      // Pick up a finished item.
      if (station.slot && station.slot.state === 'done' && !carrying) {
        chef.carrying = { type: 'item', kind: station.slot.item.kind, prep: finishedPrep(prepKind) };
        station.slot = null;
        game.onEvent({ type: 'pickup', kind: chef.carrying.kind });
        return { ok: true, message: 'Picked up' };
      }
      // Pick up a burned item (must be trashed).
      if (station.slot && station.slot.state === 'burned' && !carrying) {
        chef.carrying = { type: 'item', kind: station.slot.item.kind, prep: 'burned' };
        station.slot = null;
        game.onEvent({ type: 'pickup', kind: chef.carrying.kind });
        return { ok: true, message: 'Burned! Trash it.' };
      }
      // Place a raw ingredient that this station prepares.
      if (isItem(carrying) && carrying.prep === 'raw' && INGREDIENTS[carrying.kind].prep === prepKind) {
        if (station.slot) return { ok: false, message: station.name + ' is busy!' };
        station.slot = startCooking(carrying, prepKind);
        chef.carrying = null;
        game.onEvent({ type: 'place', stationId: station.id, kind: station.slot.item.kind });
        return { ok: true, message: INGREDIENTS[station.slot.item.kind].name + ' on the ' + station.name };
      }
      if (station.slot && station.slot.state === 'working') {
        return { ok: false, message: 'Still ' + (prepKind === 'chop' ? 'chopping' : 'boiling') + '…' };
      }
      return { ok: false, message: 'Nothing to do here' };
    }

    case 'grill': {
      // Pick up a finished or burned patty from any slot.
      if (!carrying) {
        for (let i = 0; i < station.slots.length; i++) {
          const slot = station.slots[i];
          if (slot && (slot.state === 'done' || slot.state === 'burned')) {
            chef.carrying = {
              type: 'item', kind: slot.item.kind,
              prep: slot.state === 'done' ? 'grilled' : 'burned',
            };
            station.slots[i] = null;
            game.onEvent({ type: 'pickup', kind: chef.carrying.kind });
            return { ok: true, message: slot.state === 'done' ? 'Picked up' : 'Burned! Trash it.' };
          }
        }
      }
      // Place a raw patty on a free burner.
      if (isItem(carrying) && carrying.prep === 'raw' && INGREDIENTS[carrying.kind].prep === 'grill') {
        const free = station.slots.findIndex((s) => s === null);
        if (free === -1) return { ok: false, message: 'Grill is full!' };
        station.slots[free] = startCooking(carrying, 'grill');
        chef.carrying = null;
        game.onEvent({ type: 'place', stationId: station.id, kind: 'patty' });
        return { ok: true, message: 'Patty on the grill' };
      }
      if (station.slots.some((s) => s && s.state === 'working')) {
        return { ok: false, message: 'Still grilling…' };
      }
      return { ok: false, message: 'Nothing to do here' };
    }

    case 'plating': {
      // Add a finished ingredient to the plate.
      if (isItem(carrying)) {
        if (carrying.prep === 'burned') return { ok: false, message: 'Burned food goes in the trash!' };
        const item = { kind: carrying.kind, prep: carrying.prep };
        if (station.plate.some((p) => p.kind === item.kind && p.prep === item.prep)) {
          return { ok: false, message: 'Already on the plate!' };
        }
        station.plate.push(item);
        chef.carrying = null;
        game.onEvent({ type: 'plate', kind: item.kind });
        if (!plateCanStillComplete(station.plate)) {
          return { ok: true, message: 'That combo matches no recipe — trash it!' };
        }
        const done = plateMatchesRecipe(station.plate);
        return { ok: true, message: done ? done.name + ' is ready — serve it!' : 'Added to plate' };
      }
      // Pick up the plate (empty hands).
      if (!carrying) {
        if (station.plate.length === 0) return { ok: false, message: 'Plate is empty — add ingredients!' };
        chef.carrying = { type: 'plate', items: station.plate.slice() };
        station.plate = [];
        game.onEvent({ type: 'pickup', kind: 'plate' });
        const recipe = plateMatchesRecipe(chef.carrying.items);
        return { ok: true, message: recipe ? recipe.name + ' — to the pass!' : 'Plate picked up (no recipe match)' };
      }
      return { ok: false, message: 'Nothing to do here' };
    }

    case 'pass': {
      if (!isPlate(carrying)) {
        return { ok: false, message: 'Bring a finished plate here!' };
      }
      const recipe = plateMatchesRecipe(carrying.items);
      if (!recipe) {
        game.onEvent({ type: 'serveFail' });
        return { ok: false, message: 'No order wants this dish!' };
      }
      const result = serveOrder(game.board, recipe.id, game.combo);
      if (!result) {
        game.onEvent({ type: 'serveFail' });
        return { ok: false, message: 'No open order for ' + recipe.name + '!' };
      }
      chef.carrying = null;
      game.onEvent({
        type: 'served', points: result.points, recipe: recipe.name,
        order: result.order, patienceBonus: result.patienceBonus,
      });
      return { ok: true, message: recipe.name + ' served! +' + result.points };
    }

    case 'trash': {
      if (!carrying) return { ok: false, message: 'Nothing to throw away' };
      chef.carrying = null;
      game.onEvent({ type: 'trash' });
      return { ok: true, message: 'Tossed!' };
    }

    default:
      return { ok: false, message: '' };
  }
}

// Where does an ingredient still need to go? Used by the demo chef.
export function prepStationFor(kind) {
  const prep = INGREDIENTS[kind].prep;
  return prep ? PREP_STATION[prep] : null;
}
