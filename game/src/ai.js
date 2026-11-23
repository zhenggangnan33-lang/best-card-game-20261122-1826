// Ember Tide — the rival's brain. A heuristic planner: it looks for lethal
// first, then plays its best-value cards, then sends its guardians at the
// right targets. `skill` (0 to 1) is how sharp it is: a sharp rival makes
// the right trades and never wastes a spell, a dull one plays at random and
// throws guardians at the hero's face. The same planner drives both sides
// in staged screenshot games, with different skills.
import { BEATS, MAX_BOARD, TEMPLATE_BY_ID } from './config.js';

/** The tide-discounted cost of a card on this turn. */
export function effectiveCost(template, tide) {
  if (template.element === tide) return Math.max(0, template.cost - 1);
  return template.cost;
}

/** Damage a guardian deals to a target guardian, with the element edge. */
export function attackDamage(attacker, defender) {
  let damage = attacker.attack;
  if (BEATS[attacker.element] === defender.element) damage += 2;
  return damage;
}

/** All the guardians of `side` that must be attacked before the hero. */
export function guardsOf(board) {
  return board.filter((g) => g.keyword === 'guard');
}

/** Total damage `side`'s ready guardians could deal to the hero this turn. */
export function boardDamage(board) {
  return board.filter((g) => g.canAttack).reduce((sum, g) => sum + g.attack, 0);
}

function valueOfGuardian(template, tide) {
  // Raw stats per ember, with a nudge for keywords and tide discounts.
  const cost = Math.max(1, effectiveCost(template, tide));
  let value = (template.attack + template.health) / cost;
  if (template.keyword === 'guard') value += 0.6;
  if (template.keyword === 'swift') value += 0.5;
  if (template.keyword === 'leech') value += 0.4;
  if (template.element === tide) value += 0.3;
  return value;
}

/**
 * Plan one full turn for `side` ('player' or 'ai') and return the actions
 * in the order they should happen: plays first, then attacks.
 *
 * A play is { type: 'play', cardId, target } — the card is found by id when
 * the action is applied, so hand indices going stale as cards leave the
 * hand never matters. An attack is { type: 'attack', uid, target } for a
 * guardian already on the table, or { type: 'attack', summoned, target }
 * for a Swift guardian summoned this very turn, found by its template id.
 * A target is { kind: 'hero', side } or { kind: 'guardian', uid }.
 */
export function planTurn(world, side, skill) {
  const me = world[side];
  const foe = world[side === 'player' ? 'ai' : 'player'];
  const actions = [];
  let embers = me.embers;
  const board = me.board.map((g) => ({ ...g }));
  const hand = [...me.hand];
  const summoned = [];

  // 1. Lethal: can the board plus a Spark Volley end it right now?
  const faceDamage = boardDamage(board);
  if (hand.includes('volley') && faceDamage + 3 >= foe.life && effectiveCost(TEMPLATE_BY_ID.volley, world.tide) <= embers) {
    actions.push({ type: 'play', cardId: 'volley', target: { kind: 'hero', side: side === 'player' ? 'ai' : 'player' } });
    return actions;
  }
  if (faceDamage < foe.life || !board.some((g) => g.canAttack)) {
    // 2. Play cards, best value first, while embers and board room last.
    const playable = hand
      .map((id) => ({ id, template: TEMPLATE_BY_ID[id] }))
      .filter((c) => effectiveCost(c.template, world.tide) <= embers)
      .sort((a, b) => valueOfGuardian(b.template, world.tide) - valueOfGuardian(a.template, world.tide));
    for (const card of playable) {
      const cost = effectiveCost(card.template, world.tide);
      if (cost > embers) continue;
      if (card.template.kind === 'guardian' && board.length >= MAX_BOARD) continue;
      let play = false;
      let target = null;
      if (card.template.kind === 'guardian') {
        // Play a guardian when it is good value; a dull rival sometimes
        // holds a good card for no reason.
        play = valueOfGuardian(card.template, world.tide) >= 1.6 || world.rng() < skill * 0.5;
        if (play && world.rng() < (1 - skill) * 0.45) play = false;
      } else if (card.id === 'volley') {
        // Burn the face when the rival is low, or remove a big threat. A
        // dull rival sometimes just fires it at the face for nothing.
        const big = foe.board.filter((g) => g.attack >= 4 || g.health >= 5).sort((a, b) => b.attack - a.attack)[0];
        if (foe.life <= 8) { play = true; target = { kind: 'hero', side: side === 'player' ? 'ai' : 'player' }; }
        else if (big && world.rng() < skill) { play = true; target = { kind: 'guardian', uid: big.uid }; }
        else if (world.rng() < (1 - skill) * 0.35) { play = true; target = { kind: 'hero', side: side === 'player' ? 'ai' : 'player' }; }
      } else if (card.id === 'lantern') {
        play = me.life <= 18;
      } else if (card.id === 'rush') {
        play = hand.length <= 3;
      } else if (card.id === 'surge') {
        play = foe.board.length >= 2;
      }
      if (play) {
        actions.push({ type: 'play', cardId: card.id, target });
        embers -= cost;
        const at = hand.indexOf(card.id);
        if (at !== -1) hand.splice(at, 1);
        if (card.template.kind === 'guardian') {
          const fresh = { uid: -1, template: card.template, element: card.template.element, attack: card.template.attack, health: card.template.health, keyword: card.template.keyword, canAttack: card.template.keyword === 'swift' };
          board.push(fresh);
          summoned.push(fresh);
        }
      }
    }
  }

  // 3. Attacks: lethal first, then the best trades, then the face. A dull
  // rival often ignores the right target and hits something at random.
  const guards = guardsOf(foe.board);
  const attackers = [...board.filter((g) => g.canAttack)];
  for (const attacker of attackers) {
    const ref = attacker.uid === -1 ? { summoned: attacker.template.id } : { uid: attacker.uid };
    let target;
    if (guards.length > 0) {
      // A Guard must be answered: hit the weakest one we can kill, or the
      // strongest one if we cannot kill any.
      const killable = guards.filter((g) => attackDamage(attacker, g) >= g.health).sort((a, b) => a.health - b.health)[0];
      const chosen = killable ?? guards.sort((a, b) => b.attack - a.attack)[0];
      target = { kind: 'guardian', uid: chosen.uid };
    } else {
      const others = attackers.filter((g) => g !== attacker);
      const remaining = foe.life - boardDamage(others);
      if (attacker.attack >= remaining) {
        target = { kind: 'hero', side: side === 'player' ? 'ai' : 'player' };
      } else {
        // A favourable trade: kill a guardian and live, or kill one that
        // hits harder than we do. Otherwise, go face.
        const prey = foe.board
          .filter((g) => attackDamage(attacker, g) >= g.health && g.attack <= attacker.health)
          .sort((a, b) => (b.attack + b.health) - (a.attack + a.health))[0];
        if (prey && world.rng() < 0.35 + skill * 0.65) {
          target = { kind: 'guardian', uid: prey.uid };
        } else {
          target = { kind: 'hero', side: side === 'player' ? 'ai' : 'player' };
        }
      }
    }
    if (world.rng() < (1 - skill) * 0.6) {
      // A blunder: a random legal target instead of the right one.
      const options = guards.length > 0
        ? guards.map((g) => ({ kind: 'guardian', uid: g.uid }))
        : [...foe.board.map((g) => ({ kind: 'guardian', uid: g.uid })), { kind: 'hero', side: side === 'player' ? 'ai' : 'player' }];
      target = options[Math.floor(world.rng() * options.length)];
    }
    actions.push({ type: 'attack', ...ref, target });
  }
  return actions;
}
