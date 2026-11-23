// Ember Tide — everything the eye sees, drawn on one canvas: the felt
// table, the cards, the heroes, the tide dial, the title and end screens.
// The same layout math drives both drawing and click hit-testing, so what
// you see is exactly what you can click.
import { CANVAS_HEIGHT, CANVAS_WIDTH, ELEMENTS, HEROES, MAX_BOARD, TEMPLATE_BY_ID } from './config.js';
import { cardCost } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const GOLD = '#d4af37';
const PANEL = 'rgba(4, 26, 20, 0.72)';
const HAND_CARD = { w: 132, h: 186 };
const BOARD_CARD = { w: 118, h: 164 };
const BACK_CARD = { w: 56, h: 80 };

/** The clock for pulsing text: fixed in staged screenshots so a re-shoot
 * is byte-identical, live otherwise. */
function now(world) {
  return world.fixedTime ?? Date.now();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'center', font = 'Georgia, "Times New Roman", serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** The little element mark: flame, flake, wind swirl or rock. */
export function drawElementGlyph(ctx, glyph, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.lineCap = 'round';
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.75, -r * 0.3, r * 0.55, r * 0.6, 0, r * 0.85);
    ctx.bezierCurveTo(-r * 0.55, r * 0.6, -r * 0.75, -r * 0.3, 0, -r);
    ctx.fill();
    ctx.fillStyle = '#ffd8a8';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.25);
    ctx.bezierCurveTo(r * 0.4, r * 0.15, r * 0.3, r * 0.55, 0, r * 0.6);
    ctx.bezierCurveTo(-r * 0.3, r * 0.55, -r * 0.4, r * 0.15, 0, -r * 0.25);
    ctx.fill();
  } else if (glyph === 'flake') {
    for (let i = 0; i < 6; i += 1) {
      const angle = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * r * 0.55, Math.sin(angle) * r * 0.55);
      ctx.lineTo(Math.cos(angle - 0.5) * r * 0.85, Math.sin(angle - 0.5) * r * 0.85);
      ctx.moveTo(Math.cos(angle) * r * 0.55, Math.sin(angle) * r * 0.55);
      ctx.lineTo(Math.cos(angle + 0.5) * r * 0.85, Math.sin(angle + 0.5) * r * 0.85);
      ctx.stroke();
    }
  } else if (glyph === 'wind') {
    for (let i = 0; i < 3; i += 1) {
      const yy = -r * 0.55 + i * r * 0.55;
      ctx.beginPath();
      ctx.arc(-r * 0.15, yy, r * (0.42 - i * 0.07), Math.PI * 0.15, Math.PI * 1.25);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.5);
    ctx.lineTo(-r * 0.35, -r * 0.75);
    ctx.lineTo(r * 0.55, -r * 0.55);
    ctx.lineTo(r * 0.85, r * 0.45);
    ctx.lineTo(r * 0.1, r * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A hero portrait: a lantern-keeper's helm in their element colour. */
function drawPortrait(ctx, side, x, y, r) {
  const hero = HEROES[side];
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = side === 'player' ? '#1c2b4a' : '#123043';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = hero.color;
  ctx.stroke();
  // Hood and lantern light.
  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.15, r * 0.55, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + r * 0.45, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe066';
  ctx.fill();
  text(ctx, hero.name.split(' ')[1][0], x, y + r * 0.05, r * 0.7, '#ffffff');
  ctx.restore();
}

/** Life as a big number, a heart and a bar. */
function drawLife(ctx, life, max, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x, y, w, 26, 6);
  ctx.fill();
  const ratio = Math.max(0, life / max);
  ctx.fillStyle = ratio > 0.5 ? '#69db7c' : ratio > 0.25 ? '#fab005' : '#fa5252';
  roundRect(ctx, x + 3, y + 3, (w - 6) * ratio, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#fa5252';
  ctx.beginPath();
  ctx.arc(x - 14, y + 10, 6, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, String(Math.max(0, life)), x + w / 2, y + 14, 16, '#ffffff');
}

/** Embers as a row of small crystals, filled up to the current count. */
function drawEmbers(ctx, embers, maxEmbers, x, y) {
  for (let i = 0; i < maxEmbers; i += 1) {
    const cx = x + i * 22;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < embers ? '#ff922b' : 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = '#ffd8a8';
    ctx.lineWidth = 1;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
  }
}

/** One card face. `opts` carries playability, selection and size hints. */
export function drawCard(ctx, template, x, y, w, h, opts = {}) {
  const el = ELEMENTS[template.element];
  const scale = w / 132;
  ctx.save();
  if (opts.dimmed) ctx.globalAlpha = 0.55;
  // Frame.
  ctx.fillStyle = '#f8f4e8';
  roundRect(ctx, x, y, w, h, 10 * scale);
  ctx.fill();
  ctx.lineWidth = opts.selected ? 4 : 2.5;
  ctx.strokeStyle = opts.selected ? GOLD : opts.playable ? '#51cf66' : el.color;
  ctx.stroke();
  if (opts.canAttack) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12 * scale);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Element band and name: the short name, left-aligned past the cost gem,
  // shrunk until it fits the band.
  ctx.fillStyle = el.color;
  roundRect(ctx, x + 4, y + 4, w - 8, 26 * scale, 6 * scale);
  ctx.fill();
  const label = template.short ?? template.name;
  let nameSize = Math.max(10, 13 * scale);
  ctx.font = `bold ${nameSize}px Georgia, "Times New Roman", serif`;
  const nameWidth = w - 34 * scale;
  while (nameSize > 8 && ctx.measureText(label).width > nameWidth) {
    nameSize -= 1;
    ctx.font = `bold ${nameSize}px Georgia, "Times New Roman", serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 32 * scale, y + 18 * scale);
  // Cost gem.
  ctx.beginPath();
  ctx.arc(x + 16 * scale, y + 16 * scale, 13 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#1971c2';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  text(ctx, String(opts.cost ?? template.cost), x + 16 * scale, y + 17 * scale, Math.max(10, 14 * scale), '#ffffff');
  // Art: the element glyph, large, over a tinted field.
  const artY = y + 34 * scale;
  const artH = h * 0.42;
  ctx.fillStyle = el.light;
  roundRect(ctx, x + 8 * scale, artY, w - 16 * scale, artH, 6 * scale);
  ctx.fill();
  drawElementGlyph(ctx, el.glyph, x + w / 2, artY + artH / 2, Math.min(w, artH) * 0.3, el.dark);
  if (template.keyword) {
    text(ctx, template.keyword.toUpperCase(), x + w / 2, artY + artH - 8 * scale, Math.max(8, 9 * scale), el.dark, 'bold', 'center', 'system-ui, sans-serif');
  }
  // Rules text.
  ctx.fillStyle = '#343a40';
  ctx.font = `${Math.max(9, 10.5 * scale)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = template.text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`.trim()).width > w - 16 * scale && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((ln, i) => {
    ctx.fillText(ln, x + w / 2, y + h - 44 * scale + i * 12 * scale);
  });
  // Attack / health pips for guardians.
  if (template.kind === 'guardian') {
    ctx.fillStyle = '#e8590c';
    ctx.beginPath();
    ctx.arc(x + 16 * scale, y + h - 16 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, String(opts.attack ?? template.attack), x + 16 * scale, y + h - 15 * scale, Math.max(10, 13 * scale), '#ffffff');
    ctx.fillStyle = '#fa5252';
    ctx.beginPath();
    ctx.arc(x + w - 16 * scale, y + h - 16 * scale, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, String(opts.health ?? template.health), x + w - 16 * scale, y + h - 15 * scale, Math.max(10, 13 * scale), '#ffffff');
  } else {
    text(ctx, 'SPELL', x + w / 2, y + h - 16 * scale, Math.max(8, 10 * scale), el.dark, 'bold', 'center', 'system-ui, sans-serif');
  }
  ctx.restore();
}

/** A face-down card back, for the rival's hand. */
function drawCardBack(ctx, x, y, w, h) {
  ctx.fillStyle = '#2b3a67';
  roundRect(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.fillStyle = 'rgba(212,175,55,0.25)';
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 5);
  ctx.fill();
  drawElementGlyph(ctx, 'wind', x + w / 2, y + h / 2, Math.min(w, h) * 0.22, GOLD);
}

/** The table background: felt, gold trim, faint tide waves. */
function drawTable(ctx) {
  const gradient = ctx.createRadialGradient(640, 340, 80, 640, 360, 760);
  gradient.addColorStop(0, '#0e4d38');
  gradient.addColorStop(0.7, '#0a3527');
  gradient.addColorStop(1, '#062117');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(640, 360, 180 + i * 90, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, CANVAS_WIDTH - 12, CANVAS_HEIGHT - 12);
}

// ---- Layout: the same rectangles draw the game and take the clicks. ----

export function handRects(world) {
  const hand = world.player.hand;
  const step = Math.min(96, (CANVAS_WIDTH - 420) / Math.max(1, hand.length));
  const total = step * (hand.length - 1) + HAND_CARD.w;
  const startX = (CANVAS_WIDTH - total) / 2;
  return hand.map((id, i) => ({
    handIndex: i,
    id,
    x: startX + i * step,
    y: 528,
    w: HAND_CARD.w,
    h: HAND_CARD.h,
    raised: world.selected && world.selected.handIndex === i,
  }));
}

export function boardRects(world, side) {
  const board = world[side].board;
  const step = 132;
  const total = step * (board.length - 1) + BOARD_CARD.w;
  const startX = (CANVAS_WIDTH - total) / 2;
  const y = side === 'ai' ? 148 : 352;
  return board.map((g, i) => ({
    uid: g.uid,
    x: startX + i * step,
    y,
    w: BOARD_CARD.w,
    h: BOARD_CARD.h,
  }));
}

export function heroRect(world, side) {
  if (side === 'ai') return { x: 560, y: 8, w: 160, h: 48 };
  return { x: 16, y: 584, w: 340, h: 132 };
}

export function endTurnRect() {
  return { x: 1064, y: 626, w: 180, h: 56 };
}

function drawHeroPanel(ctx, world, side) {
  const hero = world[side];
  const info = HEROES[side];
  if (side === 'ai') {
    drawPortrait(ctx, 'ai', 56, 34, 26);
    text(ctx, info.name.toUpperCase(), 92, 22, 17, '#ffffff', 'bold', 'left');
    text(ctx, info.title, 92, 42, 11, '#ced4da', 'normal', 'left', 'system-ui, sans-serif');
    drawLife(ctx, hero.life, 30, 320, 14, 150);
    text(ctx, `DECK ${hero.deck.length}`, 320, 52, 12, '#ced4da', 'bold', 'left', 'system-ui, sans-serif');
    drawEmbers(ctx, hero.embers, hero.maxEmbers, 980, 28);
    text(ctx, `${hero.embers}/${hero.maxEmbers}`, 1208, 28, 13, '#ffd8a8', 'bold', 'left', 'system-ui, sans-serif');
    // Rival's hand, face down.
    const backs = hero.hand.length;
    const step = 62;
    const startX = (CANVAS_WIDTH - (step * (backs - 1) + BACK_CARD.w)) / 2;
    for (let i = 0; i < backs; i += 1) {
      drawCardBack(ctx, startX + i * step, 62, BACK_CARD.w, BACK_CARD.h);
    }
  } else {
    ctx.fillStyle = PANEL;
    roundRect(ctx, 16, 584, 340, 132, 10);
    ctx.fill();
    drawPortrait(ctx, 'player', 56, 624, 30);
    text(ctx, info.name.toUpperCase(), 98, 604, 16, '#ffffff', 'bold', 'left');
    text(ctx, info.title, 98, 624, 11, '#ced4da', 'normal', 'left', 'system-ui, sans-serif');
    drawLife(ctx, hero.life, 30, 98, 640, 150);
    drawEmbers(ctx, hero.embers, hero.maxEmbers, 98, 682);
    text(ctx, `DECK ${hero.deck.length}  ·  EMBERS ${hero.embers}/${hero.maxEmbers}  ·  W ${world.record?.wins ?? 0}–L ${world.record?.losses ?? 0}`, 98, 706, 11, '#ced4da', 'bold', 'left', 'system-ui, sans-serif');
  }
}

function drawTideDial(ctx, world) {
  const el = ELEMENTS[world.tide];
  const cx = 640;
  const cy = 30;
  ctx.fillStyle = PANEL;
  roundRect(ctx, cx - 150, 6, 300, 48, 10);
  ctx.fill();
  drawElementGlyph(ctx, el.glyph, cx - 118, cy, 15, el.color);
  text(ctx, `${el.name.toUpperCase()} TIDE`, cx - 96, cy, 16, el.light, 'bold', 'left');
  text(ctx, `${el.name} cards cost 1 less`, cx + 30, cy, 12, '#ced4da', 'normal', 'left', 'system-ui, sans-serif');
  // Next tide.
  const next = world.tide === 'ember' ? 'frost' : 'ember';
  text(ctx, `next: ${ELEMENTS[next].name}`, cx + 30, cy + 16, 10, '#868e96', 'normal', 'left', 'system-ui, sans-serif');
}

function drawBoardRow(ctx, world, side) {
  const rects = boardRects(world, side);
  const board = world[side].board;
  rects.forEach((rect, i) => {
    const guardian = board[i];
    const template = guardian.template;
    const selected = world.selected && world.selected.uid === guardian.uid;
    const targetable = world.targetMode === 'enemy-guardian' && side === 'ai';
    drawCard(ctx, template, rect.x, rect.y, rect.w, rect.h, {
      attack: guardian.attack,
      health: guardian.health,
      canAttack: side === 'player' && guardian.canAttack && world.side === 'player',
      selected,
      dimmed: side === 'player' && !guardian.canAttack && world.side === 'player',
      cost: template.cost,
    });
    if (targetable) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      roundRect(ctx, rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8, 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (guardian.justPlayed) {
      // A small NEW pill on the card's own band, never above the card.
      ctx.fillStyle = GOLD;
      roundRect(ctx, rect.x + rect.w - 38, rect.y + 7, 32, 14, 4);
      ctx.fill();
      text(ctx, 'NEW', rect.x + rect.w - 22, rect.y + 15, 9, '#1c2b4a', 'bold', 'center', 'system-ui, sans-serif');
    }
  });
  if (board.length === 0) {
    const y = side === 'ai' ? 220 : 430;
    text(ctx, side === 'ai' ? '— no guardians yet —' : '— your table is empty —', 640, y, 14, 'rgba(255,255,255,0.35)', 'normal', 'center', 'system-ui, sans-serif');
  }
}

function drawHand(ctx, world) {
  const rects = handRects(world);
  rects.forEach((rect) => {
    const template = TEMPLATE_BY_ID[rect.id];
    const cost = cardCost(world, template);
    const playable = world.side === 'player' && world.screen === 'play' && cost <= world.player.embers
      && !(template.kind === 'guardian' && world.player.board.length >= MAX_BOARD);
    const y = rect.raised ? rect.y - 26 : rect.y;
    drawCard(ctx, template, rect.x, y, rect.w, rect.h, {
      cost,
      playable,
      selected: !!rect.raised,
      dimmed: !playable,
    });
  });
}

function drawMiddle(ctx, world) {
  // The log, left of centre.
  ctx.fillStyle = PANEL;
  roundRect(ctx, 24, 322, 420, 56, 8);
  ctx.fill();
  world.log.slice(0, 3).forEach((line, i) => {
    text(ctx, line, 36, 336 + i * 16, 11, i === 0 ? '#ffffff' : '#adb5bd', 'normal', 'left', 'system-ui, sans-serif');
  });
  // Turn banner: one line, clear of the board rows.
  const banner = world.side === 'player'
    ? `YOUR TURN  ·  Turn ${world.turn}  ·  ${world.tide === 'ember' ? 'Ember' : 'Frost'} tide`
    : `VEX IS THINKING…  ·  Turn ${world.turn}`;
  text(ctx, banner, 640, 344, 19, world.side === 'player' ? '#ffd43b' : '#a5d8ff');
  // Targeting hint: above the End Turn button, clear of the table.
  if (world.targetMode) {
    text(ctx, 'Choose a target — click an enemy, or right-click to cancel', 1256, 606, 13, GOLD, 'bold', 'right', 'system-ui, sans-serif');
  }
  // End turn button.
  const button = endTurnRect();
  const enabled = world.side === 'player' && world.screen === 'play';
  ctx.fillStyle = enabled ? '#e8590c' : 'rgba(255,255,255,0.15)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 10);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = enabled ? '#ffd8a8' : 'rgba(255,255,255,0.3)';
  ctx.stroke();
  text(ctx, 'END TURN  ⏎', button.x + button.w / 2, button.y + button.h / 2 + 1, 17, enabled ? '#ffffff' : '#adb5bd');
  text(ctx, 'keys 1–7 play · click a card, then a target', 1150, 700, 11, '#868e96', 'normal', 'right', 'system-ui, sans-serif');
}

function drawTitle(ctx, world) {
  drawTable(ctx);
  // Decorative fanned cards behind the title.
  const showcase = [TEMPLATE_BY_ID.phoenix, TEMPLATE_BY_ID.leviathan, TEMPLATE_BY_ID.colossus];
  showcase.forEach((template, i) => {
    ctx.save();
    ctx.translate(640 + (i - 1) * 190, 470);
    ctx.rotate((i - 1) * 0.09);
    drawCard(ctx, template, -75, -105, 150, 210, { attack: template.attack, health: template.health });
    ctx.restore();
  });
  ctx.fillStyle = 'rgba(4, 26, 20, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 300);
  text(ctx, 'EMBER TIDE', 640, 108, 84, '#ffd43b');
  text(ctx, '— Duel of the Lantern Keepers —', 640, 168, 24, '#ffe8cc');
  text(ctx, 'Outplay Mariner Vex. Mind the tide: Ember and Frost take turns', 640, 208, 16, '#ced4da', 'normal', 'center', 'system-ui, sans-serif');
  text(ctx, 'making their cards cheaper. Thirty life. No mercy.', 640, 232, 16, '#ced4da', 'normal', 'center', 'system-ui, sans-serif');
  const pulse = 0.65 + 0.35 * Math.sin(now(world) / 350);
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK TO BEGIN', 640, 660, 26, '#ffffff');
  ctx.globalAlpha = 1;
  const record = world.record ?? { wins: 0, losses: 0 };
  text(ctx, `Best record  ·  ${record.wins} wins – ${record.losses} losses  ·  Guardians and spells, played with mouse or keys 1–7`, 640, 700, 12, '#868e96', 'normal', 'center', 'system-ui, sans-serif');
}

/** The live table: heroes, tide, boards, log, hand. */
function drawPlayScene(ctx, world) {
  drawTable(ctx);
  drawHeroPanel(ctx, world, 'ai');
  drawTideDial(ctx, world);
  drawBoardRow(ctx, world, 'ai');
  drawMiddle(ctx, world);
  drawBoardRow(ctx, world, 'player');
  drawHeroPanel(ctx, world, 'player');
  drawHand(ctx, world);
}

function drawEnd(ctx, world, won) {
  // The final table shows through a veil, so the ending still shows the
  // duel that was just played.
  ctx.save();
  ctx.globalAlpha = 0.45;
  drawPlayScene(ctx, world);
  ctx.restore();
  ctx.fillStyle = won ? 'rgba(212, 175, 55, 0.10)' : 'rgba(10, 30, 60, 0.45)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, won ? 'VICTORY' : 'DEFEAT', 640, 210, 96, won ? '#ffd43b' : '#a5d8ff');
  text(ctx, won ? 'The tide is yours — the lantern stays lit.' : 'Mariner Vex claims the lantern… this time.', 640, 292, 22, '#ffffff', 'normal', 'center', 'Georgia, "Times New Roman", serif');
  text(ctx, `Final life  ${Math.max(0, world.player.life)} – ${Math.max(0, world.ai.life)}   ·   ${world.turnsPlayed} turns played   ·   ${world.cardsPlayed} cards played`, 640, 372, 16, '#ced4da', 'normal', 'center', 'system-ui, sans-serif');
  const record = world.record ?? { wins: 0, losses: 0 };
  text(ctx, `Record  ${record.wins} wins – ${record.losses} losses`, 640, 408, 16, '#ced4da', 'normal', 'center', 'system-ui, sans-serif');
  const pulse = 0.65 + 0.35 * Math.sin(now(world) / 350);
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK TO PLAY AGAIN', 640, 490, 24, '#ffffff');
  ctx.globalAlpha = 1;
}

/** Draw the whole world onto `ctx` (a 1280×720 canvas context). */
export function drawWorld(ctx, world) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  if (world.screen === SCREEN_WIN || world.screen === SCREEN_LOSS) {
    drawEnd(ctx, world, world.screen === SCREEN_WIN);
    return;
  }
  drawPlayScene(ctx, world);
}
