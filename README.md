# Ember Tide — Duel of the Lantern Keepers

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/zhenggangnan33-lang/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/zhenggangnan33-lang/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A turn-based card duel for make.fun's "Make the best card game" bounty. You
are Keeper Asha, duelling the Hollow Mariner Vex for the lantern. Thirty
life each, embers that ramp from 1 to 10, a 28-card deck of guardians and
spells, and a Tide dial that turns every round: Ember and Frost take turns
making their cards cost 1 less.

Four elements form a cycle — Ember beats Gale, Gale beats Frost, Frost beats
Ember, Stone stands apart — and a guardian attacking the element it beats
deals +2 damage. Guardians hold the table (at most four a side) with
keywords — Swift strikes the turn it is played, Guard must be answered
first, Leech heals your hero for the damage it deals. Spells swing a turn:
Spark Volley, Gale Rush, Healing Lantern, Tide Surge. Run out of cards and
fatigue bites for 2, then 4, then 6.

Play with mouse or keyboard (keys 1–7 play a card, Enter ends the turn,
Escape cancels, M mutes). The rival plays a real heuristic game — it looks
for lethal, plays its best-value cards and takes the favourable trades — so
every duel is different. Your record is kept between visits.

Run it with `node serve.ts`, then open http://localhost:8080. Screenshots
are staged by `game/src/shots.js` (`?shot=title|play|win|loss&seed=7`).
