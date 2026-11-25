// render.js — every pixel of Sizzle & Serve is drawn here with Canvas 2D.
// Warm bistro palette, readable counters, all art drawn in code.

import { INGREDIENTS, RECIPES, finishedName, plateMatchesRecipe } from './recipes.js';
import { ticketPoints } from './orders.js';

const W = 1280, H = 800;

// --- Small helpers ---------------------------------------------------------

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', bold = true) {
  ctx.fillStyle = color;
  ctx.font = (bold ? 'bold ' : '') + size + 'px Verdana, sans-serif';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// --- Ingredient icons ------------------------------------------------------

export function drawIngredientIcon(ctx, kind, prep, x, y, s) {
  const ing = INGREDIENTS[kind];
  if (!ing) return;
  const u = s / 40; // unit scale
  ctx.save();
  ctx.translate(x, y);
  if (prep === 'burned') {
    ctx.fillStyle = '#241f1c';
    ctx.beginPath();
    ctx.arc(0, 0, 15 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.font = 'bold ' + 16 * u + 'px Verdana';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 0, 1);
    ctx.restore();
    return;
  }
  switch (kind) {
    case 'bun':
      ctx.fillStyle = '#e8b96a';
      ctx.beginPath();
      ctx.arc(0, 2 * u, 15 * u, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-15 * u, 2 * u, 30 * u, 6 * u);
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(-5 * u, -6 * u, 2 * u, 0, Math.PI * 2);
      ctx.arc(4 * u, -8 * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'patty': {
      ctx.fillStyle = prep === 'grilled' ? '#8a4a2a' : '#c46a4a';
      ctx.beginPath();
      ctx.arc(0, 0, 15 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = prep === 'grilled' ? '#5f3018' : '#9a4a30';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 7 * u, Math.sin(a) * 7 * u, 2.2 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      if (prep === 'grilled') {
        ctx.strokeStyle = '#d98a3d';
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.moveTo(-8 * u, -8 * u); ctx.lineTo(8 * u, 8 * u);
        ctx.moveTo(8 * u, -8 * u); ctx.lineTo(-8 * u, 8 * u);
        ctx.stroke();
      }
      break;
    }
    case 'lettuce':
      ctx.fillStyle = prep === 'chopped' ? '#5da83c' : '#7ec850';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * u, 11 * u, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f7a26';
      ctx.lineWidth = 1.5 * u;
      ctx.beginPath();
      ctx.moveTo(-12 * u, 4 * u);
      ctx.quadraticCurveTo(0, -6 * u, 12 * u, -6 * u);
      ctx.stroke();
      if (prep === 'chopped') {
        ctx.strokeStyle = '#3f7a26';
        ctx.beginPath();
        ctx.moveTo(-4 * u, -8 * u); ctx.lineTo(4 * u, 8 * u);
        ctx.moveTo(6 * u, -6 * u); ctx.lineTo(-2 * u, 9 * u);
        ctx.stroke();
      }
      break;
    case 'tomato':
      ctx.fillStyle = '#e84a3a';
      ctx.beginPath();
      ctx.arc(0, 0, 14 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7ec850';
      ctx.beginPath();
      ctx.moveTo(0, -12 * u);
      ctx.lineTo(-5 * u, -18 * u);
      ctx.lineTo(5 * u, -18 * u);
      ctx.closePath();
      ctx.fill();
      if (prep === 'chopped') {
        ctx.fillStyle = '#f2b8ae';
        ctx.beginPath();
        ctx.arc(-4 * u, -2 * u, 4 * u, 0, Math.PI * 2);
        ctx.arc(5 * u, 4 * u, 4 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'cheese':
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-14 * u, 10 * u);
      ctx.lineTo(14 * u, 10 * u);
      ctx.lineTo(0, -12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c8931a';
      ctx.beginPath();
      ctx.arc(-3 * u, 4 * u, 2 * u, 0, Math.PI * 2);
      ctx.arc(5 * u, 5 * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'cucumber':
      ctx.fillStyle = '#5fb878';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 11 * u, 0, 8 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cdeeda';
        ctx.beginPath();
        ctx.arc(i * 11 * u, 0, 4.5 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5fb878';
      }
      break;
    case 'pasta':
      ctx.strokeStyle = prep === 'boiled' ? '#f7d774' : '#e0aa3e';
      ctx.lineWidth = 3 * u;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-14 * u, -9 * u + i * 6 * u);
        ctx.quadraticCurveTo(0, -13 * u + i * 6 * u, 14 * u, -9 * u + i * 6 * u);
        ctx.stroke();
      }
      break;
    case 'sauce':
      ctx.fillStyle = '#f5f0e6';
      ctx.beginPath();
      ctx.arc(0, 2 * u, 13 * u, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(0, 2 * u, 11 * u, 4 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

// --- Kitchen ----------------------------------------------------------------

function drawFloor(ctx, t) {
  // Wall band at the top.
  ctx.fillStyle = '#f3e2c7';
  ctx.fillRect(0, 0, W, 150);
  ctx.fillStyle = '#e0c193';
  ctx.fillRect(0, 142, W, 8);
  // Bistro tiles on the wall.
  ctx.fillStyle = '#e8d3ae';
  for (let x = 0; x < W; x += 64) ctx.fillRect(x, 96, 2, 46);
  // Wood floor planks.
  ctx.fillStyle = '#a97c50';
  ctx.fillRect(0, 150, W, H - 150);
  ctx.strokeStyle = 'rgba(90,55,25,0.35)';
  ctx.lineWidth = 2;
  for (let y = 190; y < H; y += 52) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(90,55,25,0.22)';
  for (let y = 190; y < H; y += 52) {
    for (let x = ((y / 52) % 2) * 160; x < W; x += 320) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 52);
      ctx.stroke();
    }
  }
  // Warm light pool in the middle of the kitchen.
  const g = ctx.createRadialGradient(640, 470, 80, 640, 470, 520);
  g.addColorStop(0, 'rgba(255,220,150,0.10)');
  g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 150, W, H - 150);
  void t;
}

function drawStationBase(ctx, s, hover) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#fff';
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fill();
  ctx.restore();
  if (hover) {
    ctx.save();
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 4;
    rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 14);
    ctx.stroke();
    ctx.restore();
  }
}

function drawProgressBar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  rr(ctx, x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0.01) {
    rr(ctx, x + 1, y + 1, Math.max(6, (w - 2) * Math.min(1, frac)), 8, 4);
    ctx.fill();
  }
}

function drawCookingSlot(ctx, slot, cx, cy, r, label) {
  if (!slot) {
    // Empty slot: dashed outline.
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    text(ctx, label, cx, cy + r + 14, 11, 'rgba(0,0,0,0.45)');
    return;
  }
  const frac = slot.progress / slot.total;
  if (slot.state === 'burned') {
    drawIngredientIcon(ctx, slot.item.kind, 'burned', cx, cy, 40);
    text(ctx, 'BURNT!', cx, cy + r + 14, 11, '#a11f14');
    return;
  }
  drawIngredientIcon(ctx, slot.item.kind, slot.state === 'done' ? finishedPrep(slot.prep) : 'raw', cx, cy, 40);
  if (slot.state === 'working') {
    drawProgressBar(ctx, cx - r - 6, cy + r + 6, (r + 6) * 2, frac, '#ff9f2e');
    text(ctx, label, cx, cy + r + 26, 11, 'rgba(0,0,0,0.55)');
  } else {
    // Done: green glow ring + READY.
    ctx.save();
    ctx.strokeStyle = '#43a047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    text(ctx, 'READY!', cx, cy + r + 14, 12, '#2e7d32');
  }
}

function finishedPrep(prepKind) {
  return prepKind === 'chop' ? 'chopped' : prepKind === 'grill' ? 'grilled' : 'boiled';
}

function drawStations(ctx, game) {
  const hover = game.hoverStation;
  for (const s of game.kitchen.stations) {
    const isHover = hover && hover.id === s.id;
    switch (s.kind) {
      case 'counter': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = INGREDIENTS[s.ingredient].color;
        rr(ctx, s.x + 6, s.y + 6, s.w - 12, s.h - 12, 9);
        ctx.fill();
        drawIngredientIcon(ctx, s.ingredient, 'raw', s.x + 34, s.y + 30, 40);
        text(ctx, s.name, s.x + s.w / 2 + 12, s.y + 22, 15, '#fff');
        const ing = INGREDIENTS[s.ingredient];
        if (ing.prepName) text(ctx, ing.prepName + ' →', s.x + s.w / 2 + 12, s.y + 42, 11, 'rgba(255,255,255,0.85)', 'center', false);
        break;
      }
      case 'board': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#d9a066';
        rr(ctx, s.x + 10, s.y + 10, s.w - 20, s.h - 20, 8);
        ctx.fill();
        ctx.strokeStyle = '#a4713a';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x + 16, s.y + 16, s.w - 32, s.h - 32);
        // Knife.
        ctx.save();
        ctx.translate(s.x + s.w - 42, s.y + 26);
        ctx.rotate(0.5);
        ctx.fillStyle = '#cfd8dc';
        ctx.fillRect(-4, -16, 8, 30);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-4, 14, 8, 12);
        ctx.restore();
        drawCookingSlot(ctx, s.slot, s.x + 82, s.y + 58, 26, 'Chop');
        text(ctx, 'Chopping Board', s.x + 12, s.y + 16, 12, '#5d4037', 'left');
        break;
      }
      case 'grill': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#3d3d46';
        rr(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10);
        ctx.fill();
        // Burners.
        const centers = [s.x + 68, s.x + 192];
        centers.forEach((cx, i) => {
          const slot = s.slots[i];
          const cy = s.y + 58;
          ctx.fillStyle = '#232329';
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();
          if (slot && slot.state === 'working') {
            // Animated flame.
            const f = 0.5 + 0.5 * Math.sin(game.animTime * 9 + i * 2);
            ctx.fillStyle = 'rgba(255,' + Math.round(120 + 80 * f) + ',30,0.85)';
            ctx.beginPath();
            ctx.moveTo(cx - 12, cy + 26);
            ctx.quadraticCurveTo(cx - 16, cy - 6 - 8 * f, cx, cy - 14 - 10 * f);
            ctx.quadraticCurveTo(cx + 16, cy - 6 - 8 * f, cx + 12, cy + 26);
            ctx.closePath();
            ctx.fill();
          }
          drawCookingSlot(ctx, slot, cx, cy, 26, 'Grill');
        });
        text(ctx, 'Grill', s.x + s.w / 2, s.y + 16, 12, '#eee');
        break;
      }
      case 'pot': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#37474f';
        rr(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10);
        ctx.fill();
        const cx = s.x + s.w / 2, cy = s.y + 64;
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 52, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a6b7c';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 44, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        if (s.slot) {
          // Bubbling water.
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          for (let i = 0; i < 3; i++) {
            const bx = cx - 24 + ((game.animTime * 30 + i * 23) % 48);
            const by = cy - 6 - ((game.animTime * 22 + i * 17) % 18);
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        drawCookingSlot(ctx, s.slot, cx, cy, 24, 'Boil');
        text(ctx, 'Pasta Pot', cx, s.y + 16, 12, '#eee');
        break;
      }
      case 'plating': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#eceff1';
        rr(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10);
        ctx.fill();
        // Plate stack.
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#b0bec5';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(s.x + 46, s.y + 118 - i * 6, 30, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // The working plate and its contents.
        const px = s.x + 150, py = s.y + 78;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#90a4ae';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px, py, 62, 30, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const plate = s.plate;
        plate.forEach((item, i) => {
          const a = (i / Math.max(plate.length, 1)) * Math.PI * 2 - Math.PI / 2;
          drawIngredientIcon(ctx, item.kind, item.prep, px + Math.cos(a) * 30, py + Math.sin(a) * 13, 30);
        });
        if (plate.length === 0) text(ctx, 'empty plate', px, py, 12, '#90a4ae', 'center', false);
        const recipe = plateMatchesRecipe(plate);
        if (recipe) text(ctx, recipe.name + ' ✓', px, py - 44, 13, '#2e7d32');
        text(ctx, 'Plating', s.x + s.w / 2, s.y + s.h - 8, 12, '#455a64');
        break;
      }
      case 'pass': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#8d6e63';
        rr(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 10);
        ctx.fill();
        ctx.fillStyle = '#ffecb3';
        rr(ctx, s.x + 20, s.y + 16, s.w - 40, 52, 8);
        ctx.fill();
        text(ctx, '★ SERVING PASS ★', s.x + s.w / 2, s.y + 42, 16, '#6d4c41');
        // Bell.
        ctx.fillStyle = '#f7c948';
        ctx.beginPath();
        ctx.arc(s.x + s.w / 2, s.y + 92, 16, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(s.x + s.w / 2 - 16, s.y + 92, 32, 4);
        ctx.fillStyle = '#c8931a';
        ctx.beginPath();
        ctx.arc(s.x + s.w / 2, s.y + 100, 4, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, 'Serve finished plates here', s.x + s.w / 2, s.y + s.h - 20, 11, '#ffecb3', 'center', false);
        break;
      }
      case 'trash': {
        drawStationBase(ctx, s, isHover);
        ctx.fillStyle = '#546e7a';
        rr(ctx, s.x + 14, s.y + 14, s.w - 28, s.h - 34, 8);
        ctx.fill();
        ctx.fillStyle = '#37474f';
        ctx.fillRect(s.x + 10, s.y + 10, s.w - 20, 10);
        text(ctx, '🗑', s.x + s.w / 2, s.y + 44, 26, '#fff');
        text(ctx, 'Trash', s.x + s.w / 2, s.y + s.h - 8, 12, '#455a64');
        break;
      }
      default:
        break;
    }
  }
}

