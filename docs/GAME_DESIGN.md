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
- **Goal**: chosen on the start screen: €250k (relaxed), €500k, €1M (classic, default), €2M, €5M (tycoon).
- **Keep playing**: after winning or when time is up you can play on with no goal and no time limit (`state.endless`).
- **Company value** = cash − loan + Σ business value.
  Business value = 3 × annualised average profit of the last 12 weeks (if positive) + 50% of the cost of location, machine and equipment.

## Core loop (each week, per business) — see `simulateBusiness()` in engine.js

1. **Weather, economy and events**: this week's weather (forecast last week, may differ); once a year price rises and a
   rent review; then the **event director** (see Events below).
2. **Menu mix**: each drink gets an attractiveness = popularity × price factor (× season for cold brew).
   Share of sales is proportional. Menu **appeal** = (Σ attractiveness / 2.2)^0.45, capped at 1.6.
   Food (croissant) is an add-on: attach rate = 30% × price factor (max 60%).
3. **Demand** = foot traffic × traffic effects × awareness factor (0.6 + awareness × 0.9%) × season (±12%)
   × conversion × weather × event and demand effects × difficulty market (hard 0.82) × noise (±10%).
   Conversion = 0.35 × (0.5 + reputation%) × menu appeal × (0.6 + 0.4 × cleanliness).
4. **Capacity**: served = min(demand, bar capacity, register capacity). Contracts and catering orders use bar time first.
   - Bar = (baristas + 1 owner) × machine prep units × menu efficiency ÷ average prep per customer.
     Each drink beyond 3 on the menu costs 4% efficiency.
   - Register = (cashiers + 1 owner) × 900 × (1 + 20% with POS).
5. **Money**: revenue per item (+ contract income); costs = ingredients (item cost + beans × bean price, × supplier
   price index), wages (× wage index × raises given), rent (× rent index), marketing, system subscriptions,
   repairs/fines. Loan interest 0.5%/week is charged at player level.
6. **Reputation** drifts 15% per week toward a target:
   45% bean quality + 20% service (served/demand) + 15% value for money + 20% cleanliness.
7. **Awareness** = three stocks that each decay 6%/week, total capped at 100:
   marketing (1.5 × √(spend/100)), word of mouth (reputation/55), social media (reputation above 60, plus events).
8. **Cleanliness** = (cleaners × 1500 + owner 400) ÷ customers served, capped at 100%.
9. **Paper**: next week's weather forecast (with a % chance) and everything announced is stored for The Courier.

An **open decision** must be answered before the next week starts (`Actions.decide`); if not, its default is taken.

### Price
Fair price per item = base + bean quality bonus (drinks: quality% × 1.35) + reputation% × 0.8.
Fair prices also rise once a year with the economy (× price index).
Price factor = below fair: 1 + (1 − ratio) × 0.8; above fair: 1 − (ratio − 1) × 3.0 (min 0.03, `overpriceSlope`).
Temporary discounts (roadworks, price war) lower the effective price, which raises demand through the same factor.

## Coffee shop theme (data in `THEMES.coffee`)

| Thing | Options |
|---|---|
| Locations | Cart (rent €150, traffic 900, 2 staff) → Kiosk €12k (€900, 2,200, 5) → Corner café €45k (€2,600, 5,000, 12) → Flagship €140k (€6,500, 11,000, 24) |
| Machines (prep units per barista) | Second-hand 350 → Pro €4k 560 → Dual-group €12k 840 |
| Beans | Budget €0.25 q30 · Good €0.45 q60 · Specialty €1.05 q90 |
| Menu | Espresso, Cappuccino (start on), Latte (start off), Flat white (Pro machine), Cold brew (kit €2.5k), Croissant (oven €6k, needs kiosk) |
| Roles | Barista €650/wk · Cashier €550/wk (900 customers) · Cleaner €450/wk (1,500 customers). Hiring fee €200. Owner = 1 barista + 1 cashier + some cleaning |
| Systems | POS €2.5k + €40/wk (+20% register, splits walk-ins vs. word of mouth) · Marketing analytics €1.5k + €60/wk (splits marketing vs. social, shows marketing return) · Maintenance contract €25/wk (breakdowns rare and free) |
| Bank | Borrow/repay in €5k steps, max €30k, 0.5%/week |

