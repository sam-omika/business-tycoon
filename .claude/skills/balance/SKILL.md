---
name: balance
description: Run the headless balance simulation and compare the results with the targets in docs/BALANCE.md. Use after any change to game numbers, formulas or events.
---

1. Run `npm run sim` (it takes about a minute).
2. Read `docs/BALANCE.md` and compare each strategy's win rate, bankrupt rate and median win week with the targets
   and with the "Latest results" table.
3. Report a short before/after table and say in plain words whether the game got easier, harder, or more lopsided
   (one strategy clearly dominating).
4. If results are off target, propose 1–3 concrete tuning changes (which knob, which direction, why). Don't apply them
   unless I say so.
5. If I accept the new results, update the "Latest results" table in `docs/BALANCE.md`.