// --- Chef -------------------------------------------------------------------

function drawChef(ctx, game) {
  const c = game.chef;
  const bob = Math.sin(game.animTime * 10) * (c.moving ? 2 : 0);
  ctx.save();
  ctx.translate(c.x, c.y - bob);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f5f5f5';
  rr(ctx, -18, -6, 36, 28, 12);
  ctx.fill();
  ctx.fillStyle = '#d32f2f';
  ctx.fillRect(-18, 6, 36, 5);
  // Head.
  ctx.fillStyle = '#ffcc9e';
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -30, 8, 0, Math.PI * 2);
  ctx.arc(0, -34, 9, 0, Math.PI * 2);
  ctx.arc(7, -30, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -32, 26, 7);
  // Face.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-5, -19, 1.8, 0, Math.PI * 2);
  ctx.arc(5, -19, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -15, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried item above the head.
  if (c.carrying) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, -58, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (c.carrying.type === 'plate') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, -56, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      c.carrying.items.forEach((item, i) => {
        const a = (i / Math.max(c.carrying.items.length, 1)) * Math.PI * 2 - Math.PI / 2;
        drawIngredientIcon(ctx, item.kind, item.prep, Math.cos(a) * 8, -56 + Math.sin(a) * 3, 18);
      });
    } else {
      drawIngredientIcon(ctx, c.carrying.kind, c.carrying.prep, 0, -58, 34);
    }
    const label = c.carrying.type === 'plate'
      ? (plateName(c.carrying.items) || 'Plate')
      : finishedName(c.carrying);
    text(ctx, label, 0, -84, 12, '#333');
  }
  ctx.restore();
}

