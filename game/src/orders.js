// orders.js — the order board: spawning tickets, patience timers,
// matching a finished plate to an open order, and scoring a serve.

import { RECIPES, recipeById } from './recipes.js';

export const SHIFT_SECONDS = 180;

let nextOrderId = 1;

// Difficulty grows with elapsed shift time (0..1).
export function difficultyAt(elapsed) {
  const t = Math.min(1, Math.max(0, elapsed / SHIFT_SECONDS));
  return {
    t,
    maxOrders: t < 0.33 ? 3 : t < 0.66 ? 4 : 5,
    spawnInterval: 15 - 7 * t, // 15s early -> 8s late
    patience: 58 - 20 * t, // 58s early -> 38s late
    // Deluxe Burger only joins the menu after the first minute.
    menu: t < 0.33 ? RECIPES.filter((r) => r.id !== 'deluxe') : RECIPES,
  };
}

export function createOrderBoard() {
  return { orders: [], spawnTimer: 1.5, served: 0, lost: 0 };
}

export function spawnOrder(board, elapsed) {
  const diff = difficultyAt(elapsed);
  if (board.orders.filter((o) => o.state === 'active').length >= diff.maxOrders) return null;
  const menu = diff.menu;
  const recipe = menu[Math.floor(Math.random() * menu.length)];
  const order = {
    id: nextOrderId++,
    recipeId: recipe.id,
    name: recipe.name,
    color: recipe.color,
    patience: diff.patience,
    patienceMax: diff.patience,
    state: 'active',
    bornAt: elapsed,
    flash: 0,
  };
  board.orders.push(order);
  return order;
}

// Tick patience. Returns the orders that just expired.
export function updateOrders(board, dt, elapsed) {
  const expired = [];
  for (const o of board.orders) {
    if (o.state !== 'active') continue;
    o.patience -= dt;
    if (o.flash > 0) o.flash -= dt;
    if (o.patience <= 0) {
      o.patience = 0;
      o.state = 'expired';
      board.lost += 1;
      expired.push(o);
    }
  }
  // Drop finished tickets after a short fade so the board stays readable.
  board.orders = board.orders.filter((o) => !(o.state !== 'active' && (o.goneTimer ?? 0) > 1.2));
  for (const o of board.orders) {
    if (o.state !== 'active') o.goneTimer = (o.goneTimer ?? 0) + dt;
  }
  // Spawn the next ticket on schedule.
  board.spawnTimer -= dt;
  if (board.spawnTimer <= 0) {
    if (spawnOrder(board, elapsed)) board.spawnTimer = difficultyAt(elapsed).spawnInterval;
    else board.spawnTimer = 2; // board full: retry soon
  }
  return expired;
}

export function activeOrders(board) {
  return board.orders.filter((o) => o.state === 'active');
}

// Oldest active order — the one the demo chef and the player should clear first.
export function oldestOrder(board) {
  const act = activeOrders(board);
  return act.length ? act[0] : null;
}

// Serve a finished plate. Finds the oldest active order for that recipe.
// Returns { order, points } on success, or null when no order wants it.
export function serveOrder(board, recipeId, combo) {
  const order = board.orders.find((o) => o.state === 'active' && o.recipeId === recipeId);
  if (!order) return null;
  order.state = 'served';
  order.goneTimer = 0;
  board.served += 1;
  const recipe = recipeById(recipeId);
  const patienceBonus = Math.round(30 * (order.patience / order.patienceMax));
  const multiplier = 1 + 0.15 * Math.min(combo, 8);
  const points = Math.round((recipe.base + patienceBonus) * multiplier);
  return { order, points, patienceBonus, multiplier };
}

// Points preview shown on a ticket (base + full patience bonus).
export function ticketPoints(order) {
  const recipe = recipeById(order.recipeId);
  return recipe ? recipe.base + 30 : 0;
}
