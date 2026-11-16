# Balance

## Targets

The game should reward good play without one obvious winning strategy, and the right decisions should clearly pay off.
Bots in `tools/sim.js` (run `npm run sim [easy|normal|hard]`). "Smart" bots answer decisions sensibly
(`E.suggestDecision`) and buy a maintenance contract; "ignores decisions" always takes the default answer.

| Strategy | easy | normal | hard |
|---|---|---|---|
| Strong play (good/specialty beans, slight markup, full menu, fix bottlenecks) | ~100%, fast | 90%+ in 130–160 weeks | 60–75% |
| Solid but plain play (good beans, exactly fair prices) | ~100% | 60–70% | rarely |
| Ignoring cleaning | clearly worse than solid | clearly worse | fails |
| Ignoring decisions | fine | a bit worse | fails |
| Basic menu / cheap & cheerful / heavy marketing | fail | fail | fail |

Sam's own tests: won the v1 game in week 142. v2 felt harder. Phase 2 (events) was asked for because the mid-game had
too little challenge.

## Latest results (phase 2: event director, decisions, economy, difficulty; 150 games each, 16 Nov 2026)

Win % (median win week in brackets).

| Strategy | Before phase 2 | Easy | Normal | Hard |
|---|---|---|---|---|
| Premium pricing (strong) | 99% (130) | 100% (123) | **100% (135)** | **75% (213)** |
| Good beans, +8% price | 98% (142) | 100% (130) | 98% (147) | 63% (223) |
| Good beans, fair price (plain) | 89% (179) | 100% (142) | **64% (175)** | 6% |
| Specialty from café on | 37% | 96% (173) | 57% (182) | 5% |
| Ignore cleaning | 17% | 30% | 11% | 0% |
| Ignores decisions (+8%, defaults) | — | 100% (133) | 96% (168) | **0%** |
| Basic menu, no extras | 0% | 0% | 0% | 0% |
| Cheap & cheerful | 0% | 0% | 0% | 0% |
| Heavy marketing | 0% | 0% | 0% | 0% |

Notes:
- Normal: strong play still wins but later; plain play at exactly fair prices now wins about two thirds of the time
  (was 89%): events and yearly price rises eat thin margins.
- Decisions: on normal they matter most for thin-margin players (plain play: ~68% answering well vs ~44% ignoring, 50-game
  test); on hard, ignoring them is fatal (0% vs 63%).
- The price-markup advantage is smaller than before (customers punish prices above fair harder: `overpriceSlope` 3.0).
- Odd but harmless: on easy, the "basic menu" bot goes bankrupt more often than on normal (it grows faster into a café
  it cannot fill). It never wins on any level.
- Tuning lessons: a staff raise that compounded every 6 months was a trap (fixed: +4%, max twice, refusing costs
  speed and reputation); events alone could not make hard hard for high-margin play, so hard also has a smaller market.

## Tuning knobs (in `THEMES.coffee` / `computeMix`)

- `qualityPriceBonus` (1.35): how much better beans raise the fair price. Main lever for premium vs. good beans.
- Specialty bean cost (1.05): higher = premium less dominant.
- Menu appeal exponent (0.45) and cap (1.6): how much a broad menu boosts demand.
- Cleanliness: conversion factor (0.6 + 0.4 × c, `cleanWeight`), reputation weight (20%), inspection odds and fines.
- Price sensitivity above fair: `overpriceSlope` (3.0).
- Events: `DIFFICULTY.<level>` (event rate, severity, max bad effects, decision gap, yearly rises, forecast accuracy,
  market size); card weights, effects and cooldowns in `COFFEE_EVENTS`.
- Cashier speed (900/wk), staff limits per location, wages.
- `baseConversion` (0.35), location traffic and rent: overall difficulty.
- Goal (€1M) and `valuationMultiple` (3).