function plateName(items) {
  const r = plateMatchesRecipe(items);
  return r ? r.name : null;
}

// --- Order board ------------------------------------------------------------

function drawOrders(ctx, game) {
  const board = game.board;
  const tickets = board.orders;
  const tw = 196, th = 74, gap = 12;
  const totalW = tickets.length * (tw + gap) - gap;
  let x = (W - totalW) / 2;
  const y = 62;
  tickets.forEach((o) => {
    const recipe = RECIPES.find((r) => r.id === o.recipeId);
    const frac = Math.max(0, o.patience / o.patienceMax);
    const urgent = frac < 0.3 && o.state === 'active';
    ctx.save();
    if (o.state !== 'active') ctx.globalAlpha = Math.max(0, 1 - (o.goneTimer || 0));
    if (urgent) ctx.translate(0, Math.sin(game.animTime * 14) * 1.5);
    // Ticket card.
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = o.state === 'expired' ? '#ffcdd2' : o.state === 'served' ? '#c8e6c9' : '#fffdf5';
    rr(ctx, x, y, tw, th, 8);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    rr(ctx, x, y, tw, th, 8);
    ctx.clip();
    ctx.fillStyle = o.color;
    ctx.fillRect(x, y, 6, th);
    ctx.restore();
    if (o.state === 'active') {
      text(ctx, o.name, x + 12, y + 14, 14, '#333', 'left');
      text(ctx, '+' + ticketPoints(o) + ' pts', x + tw - 8, y + 14, 12, '#6d4c41', 'right');
      recipe.needs.forEach((need, i) => {
        drawIngredientIcon(ctx, need.kind, need.prep, x + 24 + i * 34, y + 42, 30);
      });
      // Patience bar.
      const bw = tw - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      rr(ctx, x + 10, y + th - 12, bw, 7, 3);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? '#43a047' : frac > 0.25 ? '#ff9f2e' : '#e53935';
      rr(ctx, x + 10, y + th - 12, bw * frac, 7, 3);
      ctx.fill();
      if (urgent) text(ctx, 'HURRY!', x + tw - 8, y + 34, 11, '#e53935', 'right');
    } else if (o.state === 'served') {
      text(ctx, '✓ SERVED', x + tw / 2, y + th / 2, 16, '#2e7d32');
    } else {
      text(ctx, '✕ LOST', x + tw / 2, y + th / 2, 16, '#c62828');
    }
    x += tw + gap;
  });
  if (tickets.length === 0) {
    text(ctx, 'No orders yet — the lunch rush is coming…', W / 2, y + 34, 15, 'rgba(255,255,255,0.85)', 'center', false);
  }
}

