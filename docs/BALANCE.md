# Balance

## Targets

The game should reward good play without one obvious winning strategy.

| Strategy (bot in `tools/sim.js`) | Target |
|---|---|
| Strong play (good or specialty beans, slight markup, full menu, fix bottlenecks) | wins 90%+, in ~2.5–3 years (130–160 weeks) |
| Solid but plain play (good beans, exactly fair prices) | wins most of the time, ~3–3.5 years |
| Ignoring cleaning | clearly worse than solid play |
| Basic menu, no equipment or systems | rarely or never wins |
| Competing on price (cheap beans, low prices) | fails |
| Heavy marketing (20% of revenue) | fails |

Sam's own test: won the v1 game (single product) in week 142. The v2 game (menu + roles) feels much harder;
still being play-tested to see whether it's too hard.

## Latest results (v2: menu, roles, equipment; 150 games each)

| Strategy | Win | Bankrupt | Time's up | Median win week |
|---|---|---|---|---|
| Premium pricing (specialty beans, +12%) | 100% | 0% | 0% | 132 |
| Good beans, +8% price | 97% | 3% | 0% | 146 |
| Good beans throughout (fair price) | 87% | 6% | 7% | 179 |
| Specialty beans from café on (fair price) | 38% | 41% | 21% | 228 |
| Ignore cleaning | ~20% | ~40% | ~40% | ~240 |
| Basic menu, no extras | 0% | 63% | 37% | – |
| Cheap & cheerful | 0% | 100% | 0% | – |
| Heavy marketing | 0% | 100% | 0% | – |

Notes:
- Switching to specialty beans at fair price is risky: margins drop unless prices go up too.
- The café move (€45k, rent ×3) is the most dangerous moment; bots with a €5k buffer often go bankrupt there.

## Tuning knobs (in `THEMES.coffee` / `computeMix`)

- `qualityPriceBonus` (1.35): how much better beans raise the fair price. Main lever for premium vs. good beans.
- Specialty bean cost (1.05): higher = premium less dominant.
- Menu appeal exponent (0.45) and cap (1.6): how much a broad menu boosts demand.
- Cleanliness: conversion factor (0.75 + 0.25 × c), reputation weight (20%), inspection weight (3).
- Cashier speed (900/wk), staff limits per location, wages.
- `baseConversion` (0.35), location traffic and rent: overall difficulty.
- Goal (€1M) and `valuationMultiple` (3).
