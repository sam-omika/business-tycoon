# Business Tycoon ☕

Build a coffee cart into a €1M company in 5 years. Turn-based, plays in the browser. Desktop first, also works on an iPad.

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

## Put it online

It's a static site (`index.html` + `engine.js`), so any static host works:

- **Netlify**: drag the project folder onto https://app.netlify.com/drop
- **GitHub Pages**: push to GitHub, then Settings → Pages → deploy from the `main` branch

On the iPad, open the link in Safari → Share → **Add to Home Screen**.

## Project layout

```
index.html        UI (markup, styles, rendering)
engine.js         game rules, themes, simulation (no UI)
tools/sim.js      headless balance simulation
docs/             design, balance, roadmap, decisions, history
CLAUDE.md         instructions for Claude Code
.claude/skills/   project slash commands (/balance, /wrapup)
```
