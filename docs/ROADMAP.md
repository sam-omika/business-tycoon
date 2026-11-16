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

## Next

1. **Move into own hosting** so the link is ours (Netlify or GitHub Pages), with a favicon/app icon and a manifest
   (installable as an app in Chrome/Edge, "Add to Dock" in Safari, home screen on iPad)
2. **Play-test v2 difficulty**: is it too hard for a human? Adjust using `docs/BALANCE.md` targets
3. **Desktop polish**: keyboard shortcuts (e.g. Space/Enter = open next week), hover tooltips that explain numbers,
   a wider layout on big screens (e.g. three columns) so there's less scrolling
4. **Multiple businesses** (the big one):
   - Open a second coffee shop from the shared cash pool
   - Business switcher in the UI; a portfolio overview (all businesses, total value)
   - Managers: a manager runs a shop on autopilot (at a cost), because micromanaging 3 shops isn't fun
   - Roastery as a second business type that supplies your cafés with cheaper beans (shared resources)
5. **Acquisitions**: NPC businesses (e.g. the competitor chain) that you can buy
6. **Cash out**: sell a business at its valuation

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
