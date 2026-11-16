# Game design

## Concept

Build a business from nothing into a company worth €1M within 5 years. Turn-based: one turn = one week.
Make decisions, click **Open next week**, read the report, adjust. Desktop first (mouse + keyboard); also playable on an iPad with touch.

The game should teach real small-business instincts: margins, bottlenecks, cash buffers,
when marketing pays off, and that information (knowing where customers come from) has value.

## Win / lose

- **Win**: company value ≥ €1,000,000.
- **Lose**: cash < 0 at the end of a week (bankrupt).
- **Time's up**: 260 weeks pass without reaching the goal.
- **Company value** = cash − loan + Σ business value.
  Business value = 3 × annualised average profit of the last 12 weeks (if positive) + 50% of the cost of location, machine and equipment.

## Core loop (each week, per business) — see `simulateBusiness()` in engine.js

1. **Events**: events announced last week happen now (forecasts). Then a 15% chance of a surprise event.
2. **Menu mix**: each drink gets an attractiveness = popularity × price factor (× season for cold brew).
   Share of sales is proportional. Menu **appeal** = (Σ attractiveness / 2.2)^0.45, capped at 1.6.
   Food (croissant) is an add-on: attach rate = 30% × price factor (max 60%).
3. **Demand** = foot traffic × competitor modifier × awareness factor (0.6 + awareness × 0.9%) × season (±12%)
   × conversion × event multiplier × noise (±10%).
   Conversion = 0.35 × (0.5 + reputation%) × menu appeal × (0.75 + 0.25 × cleanliness).
4. **Capacity**: served = min(demand, bar capacity, register capacity).
   - Bar = (baristas + 1 owner) × machine prep units × menu efficiency ÷ average prep per customer.
     Each drink beyond 3 on the menu costs 4% efficiency.
   - Register = (cashiers + 1 owner) × 900 × (1 + 20% with POS).
5. **Money**: revenue per item; costs = ingredients (item cost + beans × bean price), wages, rent, marketing,
   system subscriptions, repairs/fines. Loan interest 0.5%/week is charged at player level.
6. **Reputation** drifts 15% per week toward a target:
   45% bean quality + 20% service (served/demand) + 15% value for money + 20% cleanliness.
7. **Awareness** = three stocks that each decay 6%/week, total capped at 100:
   marketing (1.5 × √(spend/100)), word of mouth (reputation/55), social media (reputation above 60, plus events).
8. **Cleanliness** = (cleaners × 1500 + owner 400) ÷ customers served, capped at 100%.
9. **Forecast**: 20% chance an announceable event is scheduled for next week and shown to the player.

### Price
Fair price per item = base + bean quality bonus (drinks: quality% × 1.35) + reputation% × 0.8.
Price factor = below fair: 1 + (1 − ratio) × 0.8; above fair: 1 − (ratio − 1) × 2.2 (min 0.03).

## Coffee shop theme (data in `THEMES.coffee`)

| Thing | Options |
|---|---|
| Locations | Cart (rent €150, traffic 900, 2 staff) → Kiosk €12k (€900, 2,200, 5) → Corner café €45k (€2,600, 5,000, 12) → Flagship €140k (€6,500, 11,000, 24) |
| Machines (prep units per barista) | Second-hand 350 → Pro €4k 560 → Dual-group €12k 840 |
| Beans | Budget €0.25 q30 · Good €0.45 q60 · Specialty €1.05 q90 |
| Menu | Espresso, Cappuccino (start on), Latte (start off), Flat white (Pro machine), Cold brew (kit €2.5k), Croissant (oven €6k, needs kiosk) |
| Roles | Barista €650/wk · Cashier €550/wk (900 customers) · Cleaner €450/wk (1,500 customers). Hiring fee €200. Owner = 1 barista + 1 cashier + some cleaning |
| Systems | POS €2.5k + €40/wk (+20% register, splits walk-ins vs. word of mouth) · Marketing analytics €1.5k + €60/wk (splits marketing vs. social, shows marketing return) |
| Bank | Borrow/repay in €5k steps, max €30k, 0.5%/week |

### Events
- **Forecast (announced a week ahead)**: heatwave (−25%, cold brew boosted), cold & rainy (+20%), street festival (+50%),
  bean price spike (+50% for 4 weeks), competitor opening (−20% traffic for 12 weeks).
- **Surprise**: food blogger review (±8 rep, depends on bean quality), barista/staff quits, machine breakdown (repair),
  influencer post (+social awareness), health inspection (fine + rep loss if cleanliness < 70%, small bonus otherwise).

## UI overview (`index.html`)

Start screen (theme pick, shop name, continue) → game screen:
Your business (tiles) · Week report · Advisor tips · Progress (charts + year table) · Where customers come from ·
News | Menu (forecast, beans, items) · Team (roles, marketing) · Invest (location, machine, equipment, systems) · Bank.
Sticky bottom bar with cash and **Open next week**. Light/dark/auto theme toggle.

**Keyboard shortcuts** (desktop extra; hints hidden on touch devices): Space = open next week (one press = one week,
ignored while a pop-up is open), M/T/I/B/P = jump to Menu/Team/Invest/Bank/Progress, ? = shortcut list, Esc = close pop-up.
Pop-ups start on the safe button (Cancel / Not yet), so Enter never confirms by accident.