// --- HUD ----------------------------------------------------------------------

// Floating pause button (bottom-right, clear of the pass and the hint
// pill). main.js hit-tests clicks against this rect.
export const PAUSE_BUTTON = { x: 1212, y: 740, w: 48, h: 48 };

function drawPauseButton(ctx, game) {
  const b = PAUSE_BUTTON;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, game.phase === 'paused' ? '▶' : '❚❚', cx, cy + 1, 16, '#fff');
  ctx.restore();
}

function drawHUD(ctx, game) {
  // Top bar.
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(0, 0, W, 54);
  ctx.fillStyle = '#ffca28';
  text(ctx, '🍳 Sizzle & Serve', 16, 28, 22, '#ffca28', 'left');
  // Shift timer (centre).
  const frac = Math.max(0, game.timeLeft / game.shiftSeconds);
  const bx = W / 2 - 190, by = 16, bw = 380, bh = 22;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, bx, by, bw, bh, 11);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#66bb6a' : frac > 0.25 ? '#ffca28' : '#ef5350';
  rr(ctx, bx + 2, by + 2, (bw - 4) * frac, bh - 4, 9);
  ctx.fill();
  const mm = Math.floor(game.timeLeft / 60);
  const ss = Math.floor(game.timeLeft % 60).toString().padStart(2, '0');
  text(ctx, '⏱ ' + mm + ':' + ss + ' left', W / 2, by + bh / 2, 14, '#fff');
  // Score / coins / combo (right).
  text(ctx, 'Score ' + game.score, W - 330, 28, 18, '#fff', 'left');
  text(ctx, '🪙 ' + game.coins, W - 200, 28, 18, '#ffca28', 'left');
  if (game.combo >= 2) {
    ctx.fillStyle = '#ff7043';
    rr(ctx, W - 118, 10, 102, 34, 17);
    ctx.fill();
    text(ctx, '🔥 COMBO x' + game.combo, W - 67, 28, 15, '#fff');
  }
  text(ctx, 'Served: ' + game.board.served + '   Lost: ' + game.board.lost, W - 330, 46, 11, 'rgba(255,255,255,0.7)', 'left', false);
  drawPauseButton(ctx, game);
}

