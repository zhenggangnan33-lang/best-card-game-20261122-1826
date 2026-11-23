// Ember Tide — mouse and keyboard. A click is resolved against the same
// rectangles the renderer draws: hand cards, board guardians, hero panels,
// the End Turn button. Targeting spells and attacks ask for a second click;
// right-click or Escape cancels.
import { boardRects, endTurnRect, handRects, heroRect } from './render.js';
import { attack, canAttack, canPlayCard, playCard, endTurn } from './world.js';
import { TEMPLATE_BY_ID } from './config.js';
import { sounds, toggleMute } from './audio.js';

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/**
 * Handle a click at canvas coordinates (x, y). `hooks` lets the main loop
 * react: onAction (a card was played or an attack happened), onEndTurn,
 * onStart (title or end screen clicked).
 */
export function handleClick(world, x, y, hooks) {
  if (world.screen === 'title') {
    hooks.onStart();
    return;
  }
  if (world.screen === 'win' || world.screen === 'loss') {
    hooks.onRestart();
    return;
  }
  if (world.side !== 'player') return;

  // 1. Awaiting a target: hero panels and enemy guardians are live.
  if (world.targetMode) {
    const foeHero = heroRect(world, 'ai');
    if (world.targetMode === 'any' && inside(foeHero, x, y)) {
      resolveTarget(world, { kind: 'hero', side: 'ai' }, hooks);
      return;
    }
    for (const rect of boardRects(world, 'ai')) {
      if (inside(rect, x, y)) {
        resolveTarget(world, { kind: 'guardian', uid: rect.uid }, hooks);
        return;
      }
    }
    // Clicking anywhere else cancels targeting.
    world.selected = null;
    world.targetMode = null;
    return;
  }

  // 2. Hand cards: select one, or play it at once when it needs no target.
  for (const rect of handRects(world)) {
    if (!inside(rect, x, y)) continue;
    const template = TEMPLATE_BY_ID[rect.id];
    if (!canPlayCard(world, 'player', rect.handIndex)) {
      sounds.error();
      return;
    }
    if (template.kind === 'spell' && template.target === 'any') {
      world.selected = { handIndex: rect.handIndex };
      world.targetMode = 'any';
      sounds.select();
      return;
    }
    if (playCard(world, 'player', rect.handIndex, null)) {
      sounds.playCard();
      hooks.onAction();
    }
    return;
  }

  // 3. Your guardians: select one to attack with.
  for (const rect of boardRects(world, 'player')) {
    if (!inside(rect, x, y)) continue;
    const guardian = world.player.board.find((g) => g.uid === rect.uid);
    if (guardian && guardian.canAttack) {
      world.selected = { uid: rect.uid };
      world.targetMode = 'attack';
      sounds.select();
    } else {
      sounds.error();
    }
    return;
  }

  // 4. End Turn.
  if (inside(endTurnRect(), x, y)) {
    endTurn(world);
    sounds.turn();
    hooks.onEndTurn();
    return;
  }

  // 5. A click on empty table clears the selection.
  world.selected = null;
  world.targetMode = null;
}

function resolveTarget(world, target, hooks) {
  const selected = world.selected;
  if (!selected) return;
  if (selected.handIndex !== undefined) {
    // A targeted spell.
    if (playCard(world, 'player', selected.handIndex, target)) {
      sounds.playCard();
      hooks.onAction();
    }
  } else if (selected.uid !== undefined) {
    // An attack.
    if (canAttack(world, 'player', selected.uid, target)) {
      if (attack(world, 'player', selected.uid, target)) {
        sounds.attack();
        hooks.onAction();
      }
    } else {
      sounds.error();
    }
  }
  world.selected = null;
  world.targetMode = null;
}

/** Right-click cancels a selection or a targeting prompt. */
export function handleRightClick(world) {
  world.selected = null;
  world.targetMode = null;
}

/**
 * Handle a key: 1–7 select a hand card, Enter/Space ends the turn,
 * Escape cancels, M mutes, R restarts from an end screen.
 */
export function handleKey(world, key, hooks) {
  if (key === 'm' || key === 'M') {
    toggleMute();
    return;
  }
  if (world.screen === 'title' && (key === 'Enter' || key === ' ')) {
    hooks.onStart();
    return;
  }
  if ((world.screen === 'win' || world.screen === 'loss') && (key === 'r' || key === 'R' || key === 'Enter' || key === ' ')) {
    hooks.onRestart();
    return;
  }
  if (world.screen !== 'play' || world.side !== 'player') return;
  if (key === 'Escape') {
    world.selected = null;
    world.targetMode = null;
    return;
  }
  if (key === 'Enter' || key === ' ') {
    endTurn(world);
    sounds.turn();
    hooks.onEndTurn();
    return;
  }
  const digit = Number.parseInt(key, 10);
  if (digit >= 1 && digit <= 7) {
    const handIndex = digit - 1;
    if (handIndex < world.player.hand.length && canPlayCard(world, 'player', handIndex)) {
      const template = TEMPLATE_BY_ID[world.player.hand[handIndex]];
      if (template.kind === 'spell' && template.target === 'any') {
        world.selected = { handIndex };
        world.targetMode = 'any';
        sounds.select();
      } else if (playCard(world, 'player', handIndex, null)) {
        sounds.playCard();
        hooks.onAction();
      }
    } else {
      sounds.error();
    }
  }
}
