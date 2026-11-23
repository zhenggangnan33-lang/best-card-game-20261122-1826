// Ember Tide — the game itself: state, turns, combat, win and loss.
// A world is plain data; every rule lives here so the interactive game, the
// scripted autopilot and the screenshot staging all play the same game.
import {
  BEATS, HEROES, MAX_BOARD, MAX_EMBERS, START_HAND, START_LIFE, TEMPLATE_BY_ID, TIDES,
} from './config.js';
import { buildDeck, drawCard } from './deck.js';
import { attackDamage, effectiveCost, guardsOf, planTurn } from './ai.js';
import { makeRng } from './random.js';

let nextUid = 1;

/** A fresh world for `seed`: shuffled decks, empty table, title screen. */
export function createWorld(seed) {
  const rng = makeRng(seed);
  const world = {
    seed,
    rng,
    screen: 'title',
    turn: 0,
    side: 'player',
    tide: TIDES[0],
    player: newSide(rng),
    ai: newSide(rng),
    log: [],
    selected: null,
    targetMode: null,
    winner: null,
    turnsPlayed: 0,
    cardsPlayed: 0,
    damageDealt: 0,
  };
  return world;
}

function newSide(rng) {
  return {
    life: START_LIFE,
    embers: 0,
    maxEmbers: 0,
    deck: buildDeck(rng),
    hand: [],
    board: [],
    fatigue: 0,
  };
}

/** A guardian on the table, fresh from its card. */
export function summonGuardian(template) {
  const guardian = {
    uid: nextUid,
    template,
    element: template.element,
    attack: template.attack,
    health: template.health,
    maxHealth: template.health,
    keyword: template.keyword,
    canAttack: template.keyword === 'swift',
    justPlayed: true,
  };
  nextUid += 1;
  return guardian;
}

/** Deal the opening hands and start the first turn. The second player draws
 * one extra card, the usual compensation for going second. */
export function startGame(world) {
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(world.player, world.rng);
    drawCard(world.ai, world.rng);
  }
  drawCard(world.ai, world.rng);
  world.screen = 'play';
  world.turn = 1;
  world.side = 'player';
  beginTurn(world, 'player');
  addLog(world, `${HEROES.player.name} and ${HEROES.ai.name} take their seats. The tide is ${world.tide}.`);
}

function addLog(world, text) {
  world.log.unshift(text);
  if (world.log.length > 5) world.log.length = 5;
}

/** Begin a side's turn: ember ramps, tide turns, a card is drawn. */
export function beginTurn(world, side) {
  const hero = world[side];
  hero.maxEmbers = Math.min(MAX_EMBERS, hero.maxEmbers + 1);
  hero.embers = hero.maxEmbers;
  world.tide = TIDES[(world.turn - 1) % TIDES.length];
  for (const guardian of hero.board) {
    guardian.canAttack = true;
    guardian.justPlayed = false;
  }
  const result = drawCard(hero, world.rng);
  if (result.fatigue > 0) {
    addLog(world, `${side === 'player' ? HEROES.player.name : HEROES.ai.name} draws from an empty deck and takes ${result.fatigue} fatigue.`);
    checkEnd(world);
  }
  world.side = side;
}

/** The ember cost of a card in hand, tide discount included. */
export function cardCost(world, template) {
  return effectiveCost(template, world.tide);
}

/** Whether `side` may play the card at `handIndex` right now. */
export function canPlayCard(world, side, handIndex) {
  if (world.screen !== 'play' || world.side !== side) return false;
  const hero = world[side];
  const template = TEMPLATE_BY_ID[hero.hand[handIndex]];
  if (!template) return false;
  if (cardCost(world, template) > hero.embers) return false;
  if (template.kind === 'guardian' && hero.board.length >= MAX_BOARD) return false;
  return true;
}

/**
 * Play the card at `handIndex` for `side`. `target` is needed for Spark
 * Volley: { kind: 'hero', side } or { kind: 'guardian', uid }. Returns true
 * when the card was played.
 */
export function playCard(world, side, handIndex, target) {
  if (!canPlayCard(world, side, handIndex)) return false;
  const me = world[side];
  const foe = world[side === 'player' ? 'ai' : 'player'];
  const template = TEMPLATE_BY_ID[me.hand[handIndex]];
  me.embers -= cardCost(world, template);
  me.hand.splice(handIndex, 1);
  world.cardsPlayed += 1;
  const who = side === 'player' ? HEROES.player.name : HEROES.ai.name;

  if (template.kind === 'guardian') {
    const guardian = summonGuardian(template);
    // A guardian of the tide's element holds one extra health.
    if (template.element === world.tide) {
      guardian.health += 1;
      guardian.maxHealth += 1;
    }
    me.board.push(guardian);
    addLog(world, `${who} summons ${template.name} (${template.attack}/${guardian.health}).`);
    return true;
  }

  if (template.id === 'volley') {
    const damage = 3;
    if (target && target.kind === 'hero') {
      hurtHero(world, target.side, damage);
    } else if (target && target.kind === 'guardian') {
      const foeBoard = target.side === 'player' ? world.player.board : world.ai.board;
      hurtGuardian(world, foeBoard, target.uid, damage);
    } else {
      hurtHero(world, side === 'player' ? 'ai' : 'player', damage);
    }
    addLog(world, `${who} casts Spark Volley for ${damage}.`);
  } else if (template.id === 'rush') {
    drawCard(me, world.rng);
    drawCard(me, world.rng);
    addLog(world, `${who} draws 2 cards on the Gale Rush.`);
  } else if (template.id === 'lantern') {
    me.life = Math.min(START_LIFE, me.life + 6);
    addLog(world, `${who} lights the Healing Lantern (+6 life).`);
  } else if (template.id === 'surge') {
    for (const guardian of [...foe.board]) {
      hurtGuardian(world, foe.board, guardian.uid, 2);
    }
    addLog(world, `${who} calls the Tide Surge over the enemy table.`);
  }
  checkEnd(world);
  return true;
}