// --- Particles & popups -------------------------------------------------------

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a * (p.alpha ?? 0.8);
    if (p.shape === 'steam') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'spark') {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else if (p.shape === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  for (const pop of game.popups) {
    const a = Math.max(0, pop.life / pop.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 2);
    ctx.font = 'bold ' + pop.size + 'px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(pop.text, pop.x, pop.y);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();
  }
}

// --- RUSH! banner ------------------------------------------------------------
// Flashes when 3+ orders are simultaneously low on patience — the
// per-ticket "HURRY!" alone was too easy to miss in a full board.
function drawRushBanner(ctx, game) {
  if (game.phase !== 'playing') return;
  const low = game.board.orders.filter(
    (o) => o.state === 'active' && o.patience / o.patienceMax < 0.35,
  ).length;
  if (low < 3) return;
  const pulse = 0.65 + 0.35 * Math.sin(game.animTime * 8);
  const label = '⚠ RUSH! ' + low + ' orders almost out of time! ⚠';
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 16px Verdana, sans-serif';
  const w = ctx.measureText(label).width + 48;
  ctx.fillStyle = '#c62828';
  rr(ctx, W / 2 - w / 2, 712, w, 32, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffca28';
  ctx.lineWidth = 2;
  rr(ctx, W / 2 - w / 2, 712, w, 32, 16);
  ctx.stroke();
  text(ctx, label, W / 2, 729, 16, '#fff');
  ctx.restore();
}

// --- Hint line ------------------------------------------------------------------

function drawHint(ctx, game) {
  if (!game.hint || game.hintTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, game.hintTimer * 2);
  ctx.font = '14px Verdana, sans-serif';
  // Size the pill to the text: the old fixed 380px box clipped long hints
  // (e.g. the burn warning) past its rounded edge.
  const w = Math.min(860, ctx.measureText(game.hint).width + 44);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  rr(ctx, W / 2 - w / 2, H - 44, w, 30, 15);
  ctx.fill();
  text(ctx, game.hint, W / 2, H - 28, 14, '#fff', 'center', false);
  ctx.restore();
}

// --- Screens --------------------------------------------------------------------

function drawTitle(ctx, game) {
  drawFloor(ctx, game.animTime);
  drawStations(ctx, game);
  ctx.fillStyle = 'rgba(40,20,5,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8ec';
  rr(ctx, W / 2 - 360, 130, 720, 500, 20);
  ctx.fill();
  ctx.strokeStyle = '#d98a3d';
  ctx.lineWidth = 4;
  rr(ctx, W / 2 - 360, 130, 720, 500, 20);
  ctx.stroke();
  text(ctx, '🍳 Sizzle & Serve', W / 2, 190, 46, '#b45f06');
  text(ctx, 'A tiny bistro. A three-minute lunch rush. You are the chef.', W / 2, 232, 16, '#6d4c41', 'center', false);
  // Mini recipe cards.
  RECIPES.forEach((r, i) => {
    const x = W / 2 - 320 + i * 165;
    ctx.fillStyle = r.color;
    rr(ctx, x, 270, 150, 92, 10);
    ctx.fill();
    text(ctx, r.name, x + 75, 292, 14, '#fff');
    r.needs.forEach((n, j) => drawIngredientIcon(ctx, n.kind, n.prep, x + 28 + j * 30, 330, 26));
    text(ctx, '+' + (r.base + 30) + ' pts', x + 75, 352, 12, '#fff', 'center', false);
  });
  text(ctx, 'HOW TO PLAY', W / 2, 396, 16, '#b45f06');
  const lines = [
    'Move: WASD / Arrow keys, or click anywhere to walk there.',
    'Interact: E or Space (or click a station). Pick ingredients, chop, grill, boil.',
    'Assemble dishes on the Plating counter, then serve them at the Pass.',
    'Watch the patience bars — a lost order breaks your combo!',
    'Keys 1–8 jump to an ingredient crate. P pauses. R restarts.',
  ];
  lines.forEach((l, i) => text(ctx, l, W / 2, 424 + i * 24, 14, '#5d4037', 'center', false));
  const pulse = 0.6 + 0.4 * Math.sin(game.animTime * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#d32f2f';
  rr(ctx, W / 2 - 170, 548, 340, 44, 22);
  ctx.fill();
  text(ctx, '▶  Click or press Enter to start', W / 2, 571, 17, '#fff');
  ctx.restore();
  // At-a-glance shortcut strip — the prose block above is easy to skim past.
  text(ctx, 'WASD / Arrows move  ·  E or Space interact  ·  1–8 crates  ·  P pause  ·  R restart', W / 2, 612, 13, '#8d6e63', 'center', false);
}

function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(40,20,5,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8ec';
  rr(ctx, W / 2 - 300, 150, 600, 470, 20);
  ctx.fill();
  ctx.strokeStyle = '#d98a3d';
  ctx.lineWidth = 4;
  rr(ctx, W / 2 - 300, 150, 600, 470, 20);
  ctx.stroke();
  text(ctx, '⏰ Shift Over!', W / 2, 205, 40, '#b45f06');
  text(ctx, game.score >= 300 ? 'A rush well served. The bistro salutes you!' : 'The lunch rush is done — the kitchen is yours again tomorrow.', W / 2, 248, 14, '#6d4c41', 'center', false);
  // Star grade + accuracy: the old screen listed raw numbers but never
  // said how well the shift actually went.
  const grade = game.score >= 600 ? '★★★ Head Chef!' :
    game.score >= 400 ? '★★ Sous Chef' :
    game.score >= 250 ? '★ Line Cook' : 'Trainee — the rush beat you this time';
  text(ctx, grade, W / 2, 278, 20, '#d98a3d');
  const total = game.board.served + game.board.lost;
  const accuracy = total > 0 ? Math.round((100 * game.board.served) / total) + '%' : '—';
  const avgCoins = game.board.served > 0 ? '🪙 ' + Math.round(game.coins / game.board.served) : '—';
  const rows = [
    ['Final score', '' + game.score],
    ['Coins earned', '🪙 ' + game.coins],
    ['Dishes served', '' + game.board.served],
    ['Orders lost', '' + game.board.lost],
    ['Best combo', 'x' + game.bestCombo],
    ['Accuracy', accuracy],
    ['Avg coins / dish', avgCoins],
  ];
  rows.forEach((r, i) => {
    const y = 306 + i * 34;
    text(ctx, r[0], W / 2 - 200, y, 17, '#5d4037', 'left');
    text(ctx, r[1], W / 2 + 200, y, 17, '#b45f06', 'right');
  });
  const pulse = 0.6 + 0.4 * Math.sin(game.animTime * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#2e7d32';
  rr(ctx, W / 2 - 170, 528, 340, 44, 22);
  ctx.fill();
  text(ctx, '↻  Press R or click to cook again', W / 2, 551, 16, '#fff');
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, '⏸ Paused — press P or tap ▶ to keep cooking', W / 2, H / 2, 26, '#fff');
}

// --- Main entry -------------------------------------------------------------------

export function drawGame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  if (game.phase === 'title') {
    drawTitle(ctx, game);
    return;
  }
  drawFloor(ctx, game.animTime);
  drawStations(ctx, game);
  drawParticles(ctx, game);
  drawChef(ctx, game);
  drawOrders(ctx, game);
  drawHUD(ctx, game);
  drawRushBanner(ctx, game);
  drawHint(ctx, game);
  if (game.phase === 'over') drawGameOver(ctx, game);
  if (game.phase === 'paused') drawPaused(ctx);
}
