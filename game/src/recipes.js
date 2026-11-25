// recipes.js — ingredient and recipe data for Sizzle & Serve.
// Every recipe is a list of finished items: { kind, prep }.
// prep: 'raw' (used as-is, e.g. bun), 'chopped', 'grilled', 'boiled'.

export const INGREDIENTS = {
  bun:      { id: 'bun',      name: 'Bun',      color: '#e8b96a', dark: '#b97f2e', prep: null,     prepName: '' },
  patty:    { id: 'patty',    name: 'Patty',    color: '#c46a4a', dark: '#7e3423', prep: 'grill',  prepName: 'Grill' },
  lettuce:  { id: 'lettuce',  name: 'Lettuce',  color: '#7ec850', dark: '#3f7a26', prep: 'chop',   prepName: 'Chop' },
  tomato:   { id: 'tomato',   name: 'Tomato',   color: '#e84a3a', dark: '#a11f14', prep: 'chop',   prepName: 'Chop' },
  cheese:   { id: 'cheese',   name: 'Cheese',   color: '#f7c948', dark: '#c8931a', prep: null,     prepName: '' },
  cucumber: { id: 'cucumber', name: 'Cucumber', color: '#5fb878', dark: '#2e7a48', prep: 'chop',   prepName: 'Chop' },
  pasta:    { id: 'pasta',    name: 'Pasta',    color: '#f2d06b', dark: '#b98f2a', prep: 'boil',   prepName: 'Boil' },
  sauce:    { id: 'sauce',    name: 'Sauce',    color: '#c0392b', dark: '#7c1d13', prep: null,     prepName: '' },
};

// The order ingredients are shown in the crates, left to right.
export const CRATE_ORDER = ['bun', 'patty', 'lettuce', 'tomato', 'cheese', 'cucumber', 'pasta', 'sauce'];

// Which station prepares an ingredient, and how long it takes (seconds).
export const PREP_STATION = { chop: 'board', grill: 'grill', boil: 'pot' };
export const PREP_TIME = { chop: 2.2, grill: 4.5, boil: 5.0 };
// Seconds after "done" before the item burns (grill / pot only).
export const BURN_AFTER = { grill: 4.0, boil: 5.0 };

export const RECIPES = [
  {
    id: 'salad',
    name: 'Garden Salad',
    base: 40,
    color: '#7ec850',
    needs: [
      { kind: 'lettuce', prep: 'chopped' },
      { kind: 'tomato', prep: 'chopped' },
      { kind: 'cucumber', prep: 'chopped' },
    ],
  },
  {
    id: 'burger',
    name: 'Classic Burger',
    base: 60,
    color: '#e8b96a',
    needs: [
      { kind: 'bun', prep: 'raw' },
      { kind: 'patty', prep: 'grilled' },
      { kind: 'lettuce', prep: 'chopped' },
      { kind: 'cheese', prep: 'raw' },
    ],
  },
  {
    id: 'pasta',
    name: 'Pasta Alfredo',
    base: 50,
    color: '#f2d06b',
    needs: [
      { kind: 'pasta', prep: 'boiled' },
      { kind: 'sauce', prep: 'raw' },
      { kind: 'cheese', prep: 'raw' },
    ],
  },
  {
    id: 'deluxe',
    name: 'Deluxe Burger',
    base: 80,
    color: '#d98a3d',
    needs: [
      { kind: 'bun', prep: 'raw' },
      { kind: 'patty', prep: 'grilled' },
      { kind: 'lettuce', prep: 'chopped' },
      { kind: 'tomato', prep: 'chopped' },
      { kind: 'cheese', prep: 'raw' },
    ],
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

// A finished item is { kind, prep } where prep is 'raw' | 'chopped' | 'grilled' | 'boiled'.
// Returns the recipe the plate completes, or null when it matches nothing (yet).
export function plateMatchesRecipe(plate) {
  if (!plate || plate.length === 0) return null;
  const key = (items) => items.map((i) => i.kind + ':' + i.prep).sort().join('|');
  const plateKey = key(plate);
  for (const r of RECIPES) {
    if (key(r.needs) === plateKey) return r;
  }
  return null;
}

// True when every item on the plate belongs to some recipe's needs
// (a plate that can never complete is a dead plate — trash it).
export function plateCanStillComplete(plate) {
  if (!plate || plate.length === 0) return true;
  return RECIPES.some((r) => {
    const needs = r.needs.map((n) => n.kind + ':' + n.prep);
    return plate.every((i) => needs.includes(i.kind + ':' + i.prep)) &&
      new Set(plate.map((i) => i.kind + ':' + i.prep)).size === plate.length;
  });
}

export function finishedName(item) {
  if (!item) return '';
  const ing = INGREDIENTS[item.kind];
  if (!ing) return item.kind;
  if (item.prep === 'chopped') return 'Chopped ' + ing.name;
  if (item.prep === 'grilled') return 'Grilled ' + ing.name;
  if (item.prep === 'boiled') return 'Boiled ' + ing.name;
  return ing.name;
}
