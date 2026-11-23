// Ember Tide — staged screenshots. Each scene plays the real rules forward
// from a fresh world with a fixed seed, steered by the same planner that
// drives the rival, so every frame is what a real game looks like and the
// same seed always gives the same frame. When one seed does not reach the
// scene (a game that ends too early, a table that stays thin), the staging
// tries the next seed in a fixed sequence — still deterministic.
//
//   ?shot=title — the title screen
//   ?shot=play  — a rich mid-game table, both hands in view
//   ?shot=win   — a sharp pilot beats a dull rival: the victory screen
//   ?shot=loss  — a dull pilot loses to a sharp rival: the defeat screen
import { createWorld, endTurn, resolvePlannedTurn, startGame } from './world.js';

const PLAY_TURNS = 9;
const MAX_TURNS = 60;
const MAX_TRIES = 12;

/** Run both sides' turns until `stop` says the scene is ready. `stop` is
 * asked before the player's planned turn ('before', fresh embers, nothing
 * played yet this turn) and after it ('after'). */
function simulate(world, playerSkill, aiSkill, stop) {
  let turns = 0;
  while (world.screen === 'play' && turns < MAX_TURNS) {
    if (world.side === 'player') {
      if (stop(world, turns, 'before')) break;
      resolvePlannedTurn(world, 'player', playerSkill);
      if (world.screen !== 'play') break;
      if (stop(world, turns, 'after')) break;
      endTurn(world);
    } else {
      resolvePlannedTurn(world, 'ai', aiSkill);
      if (world.screen !== 'play') break;
      endTurn(world);
    }
    turns += 1;
  }
  return world;
}

/** Copy a staged trial's whole state into the world being shot. */
function adopt(world, trial) {
  for (const key of Object.keys(trial)) world[key] = trial[key];
}

/** A rich mid-game table is rich when both sides hold the table and a hand. */
function richMidGame(world) {
  return world.screen === 'play'
    && world.player.board.length >= 2 && world.ai.board.length >= 2
    && world.player.hand.length >= 3 && world.ai.hand.length >= 3 && world.side === 'player';
}

/**
 * Set `world` to the named scene and return the screen to draw. Any other
 * name is the title screen.
 */
export function stageShot(name, world) {
  if (name === 'title' || (name !== 'play' && name !== 'win' && name !== 'loss')) {
    // The title screen needs no game at all: a fresh world, unstarted.
    return { screen: 'title' };
  }
  if (name === 'play') {
    for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
      const trial = createWorld(world.seed + attempt * 100);
      startGame(trial);
      // Stop at the START of a player turn, embers full and cards glowing:
      // the moment a player actually plays, not the spent aftermath.
      simulate(trial, 0.7, 0.7, (w, turns, when) => when === 'before' && turns >= PLAY_TURNS && richMidGame(w));
      if (richMidGame(trial)) {
        adopt(world, trial);
        return { screen: 'play' };
      }
    }
    // No seed reached a rich table: take the longest-lived trial.
    const trial = createWorld(world.seed);
    startGame(trial);
    simulate(trial, 0.7, 0.7, () => false);
    adopt(world, trial);
    return { screen: world.screen };
  }
  // win / loss: the sharp side must be the one that takes it.
  const want = name === 'win' ? 'win' : 'loss';
  const playerSkill = name === 'win' ? 1.0 : 0.25;
  const aiSkill = name === 'win' ? 0.25 : 1.0;
  for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
    const trial = createWorld(world.seed + attempt * 100);
    startGame(trial);
    simulate(trial, playerSkill, aiSkill, () => false);
    if (trial.screen === want) {
      adopt(world, trial);
      return { screen: want };
    }
  }
  const trial = createWorld(world.seed);
  startGame(trial);
  simulate(trial, playerSkill, aiSkill, () => false);
  adopt(world, trial);
  return { screen: world.screen };
}
