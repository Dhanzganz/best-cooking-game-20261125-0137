# 🍳 Sizzle & Serve

[![Sizzle & Serve](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/Dhanzganz/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/Dhanzganz/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

A tiny bistro. A three-minute lunch rush. You are the chef.

**Sizzle & Serve** is a timed order-fulfilment cooking game, built for the
make.fun best-cooking-game bounty. Order tickets land on the board with a
patience timer each. Run the kitchen: grab ingredients from the crates, chop
on the board, grill patties, boil pasta, assemble dishes on the plating
counter, and serve them at the pass before patience runs out. Leave food on
the heat too long and it burns.

## How to play

- Orders appear on the board at the top. Each ticket shows the dish, the
  ingredients it needs, and a patience bar (green → red).
- **Classic Burger** — bun + grilled patty + chopped lettuce + cheese.
- **Garden Salad** — chopped lettuce + chopped tomato + chopped cucumber.
- **Pasta Alfredo** — boiled pasta + sauce + cheese.
- **Deluxe Burger** — everything on the Classic, plus chopped tomato.
  (Joins the menu after the first minute.)
- Pick up one thing at a time. Chop, grill and boil take a few seconds —
  food left on the heat after it is done **burns**, so fetch it in time.
- Assemble a dish on the **Plating** counter, pick up the finished plate,
  and serve it at the **Serving Pass**. Serving the oldest matching order
  scores base points + a patience bonus, multiplied by your combo.
- Serve dishes quickly in a row to build a **combo** (up to x2.2). A lost
  order resets the combo.
- The shift lasts **3 minutes**. When the timer hits zero, your final
  score, dishes served and best combo are shown — press **R** to cook again.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move the chef |
| Mouse click | Click a station to walk there and use it; click anywhere to walk |
| E / Space | Interact with the nearest station |
| 1–8 | Walk to an ingredient crate (bun, patty, lettuce, tomato, cheese, cucumber, pasta, sauce) |
| P | Pause |
| R | Restart the shift |

## Running it

No build step, no network, no libraries — pure Canvas 2D and vanilla JS.

```sh
python3 -m http.server -d game 8080
# open http://localhost:8080
```

Test hooks (harmless in the shipped game):

- `?demo=1` — an autopilot chef plays the game with the same actions
  the input handlers call.
- `?selftest=1` — runs scripted assertions (order spawn, chop, grill,
  boil, plate assembly, serve scoring, burning, expiry) and writes
  PASS/FAIL lines into `#selftest-result`.

## Structure

- `game/index.html` — page shell
- `game/style.css` — page chrome
- `game/src/main.js` — boot, game loop, chef movement, demo autopilot, self-test
- `game/src/recipes.js` — ingredient and recipe data
- `game/src/orders.js` — order board, patience, scoring
- `game/src/kitchen.js` — stations, cooking timers, interactions
- `game/src/render.js` — all canvas drawing (art is drawn in code)
- `game/src/audio.js` — WebAudio-synthesized sounds (no audio files)
- `game/src/input.js` — keyboard + mouse

All art is drawn in code and all sounds are synthesized — no external
assets, no copied game names or art. Original game, MIT licensed.
