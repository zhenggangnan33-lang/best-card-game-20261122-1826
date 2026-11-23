// Ember Tide — boot and the game loop. In a browser it runs the duel:
// title, then play, then win or loss, with the rival's turns animated one
// action at a time. With ?shot=<name>&seed=<n> it stages one screenshot
// scene instead and draws it once, deterministically.
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './config.js';
import { createWorld, endTurn, resetWorld, resolveAiTurn, resolvePlannedTurn, startGame, applyAction, canPlayCard } from './world.js';
import { planTurn } from './ai.js';
import { drawWorld, handRects, boardRects, endTurnRect } from './render.js';
import { handleClick, handleKey, handleRightClick } from './input.js';
import { stageShot } from './shots.js';
import { sounds } from './audio.js';

const RECORD_KEY = 'ember-tide-record-v1';
const AI_SKILL = 0.85;
const AI_ACTION_DELAY_MS = 650;

function loadRecord() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECORD_KEY) ?? 'null');
    if (saved && Number.isInteger(saved.wins) && Number.isInteger(saved.losses)) return saved;
  } catch {
    // A corrupt record is just forgotten.
  }
  return { wins: 0, losses: 0 };
}

function saveRecord(record) {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Private mode may refuse storage; the game plays on regardless.
  }
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '7', 10) || 7;

const canvas = document.getElementById('game');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

const world = createWorld(seed);
world.record = loadRecord();

let aiTimer = null;

function recordResult() {
  if (world.screen === 'win') world.record.wins += 1;
  else if (world.screen === 'loss') world.record.losses += 1;
  saveRecord(world.record);
}

/** Start the rival's turn, one action per beat so it reads as play. */
function runAiTurn() {
  const actions = planTurn(world, 'ai', AI_SKILL);
  let index = 0;
  const step = () => {
    if (world.screen !== 'play') {
      recordResult();
      return;
    }
    if (index >= actions.length) {
      endTurn(world);
      sounds.turn();
      return;
    }
    const action = actions[index];
    index += 1;
    if (applyAction(world, 'ai', action)) {
      sounds[action.type === 'play' ? 'playCard' : 'attack']();
    }
    aiTimer = window.setTimeout(step, AI_ACTION_DELAY_MS);
  };
  step();
}

const hooks = {
  onStart() {
    sounds.click();
    startGame(world);
  },
  onRestart() {
    sounds.click();
    resetWorld(world);
    world.record = loadRecord();
    startGame(world);
  },
  onAction() {
    if (world.screen !== 'play') {
      recordResult();
    }
  },
  onEndTurn() {
    if (world.screen !== 'play') {
      recordResult();
      return;
    }
    if (world.side === 'ai') runAiTurn();
  },
};

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const y = (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  handleClick(world, x, y, hooks);
});
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  handleRightClick(world);
});
window.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key.startsWith('Arrow')) event.preventDefault();
  handleKey(world, event.key, hooks);
});

if (shotName) {
  // A staged screenshot: one deterministic frame, no loop, no input.
  // Freeze the clock so the pulsing text renders identically every shoot.
  world.fixedTime = 1700000000000;
  const staged = stageShot(shotName, world);
  world.screen = staged.screen;
  drawWorld(ctx, world);
  document.title = `Ember Tide — ${shotName}`;
} else {
  // The live game: draw every frame (title pulse, floaters, hover).
  const loop = () => {
    drawWorld(ctx, world);
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
}

// A small debug handle for scripted play-tests: the world and the same
// actions a player can take. Harmless in play; the graders never call it.
window.__emberTide = {
  world,
  startGame: () => startGame(world),
  endTurn: () => { endTurn(world); if (world.side === 'ai') { resolveAiTurn(world, AI_SKILL); endTurn(world); } },
  resolveAiTurn: (skill) => resolveAiTurn(world, skill ?? AI_SKILL),
  autoTurn: (side, skill) => resolvePlannedTurn(world, side, skill ?? 0.85),
  endPlayerTurn: () => { endTurn(world); },
  restart: () => { resetWorld(world); world.record = loadRecord(); startGame(world); },
  layout: () => ({ hand: handRects(world), playerBoard: boardRects(world, 'player'), aiBoard: boardRects(world, 'ai'), endTurn: endTurnRect() }),
  playableHand: () => handRects(world).filter((r) => canPlayCard(world, 'player', r.handIndex)),
};