### Events (phase 2) — data cards in `COFFEE_EVENTS`, paced by a director

**Event cards** have: category, kind (major / minor / decision), weight (can depend on your situation), conditions,
cooldown, lead time (0 = surprise, 1–4 weeks = announced in the paper first), duration, and `bad` (counts towards a cap).

**The director** (each week, per business):
1. Announced events that are due happen (some are only "likely": e.g. a bean price rise happens 75% of the time).
2. **Major event**: none in the first 2 weeks after the last one (breather); then chance = (8% + 4% per extra calm week)
   × difficulty event rate, max 60%.
3. **Minor event**: 30% × event rate.
4. **Decision**: at most one open; offered after `decisionGap` weeks with 35% chance per week.
5. Bad events are skipped while `maxActiveBad` bad effects are running or announced.

**Cause and effect**: machine breakdowns rise with machine age (maintenance contract: ×0.3, free repair); staff quit
more with more staff, long queues (overwork) and a refused raise; bad reviews and viral complaints come with cheap
beans, a dirty shop and long queues; competitors come more often to bigger, profitable shops; inspections favour
dirty shops.

**Cards**: roadworks (decision: signs / discount / nothing), festival, market day, transport strike, power cut,
break-in · bean price scare (decision: stock up / wait), milk shortage, supplier bust · competitor opening (decision:
loyalty campaign / price match / ignore), price war (decision), rival closes · staff quits, flu, raise request
(decision: +4% / one-off bonus / no) · machine breakdown · health inspection · review, viral complaint, influencer ·
catering order, office contract, magazine advert, charity sponsorship (decisions).

**Weather**: every week. Odds by season (summer: sunny/heatwave; winter: rain/snow). The paper gives next week's
forecast with a % chance; it is right `forecastAcc` of the time. Effects: sunny +5%, rain +10%, heatwave −15% (cold
brew ×2), snow −20%.

**Economy**: every new year wages, supplier prices and fair prices rise; 4 weeks before, the landlord announces a rent
review (decision: accept / negotiate 50-50 / sign a 3-year lease).

**Difficulty** (`DIFFICULTY` in engine.js):

| | easy | normal | hard |
|---|---|---|---|
| start cash | €8,000 | €5,000 | €3,000 |
| event rate / severity | ×0.4 / ×0.6 | ×0.65 / ×0.85 | ×1.0 / ×1.2 |
| max bad effects at once | 1 | 2 | 3 |
| decision every ≥ | 6 weeks | 4 weeks | 3 weeks |
| yearly wages / suppliers / prices / rent | +1 / +1 / +2 / +2% | +3 / +2 / +3 / +4% | +4 / +3 / +3 / +6% |
| forecast reliability | 90% | 80% | 65% |
| market size | 100% | 100% | 82% |

## UI overview (`index.html`)

Start screen (theme pick, shop name, continue) → game screen, a one-screen cockpit:
top bar (name, week, company value + goal bar) · **status** pane (stat tiles, week report) ·
**decide** pane with tabs Menu | Team | Invest | Bank · **insight** pane (open **decision card** on top, next-week forecast,
advisor tips) with tabs
Progress (charts + year table) | Sales (per-product popularity, cost, margin, share of profit; where the money goes) |
Customers (where they come from) | **Courier** (the weekly paper: headline, weather and market boxes, this week's
stories, coming up with "in N weeks", around town, earlier news).
While a decision is open, the week button reads "Decide first" and Space shows a reminder instead of opening the week.
Sticky bottom bar with cash and **Open next week**. Light/dark/auto theme toggle.
Look: "Live Tiles" (see `DESIGN.md` and decision 18). Stat tiles flip when a week opens.

**Keyboard shortcuts** (desktop extra; hints hidden on touch devices): Space = open next week (one press = one week,
ignored while a pop-up is open), M/T/I/B = Menu/Team/Invest/Bank tab, P/S/C/N = Progress/Sales/Customers/Courier tab, ? = shortcut list, Esc = close pop-up.
Pop-ups start on the safe button (Cancel / Not yet), so Enter never confirms by accident.
