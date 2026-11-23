// Ember Tide — decks: build, shuffle, draw, fatigue. A deck is two copies
// of every card template (28 cards). Drawing from an empty deck hurts:
// fatigue damage grows by 2 each empty draw, as in the classic duels.
import { CARD_TEMPLATES, FATIGUE_DAMAGE, MAX_HAND } from './config.js';
import { shuffle } from './random.js';

/** A fresh shuffled 28-card deck: two copies of each template. */
export function buildDeck(rng) {
  const deck = [];
  for (const template of CARD_TEMPLATES) {
    deck.push(template.id, template.id);
  }
  return shuffle(deck, rng);
}

/**
 * Draw one card for `hero` (a side's state). Returns the drawn template id,
 * or null when the deck is empty — in that case fatigue bites instead.
 */
export function drawCard(hero, rng) {
  if (hero.deck.length === 0) {
    hero.fatigue += 1;
    const damage = FATIGUE_DAMAGE * hero.fatigue;
    hero.life -= damage;
    return { drawn: null, fatigue: damage };
  }
  const id = hero.deck.pop();
  if (hero.hand.length < MAX_HAND) hero.hand.push(id);
  return { drawn: id, fatigue: 0 };
}

/** How many cards a side still holds in its deck. */
export function deckCount(hero) {
  return hero.deck.length;
}
