---
name: Business Tycoon
description: A turn-based business game drawn as live tiles - flat colour, giant lowercase type, numbers that flip when a week opens.
colors:
  business: "#C2410C"
  ground-light: "#FFFFFF"
  tile-light: "#F1F1F1"
  ink-light: "#0B0B0C"
  muted-light: "#5E5E5E"
  line-light: "#DADADA"
  ground-dark: "#0B0B0C"
  tile-dark: "#1B1B1D"
  ink-dark: "#FFFFFF"
  muted-dark: "#9A9A9A"
  line-dark: "#2C2C2F"
  profit-fill: "#1E7A34"
  loss-fill: "#B3261E"
  good-text-light: "#1E7A34"
  bad-text-light: "#B3261E"
  good-text-dark: "#5BD27A"
  bad-text-dark: "#FF7468"
typography:
  display:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(64px, 11vw, 148px)"
    fontWeight: 300
    lineHeight: 0.92
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(56px, 7.4vw, 104px)"
    fontWeight: 300
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  figure-hero:
    fontFamily: "Tnum, Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(40px, 4.6vw, 64px)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  section:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
  figure-tile:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  figure-mid:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.02em"
  action:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 300
    lineHeight: 1.2
  title:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 300
    lineHeight: 1.4
  body:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  body-lead:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 350
    lineHeight: 1.5
  label:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: "Selawik, 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  hair: "4px"
  gutter: "8px"
  sm: "12px"
  md: "16px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.business}"
    textColor: "{colors.ground-light}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    height: "48px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    height: "48px"
  button-outline-hover:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.ground-light}"
  button-secondary:
    backgroundColor: "{colors.tile-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.none}"
    padding: "10px 16px"
    height: "48px"
  button-next-week:
    backgroundColor: "{colors.business}"
    textColor: "{colors.ground-light}"
    rounded: "{rounded.none}"
    padding: "8px 18px"
    height: "64px"
  tile:
    backgroundColor: "{colors.tile-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.none}"
    padding: "12px 14px 10px"
    height: "116px"
  tile-profit:
    backgroundColor: "{colors.profit-fill}"
    textColor: "{colors.ground-light}"
  tile-loss:
    backgroundColor: "{colors.loss-fill}"
    textColor: "{colors.ground-light}"
  segment-option:
    backgroundColor: "{colors.tile-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.none}"
    padding: "12px"
    height: "92px"
  segment-option-on:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.ground-light}"
  stepper-button:
    backgroundColor: "{colors.tile-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.none}"
    size: "56px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink-light}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "12px 14px"
  toast:
    backgroundColor: "{colors.ink-light}"
    textColor: "{colors.ground-light}"
    rounded: "{rounded.none}"
    padding: "14px 20px"
---

# Design System: Business Tycoon

## Overview

**Creative North Star: "Live Tiles"**

The business is drawn as flat colour tiles and giant lowercase type on a plain black or white ground. Numbers live in tiles; when the player opens the next week, the six stat tiles flip over in a staggered wave and come back with the new values. Headings are not boxes around content: a 40px light lowercase word is the container. Everything is square, borderless and unshadowed, so state is carried entirely by fills: the business colour floods exactly one thing (the "open next week" tile), and profit or loss floods its tile green or red.

The world refuses the cream-card-serif dashboard: no soft cards, no rounded corners, no serif display, no drop-shadowed panels. Density comes from typographic scale contrast (148px name against 13px captions), not from chrome. Personality lives in the motion (the flip, the heading flash, the band pop-up) and in the lowercase voice, while the numbers stay clear and trustworthy.

The visual identity is game-wide. A business type contributes only its colour (`--biz`, set at runtime from theme data) and nothing else; every rule here must hold for any business colour that keeps white text readable.

**Key Characteristics:**
- Black or white ground, light-grey or near-black tiles, no radius anywhere.
- Selawik Light, lowercase for every display and label string; body copy stays sentence case.
- One flooded business-colour tile per screen; green/red floods mean state, never decoration.
- Labels sit under their values.
- Thin square-capped SVG strokes for every icon.
- Depth only on the pop-up band.
- Light and dark are equal citizens (auto / light / dark toggle).

