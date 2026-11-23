// Ember Tide — shared constants, elements and the card catalogue.
// The game is a turn-based card duel: two lantern keepers, 30 life each,
// embers (energy) that ramp 1 to 10, 28-card decks, guardians that hold the
// table and spells that swing a turn. Four elements form a cycle — Ember
// beats Gale, Gale beats Frost, Frost beats Ember, Stone stands apart — and
// the Tide dial makes one element cheaper every turn.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const START_LIFE = 30;
export const MAX_EMBERS = 10;
export const MAX_HAND = 7;
export const MAX_BOARD = 4;
export const START_HAND = 5;
export const FATIGUE_DAMAGE = 2;

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#f76707', dark: '#a61e00', light: '#ffd8a8', glyph: 'flame' },
  frost: { name: 'Frost', color: '#339af0', dark: '#1864ab', light: '#a5d8ff', glyph: 'flake' },
  gale: { name: 'Gale', color: '#69db7c', dark: '#2b8a3e', light: '#b2f2bb', glyph: 'wind' },
  stone: { name: 'Stone', color: '#adb5bd', dark: '#495057', light: '#e9ecef', glyph: 'rock' },
};

// Which element an attacker beats: a guardian attacking a guardian of the
// element it beats deals +2 damage. Stone beats nothing and is beaten by
// nothing.
export const BEATS = { ember: 'gale', gale: 'frost', frost: 'ember', stone: null };

// The Tide dial alternates between these two elements. Cards of the tide's
// element cost 1 less ember, and guardians of that element hold +1 health.
export const TIDES = ['ember', 'frost'];

export const KEYWORDS = {
  swift: 'Swift — can attack the turn it is played.',
  guard: 'Guard — enemies must attack this guardian first.',
  leech: 'Leech — your hero heals for the damage this guardian deals.',
};

// Every card template. A deck holds two copies of each one (28 cards).
// kind: 'guardian' holds the table with attack/health; 'spell' resolves
// at once. target: what the card needs when played (null = no target).
export const CARD_TEMPLATES = [
  { id: 'imp', short: 'Imp', name: 'Ember Imp', element: 'ember', kind: 'guardian', cost: 1, attack: 2, health: 1, keyword: 'swift', text: 'A spark with teeth.' },
  { id: 'wisp', short: 'Wisp', name: 'Frost Wisp', element: 'frost', kind: 'guardian', cost: 1, attack: 1, health: 3, keyword: null, text: 'Cold that hums.' },
  { id: 'sparrow', short: 'Sparrow', name: 'Gale Sparrow', element: 'gale', kind: 'guardian', cost: 2, attack: 2, health: 2, keyword: 'swift', text: 'Faster than the wind it rides.' },
  { id: 'golem', short: 'Golem', name: 'Stone Golem', element: 'stone', kind: 'guardian', cost: 3, attack: 2, health: 5, keyword: 'guard', text: 'It has never once hurried.' },
  { id: 'serpent', short: 'Serpent', name: 'Tide Serpent', element: 'frost', kind: 'guardian', cost: 3, attack: 3, health: 4, keyword: null, text: 'The tide, given a spine.' },
  { id: 'drake', short: 'Drake', name: 'Ember Drake', element: 'ember', kind: 'guardian', cost: 4, attack: 4, health: 3, keyword: null, text: 'Its breath lights the harbour.' },
  { id: 'roc', short: 'Roc', name: 'Gale Roc', element: 'gale', kind: 'guardian', cost: 4, attack: 3, health: 4, keyword: 'swift', text: 'Its wings are the storm.' },
  { id: 'leviathan', short: 'Leviathan', name: 'Frost Leviathan', element: 'frost', kind: 'guardian', cost: 5, attack: 5, health: 5, keyword: null, text: 'The deep, surfacing.' },
  { id: 'colossus', short: 'Colossus', name: 'Stone Colossus', element: 'stone', kind: 'guardian', cost: 6, attack: 6, health: 7, keyword: 'guard', text: 'A mountain that learned to walk.' },
  { id: 'phoenix', short: 'Phoenix', name: 'Ember Phoenix', element: 'ember', kind: 'guardian', cost: 6, attack: 6, health: 4, keyword: 'leech', text: 'It burns, and the burning heals.' },
  { id: 'volley', short: 'Volley', name: 'Spark Volley', element: 'ember', kind: 'spell', cost: 2, target: 'any', text: 'Deal 3 damage to any target.' },
  { id: 'rush', short: 'Rush', name: 'Gale Rush', element: 'gale', kind: 'spell', cost: 1, target: null, text: 'Draw 2 cards.' },
  { id: 'lantern', short: 'Lantern', name: 'Healing Lantern', element: 'stone', kind: 'spell', cost: 2, target: null, text: 'Restore 6 life to your hero.' },
  { id: 'surge', short: 'Surge', name: 'Tide Surge', element: 'frost', kind: 'spell', cost: 3, target: null, text: 'Deal 2 damage to all enemy guardians.' },
];

export const TEMPLATE_BY_ID = Object.fromEntries(CARD_TEMPLATES.map((t) => [t.id, t]));

// The two duelists. Asha is the player; Vex is the AI rival.
export const HEROES = {
  player: { name: 'Keeper Asha', title: 'Lantern Keeper of the Ember Tide', color: '#f76707' },
  ai: { name: 'Mariner Vex', title: 'The Hollow Mariner', color: '#339af0' },
};
