# Business Tycoon

A turn-based business-building game, played in the browser. **Desktop first** (laptop/monitor, mouse + keyboard),
and it must **keep working on an iPad** (Safari, touch).
The player picks a theme (only **coffee shop** exists so far), starts with a cart and €5,000, and must
grow a company worth **€1,000,000 within 5 years (260 weekly turns)**. Running out of cash = game over.

The long-term vision: several businesses per player, shared resources between them, acquisitions,
and cashing out. See `docs/ROADMAP.md`.

## Who I am / how to work with me

- I'm Sam, the owner of this project. I'm not a full-time game developer: explain trade-offs briefly and in plain words.
- Prefer simple and practical over clever. Direct answers, no long preambles.
- For anything bigger than a small fix: propose a short plan first, then build.
- I mainly play on desktop. Every UI change must work at desktop sizes, still work with touch on an iPad, in light and dark mode.

## Run it

- `npm run dev`: local server at http://localhost:5173. On the iPad (same Wi-Fi): http://<laptop-ip>:5173
- `npm run sim`: headless balance simulation (plays ~150 games per strategy, prints win rates)
- No build step, no framework, no dependencies. Plain HTML/CSS/JS.

## Architecture (keep these rules)

- `engine.js`: **all game rules**, no DOM. Works in browser (`window.TycoonEngine`) and Node (`module.exports`).
  - `tick(state, rand)` simulates one week and returns a **new** state. Never mutate the input.
  - Player actions live in `Actions.*` and return `{ state, error }`. Errors are short, player-facing sentences.
  - **Themes are data** (`THEMES.coffee`): locations, machines, supplies, products, roles, equipment, systems, events.
    Adding a theme should mostly mean adding data, not new code.
  - The state is **multi-business from day one**: `state.player` (cash, loan) is shared, `state.businesses[]` holds each business.
    The UI currently only shows `businesses[0]`.
  - Save compatibility: when the state shape changes, update `migrate(state)` so old saves keep working, and bump `state.version`.
- `index.html`: UI only (markup, CSS, rendering, event handlers). It reads state and calls `Actions`/`tick`. No game rules here.
- `tools/sim.js`: balance simulation with bot strategies. Uses the same engine.
- Saves are in `localStorage` (key `business-tycoon-save-v1`), theme choice under `tycoon-theme`. Always wrap in try/catch.

## Conventions

- Vanilla JS, 2-space indent, single quotes, no build tools. Keep `index.html` + `engine.js` loadable as static files.
- Money is euros, shown like `€1,250` (`toLocaleString('en')`).
- Colors only through CSS variables (`--bg`, `--card`, `--ink`, `--muted`, `--line`, `--accent`, `--good`, `--bad`, …), defined for light **and** dark.
- Touch targets ≥ 40px (the iPad must keep working). Hover tooltips and keyboard shortcuts are welcome as extras,
  but nothing important may be hover-only or keyboard-only. No `alert/confirm/prompt`; use the in-page `modal()` and `toast()`.
- Layout: two columns ≥ 900px wide, single column below (card order via `.o1`…`.o10` classes).

## Workflow rules

- **After any change to the economy** (numbers, formulas, events): run `npm run sim` and compare with the targets in
  `docs/BALANCE.md`. Report the before/after table. Update `docs/BALANCE.md` with the new results.
- After a feature: check it in the browser at desktop sizes (1440×900, 1920×1080) plus one iPad size
  (1180×820 landscape), light and dark.
- Record important design decisions in `docs/DECISIONS.md` (one short entry: what, why).
- Keep `docs/ROADMAP.md` current: move items to "Done", add new ideas I mention to the backlog.
- Commit in small steps with clear messages. Don't push or deploy unless I ask.

## Project docs (read when relevant)

- `docs/GAME_DESIGN.md`: how the game works, mechanics and formulas
- `docs/BALANCE.md`: balance targets and latest simulation results
- `docs/ROADMAP.md`: done, next, backlog
- `docs/DECISIONS.md`: why things are the way they are
- `docs/HISTORY.md`: how the game was built so far (prototype phase in Claude chat)

## Project slash commands

- `/balance`: run the simulation and compare against the targets
- `/wrapup`: end-of-session: update roadmap, decisions, history, and commit