## Colors

A strict monochrome scaffold (ground, tile, ink, muted, line) with one runtime business colour and a green/red state pair.

### Primary
- **Business Colour / Roasted Ember** (`--biz`; coffee theme value in frontmatter `business`): set per theme from engine data. Floods the primary button and the "open next week" tile, fills the goal bar, colours the marketing slice of the customer-source bar, text selection and the input caret. White text sits on it, so a theme colour must keep white legible.
- **Accent** (`--accent`): derived, never chosen. Light mode: `var(--biz)`. Dark mode: `color-mix(in srgb, var(--biz) 62%, #fff)`, so the business colour stays readable as text on near-black. Used for text-level emphasis only: the active progress metric and the heading flash.

### Neutral
- **Paper White / Night Black** (ground): page and bottom-bar background (`--bg`, `--bar-bg`).
- **Tile Grey** (light `tile-light`, dark `tile-dark`): every resting tile, segment option, stepper button, forecast and event panel, and the pop-up band (`--card`).
- **Ink** (`--ink`): text, meter fills, selected segments and themes (ink flood with ground-coloured text), outline-button borders, the 2px rule under report section rows, focus outline, toast and chart tooltip.
- **Muted** (`--muted`): captions, subs, hints, locked names, and the neutral "fair" price state.
- **Line** (`--line`): 1px row dividers, empty meter and goal-bar track, idle input border, unchecked toggle border.
- **Veil** (`rgba(255,255,255,.72)` light / `rgba(0,0,0,.72)` dark): the overlay behind a pop-up band.

### State
- **Profit Green / Loss Red fills** (`profit-fill`, `loss-fill`; same in both modes): flood the last-week tile on profit or loss, the cleanliness tile when it drops below 70%, good/bad pills, and the checked menu toggle. Text on them is white.
- **Good / Bad text** (light `good-text-light`/`bad-text-light`, dark brightened to `good-text-dark`/`bad-text-dark`): positive and negative figures, good/bad event week markers, forecast verdicts, bargain/pricey price squares.

### Named Rules
**The One Flood Rule.** The business colour floods exactly one tile per screen: the action that advances time. Everything else that is selected floods in ink, not in the business colour.

**The Floods Are State Rule.** Green and red fills appear only when a value says so (profit, loss, a failing metric). They are never used to decorate or to group.

**The Derived Accent Rule.** `--accent` is computed from `--biz`, never set by a theme. The "fair" price state is neutral (`--muted`), not a third accent hue.

**The Variables Only Rule.** Every colour comes from a CSS custom property defined for light and dark.

## Typography

**Display Font:** Selawik (self-hosted, SIL OFL, weights 300 / 350 / 400 / 600), with Segoe UI and system-ui fallback
**Body Font:** Selawik
**Figure Font:** `Tnum`, a digits-only `unicode-range` face pulled from local Segoe UI or Helvetica Neue, falling back to Selawik (see the open item below)

**Character:** One humanist sans at light weight doing everything, Metro-style: size and case carry hierarchy, weight barely moves. Weight 300 for all display and figures, 350 for lead copy and buttons, 400 for body, 600 only inside `<b>`.

### Hierarchy
- **Display** (300, clamp(64px, 11vw, 148px), 0.92): the game title on the start screen, one line, hung slightly into the left margin (-0.04em).
- **Headline** (300, clamp(56px, 7.4vw, 104px), 0.9): the business name top-left of the game screen, clipped rather than wrapped.
- **Figure Hero** (300, clamp(40px, 4.6vw, 64px), 1): company value, right-aligned on the name row.
- **Section** (300, 40px, 1): section headings and pop-up headings, with a 13px muted lowercase aside right-aligned on the baseline.
- **Figure Tile** (300, 48px, 1): the number in a stat tile (40px between 900 and 1200px wide).
- **Figure Mid** (300, 34px, 1): bottom-bar cash, report total row, stepper value; section headings also step down to it between 900 and 1200px.
- **Action** (300, 24px): big button labels (open next week, open for business), start-screen lead and business-type tiles, the name field, team counts.
- **Title** (300, 20px): item names in menu, team and invest rows; control headings; segment option names; the week line.
- **Body** (400, 16px, 1.4): report rows, sources, toasts. **Lead** (350, 17px, 1.5): advisor tips, forecast, pop-up text, kept to 60ch.
- **Label** (400, 15px): tile labels, field labels, header tool buttons. **Caption** (400, 13px, muted): tile subs, item details, hints, table headers.

