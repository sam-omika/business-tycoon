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

## Next

1. **Play-test v2 difficulty**: is it too hard for a human? Adjust using `docs/BALANCE.md` targets
2. **Desktop polish** (keyboard shortcuts done): hover tooltips that explain numbers,
   a wider layout on big screens (e.g. three columns) so there's less scrolling
3. **Multiple businesses** (the big one):
   - Open a second coffee shop from the shared cash pool
   - Business switcher in the UI; a portfolio overview (all businesses, total value)
   - Managers: a manager runs a shop on autopilot (at a cost), because micromanaging 3 shops isn't fun
   - Roastery as a second business type that supplies your cafés with cheaper beans (shared resources)
4. **Acquisitions**: NPC businesses (e.g. the competitor chain) that you can buy
5. **Cash out**: sell a business at its valuation

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
