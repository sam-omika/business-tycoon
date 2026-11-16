# Roadmap

## Done (prototype phase, built in Claude chat)

- v1: coffee cart → flagship café, single price, baristas, beans, marketing, location/machine upgrades, bank loan
- Random events; predictable ones are announced a week ahead
- POS and marketing analytics systems that reveal where customers come from
- v2: menu with per-item prices (espresso, cappuccino, latte, flat white, cold brew, croissant) and unlocks
- v2: staff roles: baristas (bar), cashiers (register), cleaners (cleanliness + health inspections)
- Progress card: charts over the whole game + year-by-year table
- Dark mode (auto / light / dark)
- Balance simulation tool

## Done (Claude Code)

- Own hosting on GitHub Pages: https://sam-omika.github.io/business-tycoon/ (public repo, push to `main` = deploy)
- App icon + web manifest: installable in Chrome/Edge, Safari "Add to Dock", iPad home screen
- Switched target to desktop first, iPad still supported
- Keyboard shortcuts: Space = next week, M/T/I/B/P jump to cards, ? = list, Esc closes pop-ups
- New look "Live Tiles": flat tiles, giant lowercase type, tiles flip each week, business colour per theme
- Equal-width digits ("Tycoon Figures", built from Selawik) so numbers line up
- One-screen cockpit: three panes with tabs, no page scrolling on desktop / iPad landscape
- Phase 1: Sales insights tab (per-product popularity, cost, margin, share of profit; where the money goes)
- Phase 1: pick your goal (€250k to €5M) and keep playing after winning or when time is up

## Next

Agreed plan (16 Nov 2026) to fix "the mid-game has too little challenge":

1. **Phase 2: real challenge** (the main fix)
   - The newspaper: a weekly paper with many more kinds of events (roadworks, weather, local events, strikes, price rises,
     a competitor's sale, a viral review…), some lasting several weeks
   - Events that ask for a decision (e.g. roadworks for 3 weeks: run a discount, put up signs, or do nothing?)
   - Difficulty levels easy / normal / hard: event frequency and severity, starting cash, competition; own balance targets
2. **Phase 3: your own time and opening hours**: limited owner hours per week (serving, cleaning, admin, buying), set
   opening hours (more customers vs. wages and your time). Foundation for hiring people to free your time
3. **Phase 4: managers, CEO, second business** (merges with "multiple businesses"):
   - Managers and a CEO who follows rules you set; monthly/quarterly review meetings
   - Once a business runs without you, start a second one; business switcher and portfolio overview
   - Roastery as a second business type that supplies your cafés (shared resources)
4. **Phase 5 (optional, later)**: turn timer as an option (e.g. on in hard), with things you can earn that slow it down;
   "watch the week" as a short optional replay (20–60 s, skippable)
5. **Play-test difficulty** along the way, using `docs/BALANCE.md` targets
6. **Desktop polish**: hover tooltips that explain numbers
7. **Acquisitions**: NPC businesses (e.g. the competitor chain) that you can buy
8. **Cash out**: sell a business at its valuation

## Backlog / ideas

- Loyalty programme upgrade (grows word of mouth; builds on the POS)
- More themes: bike shop, travel agency (theme = data in `THEMES`)
- Staff morale / training, part-time staff for festivals
- Seasonal menu items, limited-time specials
- Stockpiling beans before a forecast price spike
- Achievements, difficulty levels, high-score list
- Sound and small animations (tap to start for iOS audio)
- Export/import save (e.g. to move a save between devices or from the old Claude chat version)
- Offline play (service worker); less important now that desktop is the main target
- Real desktop app (.app/.exe wrapper around the same code); only if a browser tab stops being enough
- Line-icon set in the tile style for products, staff and upgrades (emoji were removed in the redesign)