### Named Rules
**The Lowercase Rule.** Every display and label string is lowercase (headings, tile labels, buttons, pills, captions, table headers), applied with `text-transform` so source strings stay sentence case. Body copy (tips, pop-up text, notes) stays sentence case.

**The Label Under Rule.** A label sits under its value, never above it. Tiles order value, meter, label, sub; the company value and cash put their caption beneath the figure. No eyebrows or kickers.

**The Light Figure Rule.** Large numbers are weight 300 with -0.02em tracking; never bold a figure to make it important, make it bigger.

### Open Item: tabular figures
Selawik has no tabular figures. Number columns (report, year table, source counts, menu prices, event weeks) currently take their digits only from a local system face via the `Tnum` unicode-range @font-face (Segoe UI / Helvetica Neue), falling back to proportional Selawik digits where neither exists. This is provisional: the owner has not decided between keeping it, building a tabular-digit derivative of Selawik (allowed by the OFL under a new name), or accepting proportional digits. Do not extend the `Tnum` mechanism to new surfaces until this is decided.

## Layout

Desktop first, iPad must keep working. The game screen is centred at max 1360px with 32px side padding (20px below 900px) and 140px bottom padding to clear the fixed bar.

- **Header:** a two-column grid: business name left, company value right-aligned and bottom-aligned on the same row, with week / season / location under the name and the value's caption under the value. Tool buttons (shortcuts, theme, new game) sit in a row above, right-aligned. A 6px goal bar spans both columns underneath. Below 640px the value drops under the name, left-aligned.
- **Two panes:** at 900px and wider, a 1.05fr / 1fr grid with a 48px gap: status on the left (tiles, report, advisor, progress, sources, news), decisions on the right (menu, team, invest). Below 900px a single column re-ordered by the `.o1`-`.o10` order classes. Sections stack 44px apart.
- **Tiles:** three columns with an 8px gutter (two below 520px). 8px is the gutter for every tile grid: stat tiles, theme picker, segment options, stepper.
- **Rows:** lists (report, menu, team, invest, sources) are full-width rows separated by 1px line dividers, no boxes.
- **Bottom bar:** fixed, full width, ground-coloured with a 1px top line; cash at left, the "open next week" tile at right (min(400px, 60vw), 64px tall), respecting the safe-area inset.
- **Spacing rhythm:** 4 / 8 / 12 / 16 / 32 / 48px, with 44px between sections.

## Elevation & Depth

The world is flat. Tiles, buttons, panels and the bottom bar have no shadow; separation comes from tile-grey against the ground, ink floods, and 1px lines. The single exception is the pop-up band, the one surface that sits above the game.

### Shadow Vocabulary
- **Band lift** (`box-shadow: 0 24px 64px rgba(0,0,0,.35)`): only on the full-width pop-up band, over a 72% veil.

### Named Rules
**The Only The Band Rule.** No shadows anywhere except the pop-up band. If something needs to stand out, flood it or make it bigger.

## Shapes

Square everything (0px radius): tiles, buttons, inputs, pills, toggles, legend dots and price squares. Borders appear only as 2px ink outlines on outline buttons and the focused input, 2px line on idle inputs and toggles, and 1px line dividers between rows. Resting tiles are borderless. Markers (price state, source legend, chart keys) are small filled squares, never circles. Icons are thin SVG strokes (1.6px, 1.4px on the next-week arrow, 2px on toggle checks) with square line caps, sized 1em.

**The Struck Through Rule.** Locked content (themes not yet available, menu items and upgrades not yet unlocked) is shown by a 1px line-through in muted colour, not a padlock or a dimmed card.

## Components

