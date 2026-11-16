/*
 * Business Tycoon — game engine (v2)
 * ------------------------------------------------------------
 * Pure game logic, no UI. The UI only reads `state` and calls
 * Actions.* and tick(). Runs in the browser and in Node (for
 * headless balance simulations: `npm run sim`).
 *
 * Data model is multi-business from day one:
 *   state.player       -> cash, loan (shared across businesses)
 *   state.businesses[] -> each business has its own theme, menu, team, history
 * This version only lets you own one business.
 */
(function (root) {
  'use strict';

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = (v) => Math.round(v * 10) / 10;
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  // ------------------------------------------------------------------
  // THEMES — a theme is (mostly) data. Add a theme = add an entry here.
  // ------------------------------------------------------------------
  const THEMES = {
    coffee: {
      id: 'coffee',
      name: 'Coffee shop',
      icon: '☕',
      color: '#C2410C',            // business colour in the UI (white text on it must stay readable)
      startCash: 5000,
      hireFee: 200,                // one-off recruiting cost
      qualityPriceBonus: 1.35,      // fair price += quality/100 × this (drinks only)
      repPriceBonus: 0.8,          // fair price += reputation/100 × this
      baseConversion: 0.35,        // share of foot traffic that buys (fair prices, basic menu)
      seasonality: 0.12,           // +12% demand in deep winter, −12% in summer
      surpriseChance: 0.15,        // happens without warning
      forecastChance: 0.2,         // announced one week ahead
      valuationMultiple: 3,        // business value = 3× annualised profit + assets

      // You, the owner, help out: you count as 1 barista and 1 cashier, and do some cleaning.
      owner: { barista: 1, cashier: 1, cleaning: 400 },
      roles: [
        { id: 'barista', name: 'Barista', plural: 'Baristas', icon: '☕', wage: 650, desc: 'Makes the drinks' },
        { id: 'cashier', name: 'Cashier', plural: 'Cashiers', icon: '🧾', wage: 550, desc: 'Takes orders and payments', perWeek: 900 },
        { id: 'cleaner', name: 'Cleaner', plural: 'Cleaners', icon: '🧽', wage: 450, desc: 'Keeps the place spotless', perWeek: 1500 },
      ],

      locations: [
        { name: 'Coffee cart',   rent: 150,  traffic: 900,   maxStaff: 2,  cost: 0 },
        { name: 'Street kiosk',  rent: 900,  traffic: 2200,  maxStaff: 5,  cost: 12000 },
        { name: 'Corner café',   rent: 2600, traffic: 5000,  maxStaff: 12,  cost: 45000 },
        { name: 'Flagship café', rent: 6500, traffic: 11000, maxStaff: 24, cost: 140000 },
      ],
      // perStaff = "prep units" one barista can handle per week (an espresso = 1 unit)
      machines: [
        { name: 'Second-hand machine',  perStaff: 350, cost: 0 },
        { name: 'Pro espresso machine', perStaff: 560, cost: 4000 },
        { name: 'Dual-group workhorse', perStaff: 840, cost: 12000 },
      ],
      supplies: [
        { name: 'Budget beans',    costPerUnit: 0.25, quality: 30 },
        { name: 'Good beans',      costPerUnit: 0.45, quality: 60 },
        { name: 'Specialty beans', costPerUnit: 1.05, quality: 90 },
      ],
      // The menu. Drinks: each customer buys one. Food: an add-on some customers buy.
      products: [
        { id: 'espresso',   name: 'Espresso',   icon: '☕', kind: 'drink', fairBase: 1.6, cost: 0.15, beans: 1.0, prep: 1.0, popularity: 0.8, startPrice: 2.2, startOn: true },
        { id: 'cappuccino', name: 'Cappuccino', icon: '☕', kind: 'drink', fairBase: 2.4, cost: 0.35, beans: 1.0, prep: 1.4, popularity: 1.4, startPrice: 3.2, startOn: true },
        { id: 'latte',      name: 'Latte',      icon: '🥛', kind: 'drink', fairBase: 2.6, cost: 0.45, beans: 1.0, prep: 1.5, popularity: 1.2, startPrice: 3.4, startOn: false },
        { id: 'flatwhite',  name: 'Flat white', icon: '☕', kind: 'drink', fairBase: 2.9, cost: 0.45, beans: 1.3, prep: 1.7, popularity: 1.0, startPrice: 3.9,
          requires: { machineLvl: 1 }, lockText: 'Needs a Pro espresso machine' },
        { id: 'coldbrew',   name: 'Cold brew',  icon: '🧊', kind: 'drink', fairBase: 3.0, cost: 0.30, beans: 1.6, prep: 0.6, popularity: 0.9, startPrice: 4.0, summer: true,
          requires: { equipment: 'coldbrew' }, lockText: 'Needs a cold brew kit' },
        { id: 'croissant',  name: 'Croissant',  icon: '🥐', kind: 'food',  fairBase: 2.2, cost: 0.90, beans: 0,   prep: 0.3, attach: 0.3, startPrice: 2.8,
          requires: { equipment: 'oven' }, lockText: 'Needs an oven' },
      ],
      equipment: [
        { id: 'coldbrew', name: 'Cold brew kit', icon: '🧊', cost: 2500, desc: 'Unlocks cold brew. Quick to serve and sells best in summer.' },
        { id: 'oven', name: 'Oven & pastry display', icon: '🥐', cost: 6000, desc: 'Unlocks croissants. Many customers add one to their coffee.',
          requires: { locationLvl: 1 }, lockText: 'Needs at least a Street kiosk' },
      ],
      // Systems: investments that reveal information (and help a little)
      systems: [
        { id: 'pos', name: 'POS cashier system', icon: '🧾', cost: 2500, weekly: 40, registerBonus: 0.2,
          desc: 'Faster checkout (+20% register capacity) and loyalty cards. Shows walk-ins vs. regulars who came back or were sent by friends.' },
        { id: 'analytics', name: 'Marketing analytics', icon: '📊', cost: 1500, weekly: 60, registerBonus: 0,
          desc: 'Discount codes and tracking links. Shows who came from your marketing vs. from social media, and what your marketing earns back.' },
      ],
      events: [
        {
          id: 'review', weight: 3,
          apply(b, ctx) {
            if (ctx.quality >= 60) {
              b.reputation = clamp(b.reputation + 8, 0, 100);
              b.awSocial += 5;
              return { text: 'A food blogger raved about your coffee. Reputation +8.', tone: 'good' };
            }
            b.reputation = clamp(b.reputation - 8, 0, 100);
            return { text: 'A food blogger called your coffee "burnt dishwater". Reputation −8.', tone: 'bad' };
          },
        },
        {
          id: 'heatwave', weight: 3, forecast: true,
          announce: { text: 'Weather forecast: heatwave next week. Expect about 25% fewer customers (cold brew still sells).', tone: 'bad' },
          apply(b, ctx) { ctx.demandMult *= 0.75; ctx.coldBoost = 2; return { text: 'The heatwave kept customers away. Demand −25%.', tone: 'bad' }; },
        },
        {
          id: 'rain', weight: 3, forecast: true,
          announce: { text: 'Weather forecast: cold and rainy next week. Expect about 20% more customers.', tone: 'good' },
          apply(b, ctx) { ctx.demandMult *= 1.2; return { text: 'Cold, rainy week: everyone wanted something warm. Demand +20%.', tone: 'good' }; },
        },
        {
          id: 'festival', weight: 2, forecast: true,
          announce: { text: 'Street festival right outside your door next week! Expect about 50% more customers.', tone: 'good' },
          apply(b, ctx) { ctx.demandMult *= 1.5; return { text: 'The street festival brought crowds. Demand +50%.', tone: 'good' }; },
        },
        {
          id: 'beanspike', weight: 2, forecast: true,
          when: (b) => !b.modifiers.some((m) => m.kind === 'supplyCost'),
          announce: { text: 'Bad harvest in Brazil: bean prices go up 50% from next week, for 4 weeks.', tone: 'bad' },
          apply(b) {
            b.modifiers.push({ kind: 'supplyCost', mult: 1.5, weeks: 4, label: 'Bean price spike' });
            return { text: 'Bean prices are up 50% for 4 weeks.', tone: 'bad' };
          },
        },
        {
          id: 'quit', weight: 2,
          when: (b) => totalStaff(b) > 0,
          apply(b, ctx) {
            const t = getTheme(b);
            const pool = t.roles.filter((r) => b.staff[r.id] > 0);
            const role = pool[Math.floor(ctx.rand() * pool.length)];
            b.staff[role.id] -= 1;
            return { text: `One of your ${role.plural.toLowerCase()} quit without notice.`, tone: 'bad' };
          },
        },
        {
          id: 'competitor', weight: 1, forecast: true,
          when: (b) => !b.modifiers.some((m) => m.kind === 'traffic'),
          announce: { text: 'A coffee chain opens down the street next week. Expect 20% less foot traffic for 12 weeks.', tone: 'bad' },
          apply(b) {
            b.modifiers.push({ kind: 'traffic', mult: 0.8, weeks: 12, label: 'Competitor nearby' });
            return { text: 'The coffee chain opened. Foot traffic −20% for 12 weeks.', tone: 'bad' };
          },
        },
        {
          id: 'breakdown', weight: 2,
          apply(b, ctx) {
            const cost = 300 * (b.machineLvl + 1);
            ctx.extraCosts.push({ label: 'Machine repair', amount: cost });
            return { text: `Your espresso machine broke down. Repair: €${cost}.`, tone: 'bad' };
          },
        },
        {
          id: 'influencer', weight: 2,
          apply(b) { b.awSocial += 12; return { text: 'A local influencer posted your latte art. Lots of new followers.', tone: 'good' }; },
        },
        {
          id: 'inspection', weight: 3,
          apply(b, ctx) {
            if (b.cleanliness < 0.7) {
              ctx.extraCosts.push({ label: 'Hygiene fine', amount: 1000 });
              b.reputation = clamp(b.reputation - 10, 0, 100);
              return { text: 'Surprise health inspection: the place was dirty. €1,000 fine and reputation −10.', tone: 'bad' };
            }
            b.reputation = clamp(b.reputation + 3, 0, 100);
            return { text: 'Surprise health inspection: spotless! Reputation +3.', tone: 'good' };
          },
        },
      ],
    },
  };

  const getTheme = (b) => THEMES[b.themeId];
  const totalStaff = (b) => Object.values(b.staff).reduce((s, n) => s + n, 0);
  const seasonCos = (week) => Math.cos((2 * Math.PI * ((week % 52) - 2)) / 52); // 1 = deep winter, −1 = high summer

  // ------------------------------------------------------------------
  // Derived numbers
  // ------------------------------------------------------------------
  function meets(b, req) {
    if (!req) return true;
    if (req.machineLvl != null && b.machineLvl < req.machineLvl) return false;
    if (req.locationLvl != null && b.locationLvl < req.locationLvl) return false;
    if (req.equipment && !b.equipment[req.equipment]) return false;
    return true;
  }
  const isUnlocked = (b, p) => meets(b, p.requires);

  function fairPriceOf(b, p) {
    const t = getTheme(b);
    const q = t.supplies[b.supplyIdx].quality;
    return p.fairBase + (p.kind === 'food' ? 0 : (q / 100) * t.qualityPriceBonus) + (b.reputation / 100) * t.repPriceBonus;
  }
  function priceFactor(ratio) {
    return ratio <= 1 ? 1 + (1 - ratio) * 0.8 : Math.max(0.03, 1 - (ratio - 1) * 2.2);
  }
  function activeItems(b) {
    return getTheme(b).products.filter((p) => isUnlocked(b, p) && b.menu[p.id] && b.menu[p.id].on);
  }

  // What customers will order, given the menu and prices
  function computeMix(b, week, coldBoost = 1) {
    const sc = seasonCos(week);
    const items = activeItems(b);
    const drinks = items.filter((p) => p.kind !== 'food').map((p) => {
      const fair = fairPriceOf(b, p), price = b.menu[p.id].price, pf = priceFactor(price / fair);
      const w = p.popularity * (p.summer ? (1 - 0.6 * sc) * coldBoost : 1);
      return { p, fair, price, pf, a: w * pf };
    });
    const totalA = sum(drinks, (r) => r.a);
    drinks.forEach((r) => (r.share = totalA > 0 ? r.a / totalA : 0));
    const food = items.filter((p) => p.kind === 'food').map((p) => {
      const fair = fairPriceOf(b, p), price = b.menu[p.id].price, pf = priceFactor(price / fair);
      return { p, fair, price, pf, attach: Math.min(0.6, p.attach * pf) };
    });
    const appeal = totalA > 0 ? Math.min(1.6, Math.pow(totalA / 2.2, 0.45)) : 0; // variety & price attract customers
    const efficiency = 1 - 0.04 * Math.max(0, drinks.length - 3);            // a long menu slows the bar
    const load = sum(drinks, (r) => r.share * r.p.prep) + sum(food, (f) => f.attach * f.p.prep);
    return { drinks, food, appeal, efficiency, load: load || 1 };
  }

  function capacities(b, week = 0, mix = null) {
    const t = getTheme(b);
    mix = mix || computeMix(b, week);
    const cashierRole = t.roles.find((r) => r.id === 'cashier');
    const posBonus = sum(t.systems, (x) => (b.systems[x.id] ? x.registerBonus : 0));
    const bar = Math.round(((b.staff.barista + t.owner.barista) * t.machines[b.machineLvl].perStaff * mix.efficiency) / mix.load);
    const register = Math.round((b.staff.cashier + t.owner.cashier) * cashierRole.perWeek * (1 + posBonus));
    return { bar, register, max: Math.min(bar, register), mix };
  }
  function cleaningCapacity(b) {
    const t = getTheme(b);
    return b.staff.cleaner * t.roles.find((r) => r.id === 'cleaner').perWeek + t.owner.cleaning;
  }
  function seasonName(week) {
    const w = week % 52;
    if (w < 9 || w >= 48) return 'Winter';
    if (w < 22) return 'Spring';
    if (w < 35) return 'Summer';
    return 'Autumn';
  }
  function businessValue(b) {
    const t = getTheme(b);
    const recent = b.history.slice(-12);
    const avg = recent.length ? sum(recent, (h) => h.profit) / recent.length : 0;
    const earnings = Math.max(0, avg) * 52 * t.valuationMultiple;
    const assets = 0.5 * (t.locations[b.locationLvl].cost + t.machines[b.machineLvl].cost
      + sum(t.equipment, (e) => (b.equipment[e.id] ? e.cost : 0)));
    return Math.round(earnings + assets);
  }
  function valuation(state) {
    return Math.round(state.player.cash - state.player.loan + sum(state.businesses, businessValue));
  }

  // ------------------------------------------------------------------
  // New game + save migration
  // ------------------------------------------------------------------
  function newBusiness(id, name, themeId) {
    const t = THEMES[themeId];
    const menu = {};
    for (const p of t.products) menu[p.id] = { on: !!p.startOn, price: p.startPrice };
    const staff = {};
    for (const r of t.roles) staff[r.id] = 0;
    return {
      id, name, themeId,
      locationLvl: 0, machineLvl: 0, supplyIdx: 1, marketing: 0,
      staff, menu, equipment: {}, systems: {},
      reputation: 40, awareness: 20, awMkt: 0, awWom: 10, awSocial: 10, cleanliness: 1,
      modifiers: [], upcoming: [], forecast: null, history: [], lastReport: null,
    };
  }
  // Goals the player can pick on the start screen (company value to reach within maxWeeks)
  const GOALS = [250000, 500000, 1000000, 2000000, 5000000];

  function newGame(shopName, themeId = 'coffee', opts = {}) {
    const t = THEMES[themeId];
    return {
      version: 3,
      week: 0,
      maxWeeks: 260,          // 5 years
      goal: GOALS.includes(opts.goal) ? opts.goal : 1000000,   // target valuation
      status: 'playing',      // playing | won | bankrupt | timeup
      endless: false,         // true after "keep playing": no goal check, no time limit
      goalReachedWeek: null,  // week the goal was reached (stays set when playing on)
      player: { cash: t.startCash, loan: 0, maxLoan: 30000, interestRate: 0.005 },
      businesses: [newBusiness('b1', shopName || 'My Coffee', themeId)],
      log: [],
      valuationHistory: [],
    };
  }
  // Bring saves from older versions up to date
  function migrate(state) {
    if (!state) return state;
    for (const b of state.businesses) {
      const t = getTheme(b);
      if (b.awMkt === undefined) { b.awMkt = 0; b.awWom = b.awareness / 2; b.awSocial = b.awareness / 2; }
      if (!b.systems) b.systems = {};
      if (!b.equipment) b.equipment = {};
      if (!b.upcoming) b.upcoming = [];
      if (b.cleanliness === undefined) b.cleanliness = 1;
      if (typeof b.staff === 'number') { const n = b.staff; b.staff = {}; t.roles.forEach((r) => (b.staff[r.id] = 0)); b.staff.barista = n; }
      if (!b.menu) {
        b.menu = {};
        for (const p of t.products) b.menu[p.id] = { on: !!p.startOn || (isUnlocked(b, p) && p.kind === 'drink'), price: p.startPrice };
        delete b.price;
      }
    }
    if (state.endless === undefined) state.endless = false;
    if (state.goalReachedWeek === undefined) state.goalReachedWeek = null;
    state.version = 3;
    return state;
  }
  function sumAwareness(b) {
    let tot = b.awMkt + b.awWom + b.awSocial;
    if (tot > 100) { const f = 100 / tot; b.awMkt *= f; b.awWom *= f; b.awSocial *= f; tot = 100; }
    b.awareness = tot;
    return tot;
  }

  // ------------------------------------------------------------------
  // The weekly simulation: tick(state) -> new state
  // ------------------------------------------------------------------
  function pickWeighted(list, rand) {
    const total = sum(list, (e) => e.weight);
    let x = rand() * total;
    for (const e of list) { x -= e.weight; if (x <= 0) return e; }
    return list[list.length - 1];
  }

  function simulateBusiness(b, week, rand) {
    const t = getTheme(b);
    const supply = t.supplies[b.supplyIdx];
    const ctx = { demandMult: 1, coldBoost: 1, extraCosts: [], quality: supply.quality, rand };
    const events = [];

    // 1) Events announced last week happen now
    for (const id of b.upcoming || []) {
      const e = t.events.find((x) => x.id === id);
      if (e && (!e.when || e.when(b))) events.push(e.apply(b, ctx));
    }
    b.upcoming = [];
    // 2) Surprises happen without warning
    if (rand() < t.surpriseChance) {
      const pool = t.events.filter((e) => !e.forecast && (!e.when || e.when(b)));
      if (pool.length) events.push(pickWeighted(pool, rand).apply(b, ctx));
    }

    const mod = (kind) => b.modifiers.filter((m) => m.kind === kind).reduce((p, m) => p * m.mult, 1);
    const loc = t.locations[b.locationLvl];

    // 3) Demand
    sumAwareness(b);
    const mix = computeMix(b, week, ctx.coldBoost);
    const cap = capacities(b, week, mix);
    const trafficMult = 0.6 + (b.awareness / 100) * 0.9;
    const season = 1 + t.seasonality * seasonCos(week);
    const conversion = t.baseConversion * (0.5 + b.reputation / 100) * mix.appeal * (0.75 + 0.25 * b.cleanliness); // a dirty shop scares people off
    const noise = 0.9 + rand() * 0.2;
    const demand = Math.max(0, Math.round(
      loc.traffic * mod('traffic') * trafficMult * season * conversion * ctx.demandMult * noise
    ));
    const served = Math.min(demand, cap.bar, cap.register);
    const bottleneck = served < demand ? (cap.bar <= cap.register ? 'bar' : 'register') : null;

    // 4) Sales per item
    const spike = mod('supplyCost');
    const sales = [
      ...mix.drinks.map((r) => ({ id: r.p.id, name: r.p.name, icon: r.p.icon, qty: Math.round(served * r.share), price: r.price, fair: r1(r.fair), unitCost: r.p.cost + r.p.beans * supply.costPerUnit * spike })),
      ...mix.food.map((f) => ({ id: f.p.id, name: f.p.name, icon: f.p.icon, qty: Math.round(served * f.attach), price: f.price, fair: r1(f.fair), unitCost: f.p.cost })),
    ];
    sales.forEach((s) => { s.revenue = s.qty * s.price; s.margin = s.qty * (s.price - s.unitCost); });

    const revenue = sum(sales, (s) => s.revenue);
    const supplies = sum(sales, (s) => s.qty * s.unitCost);
    const wages = sum(t.roles, (r) => b.staff[r.id] * r.wage);
    const rent = loc.rent;
    const marketing = b.marketing;
    const other = sum(ctx.extraCosts, (c) => c.amount);
    const systems = sum(t.systems, (x) => (b.systems[x.id] ? x.weekly : 0));
    const costs = supplies + wages + rent + marketing + other + systems;
    const profit = revenue - costs;

    // 5) Where did customers come from? (shares of the traffic multiplier)
    const k = 0.9 / 100 / trafficMult;
    const share = { passersby: 0.6 / trafficMult, wordOfMouth: b.awWom * k, marketing: b.awMkt * k, social: b.awSocial * k };
    const sources = {};
    for (const key in share) sources[key] = Math.round(served * share[key]);
    const marginPerCustomer = served > 0 ? (revenue - supplies) / served : 0;
    const marketingReturn = Math.round(sources.marketing * marginPerCustomer - marketing);

    // 6) Reputation: quality, service (queues), value for money, cleanliness
    const service = demand > 0 ? served / demand : 1;
    const soldQty = sum(sales, (s) => s.qty);
    const value = soldQty > 0 ? sum(sales, (s) => s.qty * clamp(50 + ((s.fair - s.price) / s.fair) * 150, 0, 100)) / soldQty : 50;
    b.cleanliness = clamp(cleaningCapacity(b) / Math.max(served, 1), 0, 1);
    const target = supply.quality * 0.45 + service * 100 * 0.2 + value * 0.15 + b.cleanliness * 100 * 0.2;
    b.reputation = clamp(b.reputation + (target - b.reputation) * 0.15, 0, 100);

    // 7) Awareness: marketing + word of mouth + social − forgetting
    const decay = 0.06;
    b.awMkt += 1.5 * Math.sqrt(b.marketing / 100) - decay * b.awMkt;
    b.awWom += b.reputation / 55 - decay * b.awWom;
    b.awSocial += Math.max(0, b.reputation - 60) / 40 - decay * b.awSocial;
    sumAwareness(b);

    b.modifiers = b.modifiers.map((m) => ({ ...m, weeks: m.weeks - 1 })).filter((m) => m.weeks > 0);

    // 8) Announce something for next week
    b.forecast = null;
    if (rand() < t.forecastChance) {
      const pool = t.events.filter((e) => e.forecast && (!e.when || e.when(b)));
      if (pool.length) {
        const e = pickWeighted(pool, rand);
        b.upcoming = [e.id];
        b.forecast = { ...e.announce };
      }
    }

    const report = {
      week, demand, served, lost: demand - served, bottleneck, barCap: cap.bar, registerCap: cap.register,
      sales, avgTicket: served > 0 ? revenue / served : 0, cleanliness: b.cleanliness,
      revenue, costs: { supplies, wages, rent, marketing, other, systems }, totalCosts: costs, profit, events,
      service: Math.round(service * 100), sources, marketingReturn,
    };
    b.lastReport = report;
    const rc = (x) => Math.round(x);
    b.history.push({
      week, revenue: rc(revenue), profit: rc(profit), served, demand,
      rep: rc(b.reputation), aw: rc(b.awareness), clean: rc(b.cleanliness * 100),
      // for the Sales insights: cost categories and per-product [qty, revenue, gross margin]
      costs: { supplies: rc(supplies), wages: rc(wages), rent: rc(rent), marketing: rc(marketing), other: rc(other), systems: rc(systems) },
      items: Object.fromEntries(sales.map((x) => [x.id, [x.qty, rc(x.revenue), rc(x.margin)]])),
    });
    if (b.history.length > 520) b.history.shift();
    return report;
  }

  function tick(state, rand = Math.random) {
    if (state.status !== 'playing') return state;
    const s = clone(state);
    s.week += 1;

    let totalProfit = 0;
    for (const b of s.businesses) {
      const rep = simulateBusiness(b, s.week, rand);
      totalProfit += rep.profit;
      for (const e of rep.events) s.log.unshift({ week: s.week, text: e.text, tone: e.tone });
      if (b.forecast) s.log.unshift({ week: s.week, text: '📅 ' + b.forecast.text, tone: b.forecast.tone });
    }

    const interest = s.player.loan * s.player.interestRate;
    s.player.cash += totalProfit - interest;
    s.lastInterest = interest;

    const v = valuation(s);
    s.valuationHistory.push({ week: s.week, value: v, cash: Math.round(s.player.cash), interest: Math.round(interest) });

    if (s.player.cash < 0) {
      s.status = 'bankrupt';
      s.log.unshift({ week: s.week, text: 'You ran out of cash. The bank closed your accounts.', tone: 'bad' });
    } else if (s.endless) {
      // playing on: no goal check, no time limit
    } else if (v >= s.goal) {
      s.status = 'won';
      s.goalReachedWeek = s.week;
      s.log.unshift({ week: s.week, text: `Your company is worth €${v.toLocaleString('en')}. Goal reached!`, tone: 'good' });
    } else if (s.week >= s.maxWeeks) {
      s.status = 'timeup';
    }
    s.log = s.log.slice(0, 40);
    return s;
  }

  // ------------------------------------------------------------------
  // Player actions: each returns { state, error }
  // ------------------------------------------------------------------
  function act(state, bid, fn) {
    const s = clone(state);
    const b = s.businesses.find((x) => x.id === bid);
    const error = fn(s, b, b ? getTheme(b) : null);
    return error ? { state, error } : { state: s, error: null };
  }
  // After an upgrade, put newly unlocked items on the menu
  function unlockNew(s, b, t, before) {
    for (const p of t.products) {
      if (!before.includes(p.id) && isUnlocked(b, p)) {
        b.menu[p.id].on = true;
        s.log.unshift({ week: s.week, text: `${p.icon} ${p.name} added to your menu at €${b.menu[p.id].price.toFixed(2)}.`, tone: 'good' });
      }
    }
  }
  const unlockedIds = (b, t) => t.products.filter((p) => isUnlocked(b, p)).map((p) => p.id);

  const Actions = {
    setItemPrice: (state, bid, id, price) => act(state, bid, (s, b) => { b.menu[id].price = r1(clamp(price, 0.5, 9.9)); }),
    toggleItem: (state, bid, id) => act(state, bid, (s, b, t) => {
      const p = t.products.find((x) => x.id === id);
      if (!isUnlocked(b, p)) return p.lockText + '.';
      if (b.menu[id].on && p.kind === 'drink' && activeItems(b).filter((x) => x.kind === 'drink').length <= 1) return 'Keep at least one drink on the menu.';
      b.menu[id].on = !b.menu[id].on;
    }),
    setSupply: (state, bid, idx) => act(state, bid, (s, b, t) => { b.supplyIdx = clamp(idx, 0, t.supplies.length - 1); }),
    setMarketing: (state, bid, amount) => act(state, bid, (s, b) => { b.marketing = clamp(Math.round(amount / 50) * 50, 0, 5000); }),
    hire: (state, bid, role) => act(state, bid, (s, b, t) => {
      const r = t.roles.find((x) => x.id === role);
      if (totalStaff(b) >= t.locations[b.locationLvl].maxStaff) return 'No room for more staff here. Upgrade your location first.';
      if (s.player.cash < t.hireFee) return 'Not enough cash to recruit.';
      s.player.cash -= t.hireFee; b.staff[r.id] += 1;
    }),
    fire: (state, bid, role) => act(state, bid, (s, b, t) => {
      const r = t.roles.find((x) => x.id === role);
      if (b.staff[r.id] <= 0) return `You have no ${r.plural.toLowerCase()} to let go.`;
      b.staff[r.id] -= 1;
    }),
    upgradeLocation: (state, bid) => act(state, bid, (s, b, t) => {
      const next = t.locations[b.locationLvl + 1];
      if (!next) return 'You already have the best location.';
      if (s.player.cash < next.cost) return `You need €${next.cost.toLocaleString('en')} to move.`;
      const before = unlockedIds(b, t);
      s.player.cash -= next.cost; b.locationLvl += 1;
      s.log.unshift({ week: s.week, text: `You moved into a ${next.name}!`, tone: 'good' });
      unlockNew(s, b, t, before);
    }),
    upgradeMachine: (state, bid) => act(state, bid, (s, b, t) => {
      const next = t.machines[b.machineLvl + 1];
      if (!next) return 'You already have the best machine.';
      if (s.player.cash < next.cost) return `You need €${next.cost.toLocaleString('en')} for that machine.`;
      const before = unlockedIds(b, t);
      s.player.cash -= next.cost; b.machineLvl += 1;
      s.log.unshift({ week: s.week, text: `New ${next.name} installed.`, tone: 'good' });
      unlockNew(s, b, t, before);
    }),
    buyEquipment: (state, bid, id) => act(state, bid, (s, b, t) => {
      const e = t.equipment.find((x) => x.id === id);
      if (b.equipment[id]) return 'You already have this.';
      if (!meets(b, e.requires)) return e.lockText + '.';
      if (s.player.cash < e.cost) return `You need €${e.cost.toLocaleString('en')} for that.`;
      const before = unlockedIds(b, t);
      s.player.cash -= e.cost; b.equipment[id] = true;
      s.log.unshift({ week: s.week, text: `${e.icon} ${e.name} installed.`, tone: 'good' });
      unlockNew(s, b, t, before);
    }),
    buySystem: (state, bid, id) => act(state, bid, (s, b, t) => {
      const sys = t.systems.find((x) => x.id === id);
      if (b.systems[id]) return 'You already have this.';
      if (s.player.cash < sys.cost) return `You need €${sys.cost.toLocaleString('en')} for that.`;
      s.player.cash -= sys.cost; b.systems[id] = true;
      s.log.unshift({ week: s.week, text: `${sys.icon} ${sys.name} installed.`, tone: 'good' });
    }),
    takeLoan: (state, amount = 5000) => act(state, null, (s) => {
      if (s.player.loan + amount > s.player.maxLoan) return `The bank won't lend more than €${s.player.maxLoan.toLocaleString('en')}.`;
      s.player.loan += amount; s.player.cash += amount;
    }),
    repayLoan: (state, amount = 5000) => act(state, null, (s) => {
      const pay = Math.min(amount, s.player.loan);
      if (pay <= 0) return 'You have no loan to repay.';
      if (s.player.cash < pay) return 'Not enough cash to repay.';
      s.player.loan -= pay; s.player.cash -= pay;
    }),
    // After winning (or when time is up): keep going with no goal check and no time limit
    keepPlaying: (state) => act(state, null, (s) => {
      if (s.status !== 'won' && s.status !== 'timeup') return 'You can only play on after reaching the goal or the time limit.';
      s.status = 'playing'; s.endless = true;
      s.log.unshift({ week: s.week, text: 'You decided to keep building. No goal, no time limit.', tone: 'good' });
    }),
  };

  const api = {
    THEMES, GOALS, newGame, tick, migrate, Actions, getTheme,
    fairPriceOf, isUnlocked, meets, capacities, cleaningCapacity, computeMix, totalStaff,
    valuation, businessValue, seasonName,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TycoonEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
