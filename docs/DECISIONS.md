# Decisions

Short log of design and technical decisions. Newest at the bottom. Format: what — why.

1. **Web game (HTML/JS), not a native iPad app**: runs in Safari, no Mac/Xcode/App Store needed, easy to share.
2. **Turn-based (one week per turn), not real-time**: easier to build and balance, suits a tablet, no "while you were away" logic.
3. **Vanilla JS, no framework or build step**: simple to host anywhere and easy to change. Revisit if the UI grows a lot.
4. **Engine separate from UI** (`engine.js` vs `index.html`): rules can be tested headless and balanced with bots.
5. **Multi-business data model from day one** (`player` + `businesses[]`): the big expansion shouldn't need a rewrite.
6. **Themes as data**: new business types are mostly config.
7. **Coffee shop as the first theme**: intuitive economics, and natural neighbours (roastery, bakery) for later synergy.
8. **Goal = company value (not revenue)**: ties in with the later "cash out" and acquisition features.
9. **Predictable events are announced a week ahead**: Sam's feedback that news came too late to react to. Surprises still exist.
10. **Information is something you buy** (POS, marketing analytics): makes marketing a measurable decision instead of a guess.
11. **Menu replaces the single price; staff split into roles**: more real decisions (bottleneck at bar vs. register, cleanliness).
12. **Owner counts as 1 barista + 1 cashier + some cleaning**: a solo cart is playable without hiring.
13. **Balance by simulation**: every economy change is checked with `npm run sim` against the targets in BALANCE.md.
14. **Desktop first, iPad still works** (Nov 2026): Sam mainly plays on a laptop now. Optimise for mouse/keyboard and big
    screens (shortcuts, tooltips, wider layout), but keep touch targets and no hover-only features so the iPad keeps working.
    Still a website, not a native desktop app: no extra tooling needed.
15. **Hosting on GitHub Pages, public repo** (Nov 2026): free, no extra account (already on GitHub), push = deploy.
    Public is fine for a test project. Installable via a web manifest; no service worker/offline yet (not needed on desktop).
16. **Name and icon are "Business Tycoon", not coffee-specific** (Nov 2026): coffee is only the first theme. Icon is a
    generic shop (awning + rising chart). Coffee visuals stay inside the coffee theme only.
17. **Keyboard: Space only for "next week", letters to jump, pop-ups start on the safe button** (Nov 2026): Enter is too
    easy to hit by accident and already presses buttons in pop-ups. Holding Space advances one week, not many; Space does
    nothing while a pop-up is open, so you can't skip past a win/bankrupt screen or confirm "Start over?" by accident.
18. **Visual identity: "Live Tiles"** (Nov 2026): Sam wanted to move away from the generic AI look (cream cards, serif,
    terracotta). Picked through a design direction round: flat colour tiles, giant lowercase light type (Selawik, the
    open-source Segoe-compatible font, self-hosted), black or white ground, no rounded corners. Only one tile per screen is
    filled with the business colour ("open next week"); profit fills green/red as state; locked things are struck through.
    The business colour comes from theme data (`THEMES.<id>.color`), so new business types only add a colour.
19. **Own digit font "Tycoon Figures"** (Nov 2026): Selawik's digits differ in width, so number columns wobbled. Instead of
    borrowing digits from a system font (mixes two typefaces inside one number), we made equal-width copies of Selawik's own
    digits (`tools/make-figures.py`, allowed by the font licence under a new name). Sam chose polish over the quick fix.
20. **One-screen cockpit layout** (Nov 2026): Sam's feedback on the first Live Tiles version: titles far too big, too much
    scrolling, no overview. A game needs everything at a glance. Now: slim top bar, three panes (status / decisions /
    insight) with tabs, small section labels; the page never scrolls on desktop and iPad landscape. The tile look stays.
21. **Fix the flat mid-game with decisions, not spectacle** (Nov 2026): order agreed with Sam: insights + endless play →
    newspaper, decision events, difficulty levels → owner time → managers/CEO/second business. The turn timer will be
    **optional** (a calm planning game shouldn't force stress on everyone), and "watch the week" a **short optional
    replay** (5 minutes × 260 weeks would be ~20 hours of watching).
22. **Goal is the player's choice; playing on is allowed** (Nov 2026): goals €250k–€5M (default €1M). After winning or
    when time is up, "keep playing" sets `state.endless`: no goal check, no time limit, bankruptcy still applies.
23. **Events are data cards paced by a director** (Nov 2026): instead of flat 15%/20% chances, a director paces major
    events by calm weeks (a breather after a big one), caps bad effects running at once, and offers one decision at a
    time. Odds depend on the player's situation (old machine, overworked staff, dirty shop, success attracts rivals) so
    events feel earned, not random. Every week has weather with an uncertain forecast.
24. **The world gets more expensive as years pass** (Nov 2026): yearly wage, supplier and price rises and a rent review,
    like a real business. Sam asked for real-world pressure as you grow.
25. **Difficulty = event pressure + economy + market size** (Nov 2026): events alone could not make "hard" hard for
    high-margin play, so hard also has a smaller market (82%). Targets per level are in BALANCE.md.