function hurtHero(world, side, damage) {
  const hero = world[side];
  hero.life -= damage;
  world.damageDealt += damage;
}

function hurtGuardian(world, board, uid, damage) {
  const guardian = board.find((g) => g.uid === uid);
  if (!guardian) return;
  guardian.health -= damage;
  const index = board.indexOf(guardian);
  if (guardian.health <= 0) board.splice(index, 1);
}

/** Whether `side`'s guardian `uid` may attack `target` right now. */
export function canAttack(world, side, uid, target) {
  if (world.screen !== 'play' || world.side !== side) return false;
  const me = world[side];
  const guardian = me.board.find((g) => g.uid === uid);
  if (!guardian || !guardian.canAttack) return false;
  const foe = world[side === 'player' ? 'ai' : 'player'];
  const guards = guardsOf(foe.board);
  if (target.kind === 'hero' && guards.length > 0) return false;
  if (target.kind === 'guardian') {
    const victim = foe.board.find((g) => g.uid === target.uid);
    if (!victim) return false;
    if (guards.length > 0 && victim.keyword !== 'guard') return false;
  }
  return true;
}

/** Resolve one guardian attack. Returns true when it happened. */
export function attack(world, side, uid, target) {
  if (!canAttack(world, side, uid, target)) return false;
  const me = world[side];
  const foe = world[side === 'player' ? 'ai' : 'player'];
  const attacker = me.board.find((g) => g.uid === uid);
  attacker.canAttack = false;
  if (target.kind === 'hero') {
    const damage = attacker.attack;
    hurtHero(world, side === 'player' ? 'ai' : 'player', damage);
    if (attacker.keyword === 'leech') {
      me.life = Math.min(START_LIFE, me.life + damage);
      addLog(world, `${attacker.template.name} leeches ${damage} life back.`);
    }
    addLog(world, `${attacker.template.name} strikes the hero for ${damage}.`);
  } else {
    const victim = foe.board.find((g) => g.uid === target.uid);
    const damage = attackDamage(attacker, victim);
    const back = attackDamage(victim, attacker);
    const edge = BEATS[attacker.element] === victim.element ? ' (element edge!)' : '';
    hurtGuardian(world, foe.board, victim.uid, damage);
    hurtGuardian(world, me.board, attacker.uid, back);
    if (attacker.keyword === 'leech') {
      me.life = Math.min(START_LIFE, me.life + damage);
    }
    addLog(world, `${attacker.template.name} hits ${victim.template.name} for ${damage}${edge}; ${victim.template.name} answers for ${back}.`);
  }
  checkEnd(world);
  return true;
}

/** End the current side's turn and hand over. */
export function endTurn(world) {
  if (world.screen !== 'play') return;
  world.selected = null;
  world.targetMode = null;
  if (world.side === 'player') {
    world.side = 'ai';
    beginTurn(world, 'ai');
    world.turnsPlayed += 1;
  } else {
    world.side = 'player';
    world.turn += 1;
    beginTurn(world, 'player');
  }
  checkEnd(world);
}

/**
 * Play out the rival's whole turn at once (used by the autopilot and the
 * staged screenshots). Returns the actions it took.
 */
export function resolveAiTurn(world, skill) {
  return resolvePlannedTurn(world, 'ai', skill);
}

/**
 * Apply one planned action for `side`: a play (found by card id) or an
 * attack (a table guardian by uid, or a Swift guardian summoned this turn
 * by its template id). Returns false when the action no longer fits.
 */
export function applyAction(world, side, action) {
  if (action.type === 'play') {
    const handIndex = world[side].hand.indexOf(action.cardId);
    if (handIndex === -1) return false;
    return playCard(world, side, handIndex, action.target);
  }
  let uid = action.uid;
  if (action.summoned !== undefined) {
    const fresh = [...world[side].board].reverse().find((g) => g.template.id === action.summoned && g.justPlayed);
    if (!fresh) return false;
    uid = fresh.uid;
  }
  return attack(world, side, uid, action.target);
}

/** Play out one full turn for `side` with the planner (both sides, shots). */
export function resolvePlannedTurn(world, side, skill) {
  const actions = planTurn(world, side, skill);
  for (const action of actions) {
    if (world.screen !== 'play') break;
    applyAction(world, side, action);
  }
  return actions;
}

/** Set the end screen when a hero's life runs out. */
export function checkEnd(world) {
  if (world.screen !== 'play') return;
  if (world.player.life <= 0 && world.ai.life <= 0) {
    world.winner = world.player.life >= world.ai.life ? 'player' : 'ai';
  } else if (world.player.life <= 0) {
    world.winner = 'ai';
  } else if (world.ai.life <= 0) {
    world.winner = 'player';
  } else {
    return;
  }
  world.screen = world.winner === 'player' ? 'win' : 'loss';
  addLog(world, world.winner === 'player' ? 'The tide is yours — victory!' : 'Mariner Vex claims the lantern.');
}

/** Reset the world to a fresh duel with the same seed. */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  Object.keys(fresh).forEach((key) => { world[key] = fresh[key]; });
}