### Buttons
Flat rectangles that read like tiles with a label.
- **Shape:** square (0px), min-height 48px, 10px 16px padding, label left and stroke icon right (space-between), 17px weight 350, lowercase.
- **Primary:** flooded in the business colour with white text. Reserved for the one action per screen that moves the game forward (open for business, open next week).
- **Outline (default):** 2px ink border, ink text; on hover-capable devices it inverts to ink fill with ground text.
- **Secondary:** tile-grey fill and border; in a pop-up band it becomes a transparent outline.
- **Press:** scale(.97) over 140ms with the house ease; tile-like controls (segments, steppers, mini price buttons) press to scale(.94).
- **Disabled:** 35% opacity.
- **Tool button:** borderless lowercase muted text, 40px minimum, turns ink on hover.

### Live Tile (signature)
- **Rest:** tile grey, min-height 116px, content bottom-aligned: 48px light figure, optional 4px meter (line track, ink fill), 15px ink label, 13px muted sub.
- **State floods:** last-week tile floods profit green or loss red once a report exists; the cleanliness tile floods red below 70%. Text on floods is white, subs at 86% white.
- **Flip:** on each new week every stat tile flips on the X axis (0.62s, house ease, 900px perspective), staggered 45ms per tile.

### Segment Options and Stepper
- **Segment option:** a small tile (min 92px tall) with a 19px lowercase name and a 13px muted line under it; the selected option floods in ink with ground-coloured text.
- **Stepper:** 56px square tile-grey minus/plus buttons with SVG strokes either side of a 32px light value with its caption under it. Menu price steppers use 44px squares around a 20px figure carrying a corner price-state square (green bargain, muted fair, red pricey).

### Inputs / Fields
- **Style:** transparent, 2px line border, square, 24px light text, muted placeholder; caret in the business colour.
- **Focus:** border turns ink. Field labels are 15px muted lowercase.

### Toggles and Pills
- **Toggle:** 40px square, 2px line border; checked floods profit green with a white 2px SVG check.
- **Pill:** 12px lowercase tag, 2px 6px padding, square. Good and bad pills flood green or red; neutral pills use tile grey.

### Report and Lists
Full-width rows with 1px dividers, label left and figure right. Report section rows close with a 2px ink rule; the total row grows to 32px light. Year table headers are 13px muted lowercase, right-aligned.

### Pop-up Band
A full-width tile-grey band across the viewport (content held to a 680px column), 44px heading, sentence-case 17px muted text, button row underneath. Enters by rising 16px and fading over 0.36s. Toast: an ink strip with ground-coloured text, square, centred above the bottom bar.

### Navigation (progress metrics)
Pivot-style metric headers: 20px light lowercase words in a row, muted by default, the active one in accent.

### Motion
House easing `cubic-bezier(.16, 1, .3, 1)` throughout: goal bar fill 0.6s, tile flip 0.62s, heading flash 0.9s (heading text from accent back to ink when a section updates), band 0.36s, press 0.14s. All animation and transition is disabled under reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep every display and label string lowercase via `text-transform`, and leave body copy in sentence case.
- **Do** put labels and captions under their values.
- **Do** flood the business colour on exactly one tile per screen, the action that advances time; flood selections in ink.
- **Do** use profit-green and loss-red fills only to report state.
- **Do** draw minus, plus, arrows and checks as thin square-capped SVG strokes in `currentColor`.
- **Do** derive `--accent` from `--biz` (light: `var(--biz)`; dark: `color-mix(in srgb, var(--biz) 62%, #fff)`), and define every new colour variable for both light and dark.
- **Do** keep touch targets at least 40px (buttons 48px, steppers 56px), and never put anything important behind hover; keyboard hints are hidden on touch devices.
- **Do** mark locked things with a 1px muted line-through.

### Don't:
- **Don't** round any corner (0px everywhere).
- **Don't** add shadows outside the pop-up band.
- **Don't** put eyebrows or kickers above headings or values.
- **Don't** use text glyphs or emoji as icons.
- **Don't** let a theme add design beyond its business colour and icons.
- **Don't** give the "fair" price state a colour; it is neutral muted.
- **Don't** bold figures for emphasis; scale them in light weight.
- **Don't** drift back to the cream-card-serif dashboard: no soft cards, no serif display, no rounded panels.
