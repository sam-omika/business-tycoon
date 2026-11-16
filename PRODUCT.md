# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary today: Sam, the owner, play-testing on a laptop/desktop browser (and sometimes an iPad).
Intended eventually: the public. People who like management/tycoon games and play in a browser,
possibly installed as an app. They should understand and enjoy the game without anyone explaining it.

## Product Purpose

A turn-based business-building game. You start one small business (a coffee cart with €5,000) and
grow it into a company worth €1,000,000 within 5 years (260 weekly turns). Each turn you make decisions,
open the next week, read the report and adjust. Running out of cash ends the game.
Success: players feel they learned real small-business instincts (margins, bottlenecks, cash buffers,
the value of information) while having fun, and want to play again.

## Positioning

Not a clicker or idle game: every week is a deliberate decision with real-feeling numbers behind it,
balanced by simulation. "Business Tycoon" in general, not a coffee game: coffee is only the first
business type, with more types, multiple businesses, acquisitions and cashing out on the roadmap.

## Operating Context

- Played in sessions of many turns; the core rhythm is decide → "Open next week" → read report → adjust.
- Desktop first (mouse + keyboard shortcuts: Space = next week, letters jump to sections); iPad touch must keep working.
- Hosted at https://sam-omika.github.io/business-tycoon/, installable via a web manifest.
- Saves live in the browser (localStorage).

## Capabilities and Constraints

- Plain HTML/CSS/JS, no framework, no build step, no dependencies; `index.html` (UI) + `engine.js` (rules).
- All game rules live in the engine; UI work must not change game rules or balance.
- Colours only through CSS variables, defined for light and dark mode.
- Touch targets ≥ 40px; hover and keyboard are extras, nothing important may depend on them.
- One game-wide visual identity. Each business type (theme) may only add its own accent colour and icons,
  because themes are data and a new theme must not need new design work.
- Business types today: coffee shop. Planned: bike shop, travel agency (shown as "coming soon").

## Brand Commitments

- Name: **Business Tycoon** (short name "Tycoon"). Not coffee-specific.
- App icon: a generic shop with a striped awning and a rising green chart (`icons/icon.svg`).
- Feel: clear, trustworthy numbers first, with personality in the details. Between a serious management sim
  and a playful tycoon game.

## Evidence on Hand

None yet: no players besides Sam, no reviews, screenshots or press. Do not invent player counts, quotes or ratings.

## Product Principles

1. Numbers must be readable and trustworthy at a glance; the player makes money decisions with them.
2. Every turn is a decision: the UI should make the consequences of last week and the options for next week obvious.
3. Personality lives in the details (moments, wording, small rewards), never at the cost of clarity.
4. Built for growth: one business today, a portfolio of different business types later.
