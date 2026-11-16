# Business Tycoon

Grow a small business into a €1M company in 5 years (starting with a coffee cart; more business types to come). Turn-based, plays in the browser. Desktop first, also works on an iPad.

## Play locally

```bash
npm run dev
```

Open http://localhost:5173. On your iPad (same Wi-Fi), open `http://<your-computer-ip>:5173`.
The server prints the address to use.

## Check the balance

```bash
npm run sim
```

Plays ~150 games per bot strategy and prints win rates. Targets are in `docs/BALANCE.md`.

## Play online

**https://sam-omika.github.io/business-tycoon/**

Hosted on GitHub Pages from the `main` branch: every push to `main` goes live within a minute or two.
It's a static site, so any static host would work too.

Install it as an app (own window and icon):

- **Chrome / Edge**: install icon at the right of the address bar
- **Safari on Mac**: File → **Add to Dock**
- **iPad**: Safari → Share → **Add to Home Screen**

Saves live in the browser (`localStorage`), per device and per web address.

## Keyboard shortcuts

**Space** next week · **M** Menu · **T** Team · **I** Invest · **B** Bank · **P** Progress · **?** list · **Esc** close pop-up

## App icon

Edit `icons/icon.svg`, then run `node tools/make-icons.js` to regenerate the PNG sizes (needs Google Chrome).

## Project layout

```
index.html        UI (markup, styles, rendering)
engine.js         game rules, themes, simulation (no UI)
manifest.webmanifest  app name, colours and icons (for installing)
icons/            app icon (SVG source + generated PNGs)
tools/sim.js      headless balance simulation
tools/make-icons.js  renders icons/icon.svg into PNGs
docs/             design, balance, roadmap, decisions, history
CLAUDE.md         instructions for Claude Code
.claude/skills/   project slash commands (/balance, /wrapup)
```
