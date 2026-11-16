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
  // DIFFICULTY — every knob that makes the world kinder or harsher.
  // ------------------------------------------------------------------
  const DIFFICULTY = {
    easy:   { label: 'Easy',   startCash: 8000, eventRate: 0.4,  severity: 0.6,  maxActiveBad: 1, decisionGap: 6,
              wageRise: 0.01, supplyRise: 0.01, priceRise: 0.02,  rentRise: 0.02, forecastAcc: 0.9 },
    normal: { label: 'Normal', startCash: 5000, eventRate: 0.65, severity: 0.85, maxActiveBad: 2, decisionGap: 4,
              wageRise: 0.03, supplyRise: 0.02, priceRise: 0.03,  rentRise: 0.04, forecastAcc: 0.8 },
    hard:   { label: 'Hard',   startCash: 3000, eventRate: 1.0,  severity: 1.1,  maxActiveBad: 3, decisionGap: 3,
              wageRise: 0.04, supplyRise: 0.03, priceRise: 0.03,  rentRise: 0.06, forecastAcc: 0.65 },
  };

  // ------------------------------------------------------------------
  // WEATHER — every week has weather; the paper forecasts next week with some uncertainty.
  // ------------------------------------------------------------------
  const WEATHER = {
    normal: { name: 'mild and dry',   demand: 1.00, text: 'An ordinary week of weather.' },
    sunny:  { name: 'sunny',          demand: 1.05, text: 'Sunshine brought people outside.' },
    rain:   { name: 'cold and rainy', demand: 1.10, text: 'Cold rain: everyone wanted something warm.' },
    heat:   { name: 'a heatwave',     demand: 0.85, cold: 2, text: 'The heatwave kept people indoors, but cold drinks sold well.' },
    snow:   { name: 'snow',           demand: 0.80, text: 'Snow kept people at home.' },
  };
  function weatherOdds(week) {
    const sc = Math.cos((2 * Math.PI * ((week % 52) - 2)) / 52);
    if (sc < -0.3) return { sunny: 0.35, normal: 0.35, heat: 0.2, rain: 0.1 };
    if (sc > 0.3) return { normal: 0.4, rain: 0.35, snow: 0.15, sunny: 0.1 };
    return { normal: 0.5, rain: 0.25, sunny: 0.25 };
  }

  // Local colour for the paper: no effect on the game, just a living town.
  const FLAVOR = [
    'The local football club won the derby 2-1. Fans celebrated until late.',
    'A new mural was painted at the station. Opinions are divided.',
    'The city council is debating more bike lanes on the high street.',
    'The library extends its opening hours on Thursdays.',
    'A dog show in the park drew a record crowd on Sunday.',
    'The bakery on Mill Street celebrates its 50th anniversary.',
    'Students return to the university next month; landlords are busy.',
    'A lost parrot was returned to its owner after three days on the church roof.',
    'The town choir is looking for new tenors.',
    'Night buses will run every 30 minutes from next month.',
    'The farmers market adds a second weekly day this season.',
    'A film crew was spotted shooting near the old harbour.',
    'Local school wins the regional science fair.',
    'The swimming pool closes for two weeks of maintenance.',
    'Residents complain about scooters parked on pavements.',
    'The theatre announces a sold-out comedy run.',
  ];

  // ------------------------------------------------------------------
  // EVENT CARDS for the coffee theme.
  //   kind:    'major' (big, paced by the director) | 'minor' | 'decision' (asks the player)
  //   weight:  number or (b, k) => number  — your choices change the odds
  //   when:    (b, k) => bool              — conditions
  //   cooldown: weeks before it can happen again
  //   lead:    weeks of warning (0 = surprise). Announced events appear in the paper first.
  //   bad:     counts towards the cap on bad effects running at once
  //   apply(b, ctx) -> { title, text, tone }   (ctx.sev = difficulty severity, ctx.addMod(...))
  //   decision: { options: [{ id, label, desc, cost?(b), default?, apply(b, ctx, data) }], bot(b, data) }
  // ------------------------------------------------------------------
  const hasMod = (b, kind) => b.modifiers.some((m) => m.kind === kind);
  const COFFEE_EVENTS = [
    // ---------- city
    {
      id: 'roadworks', cat: 'city', kind: 'major', bad: true, weight: 3, cooldown: 30, lead: 2,
      when: (b) => !hasMod(b, 'traffic'),
      announce: (b, k) => ({ title: 'Roadworks on your street', tone: 'bad',
        text: `The council digs up the street outside from week ${k.at} for 3 weeks. Expect about ${Math.round(30 * k.sev)}% fewer passers-by.` }),
      apply(b, ctx) {
        ctx.addMod('traffic', 1 - 0.3 * ctx.sev, 3, 'Roadworks', { bad: true });
        return { title: 'Roadworks begin', text: 'Barriers and noise outside: fewer people walk past for 3 weeks.', tone: 'bad' };
      },
      decision: {
        title: 'Roadworks are coming: what do you do?',
        options: [
          { id: 'signs', label: 'Signs and detour flyers', desc: 'Halves the loss of passers-by during the works.', cost: (b) => 300 + 150 * b.locationLvl,
            apply(b, ctx, d) { ctx.addMod('traffic', 1 / (1 - 0.15 * ctx.sev), 3, 'Detour signs', { from: d.at }); } },
          { id: 'discount', label: 'Roadworks discount', desc: 'All prices 15% lower during the works; regulars keep coming.',
            apply(b, ctx, d) { ctx.addMod('price', 0.85, 3, 'Roadworks discount', { from: d.at }); } },
          { id: 'nothing', label: 'Do nothing', desc: 'Save your money and ride it out.', default: true, apply() {} },
        ],
        bot: (b) => (b.locationLvl >= 1 ? 'signs' : 'nothing'),
      },
    },
    {
      id: 'festival', cat: 'city', kind: 'major', weight: (b, k) => (k.season === 'Winter' ? 0.5 : 2.5), cooldown: 10, lead: 2,
      announce: (b, k) => ({ title: 'Street festival announced', tone: 'good', text: `A street festival takes over the neighbourhood in week ${k.at}. Expect about 50% more customers that week.` }),
      apply(b, ctx) { ctx.demandMult *= 1.5; return { title: 'Festival crowds', text: 'The street festival brought crowds: demand +50%.', tone: 'good' }; },
    },
    {
      id: 'market', cat: 'city', kind: 'minor', weight: 2, cooldown: 6, lead: 1,
      announce: (b, k) => ({ title: 'Market day next week', tone: 'good', text: 'The weekly market moves to your square next week: about 20% more people around.' }),
      apply(b, ctx) { ctx.demandMult *= 1.2; return { title: 'Busy market day', text: 'The market brought extra customers: demand +20%.', tone: 'good' }; },
    },
    {
      id: 'strike', cat: 'city', kind: 'major', bad: true, weight: 1.5, cooldown: 26, lead: 1,
      announce: (b, k) => ({ title: 'Transport strike called', tone: 'bad', text: `Bus and tram workers strike for 2 weeks from next week. Expect about ${Math.round(20 * k.sev)}% fewer customers.` }),
      apply(b, ctx) { ctx.addMod('demand', 1 - 0.2 * ctx.sev, 2, 'Transport strike', { bad: true }); return { title: 'Strike hits the city', text: 'With no buses or trams, fewer people come into town for 2 weeks.', tone: 'bad' }; },
    },
    {
      id: 'powercut', cat: 'city', kind: 'major', bad: true, weight: 1, cooldown: 26, lead: 0,
      apply(b, ctx) { ctx.demandMult *= 1 - 0.4 * ctx.sev; return { title: 'Power cut', text: `A power cut shut the neighbourhood down for two days: demand −${Math.round(40 * ctx.sev)}%.`, tone: 'bad' }; },
    },
    {
      id: 'breakin', cat: 'city', kind: 'minor', bad: true, weight: (b) => 0.5 + 0.3 * b.locationLvl, cooldown: 30, lead: 0,
      apply(b, ctx) { const c = Math.round((250 + 250 * b.locationLvl) * ctx.sev); ctx.extraCosts.push({ label: 'Break-in damage', amount: c }); return { title: 'Break-in overnight', text: `Thieves broke a window and took the float. Damage: €${c.toLocaleString('en')}.`, tone: 'bad' }; },
    },
    // ---------- suppliers
    {
      id: 'beanspike', cat: 'suppliers', kind: 'major', bad: true, weight: 2, cooldown: 26, lead: 2, chance: 0.75,
      when: (b) => !hasMod(b, 'supplyCost'),
      announce: (b, k) => ({ title: 'Coffee harvest in trouble', tone: 'bad', text: `Traders warn bean prices may rise about 50% from week ${k.at}, for 4 weeks (likely, not certain).` }),
      apply(b, ctx) { ctx.addMod('supplyCost', 1.5, 4, 'Bean prices +50%', { bad: true }); return { title: 'Bean prices jump', text: 'Bean prices are up 50% for 4 weeks.', tone: 'bad' }; },
      miss: { title: 'Bean scare blows over', text: 'The feared bean price rise did not happen after all.', tone: 'good' },
      decision: {
        title: 'Bean prices may jump: stock up?',
        options: [
          { id: 'stock', label: 'Buy 4 weeks of beans now', desc: 'Pay for 4 weeks of beans at today\'s price; protected if prices rise.',
            cost: (b) => Math.round(beanUse(b) * 4),
            apply(b, ctx, d) { ctx.addMod('beansPrepaid', 0, 4, 'Beans in stock', { from: d.at }); } },
          { id: 'wait', label: 'Wait and see', desc: 'Keep your cash; pay whatever the price is.', default: true, apply() {} },
        ],
        bot: (b, d, s) => (s.player.cash > beanUse(b) * 4 + 5000 ? 'stock' : 'wait'),
      },
    },
    {
      id: 'milk', cat: 'suppliers', kind: 'minor', bad: true, weight: 1.5, cooldown: 20, lead: 1,
      when: (b) => !hasMod(b, 'milkCost'),
      announce: () => ({ title: 'Milk shortage ahead', tone: 'bad', text: 'Dairies report a shortage: milk drinks cost about €0.30 more to make for 2 weeks from next week.' }),
      apply(b, ctx) { ctx.addMod('milkCost', 0.3 * ctx.sev, 2, 'Milk shortage', { add: true, bad: true }); return { title: 'Milk shortage', text: 'Milk drinks cost more to make for 2 weeks.', tone: 'bad' }; },
    },
    {
      id: 'supplierbust', cat: 'suppliers', kind: 'major', bad: true, weight: 1, cooldown: 52, lead: 0,
      when: (b) => !hasMod(b, 'supplyCost'),
      apply(b, ctx) { ctx.addMod('supplyCost', 1 + 0.3 * ctx.sev, 3, 'Emergency supplier', { bad: true }); return { title: 'Your supplier went bust', text: `You had to switch to an expensive emergency supplier: ingredients +${Math.round(30 * ctx.sev)}% for 3 weeks.`, tone: 'bad' }; },
    },
    // ---------- competition (success attracts rivals)
    {
      id: 'competitor', cat: 'competition', kind: 'major', bad: true, cooldown: 40, lead: 4,
      weight: (b) => 0.6 + 0.5 * b.locationLvl + (avgProfit(b) > 1500 ? 1 : 0),
      when: (b) => !hasMod(b, 'traffic') && b.locationLvl >= 1,
      announce: (b, k) => ({ title: 'Coffee chain plans to open nearby', tone: 'bad', text: `A chain coffee bar opens down the street in week ${k.at}. Expect about ${Math.round(20 * k.sev)}% fewer passers-by for 12 weeks.` }),
      apply(b, ctx) { ctx.addMod('traffic', 1 - 0.2 * ctx.sev, 12, 'Competitor nearby', { bad: true }); return { title: 'The chain has opened', text: 'A competitor opened down the street: fewer passers-by for 12 weeks.', tone: 'bad' }; },
      decision: {
        title: 'A competitor is coming: how do you respond?',
        options: [
          { id: 'loyalty', label: 'Loyalty campaign', desc: 'Stamp cards and a promo push: marketing awareness +12, regulars stay.', cost: (b) => 800 + 400 * b.locationLvl,
            apply(b) { b.awMkt += 12; b.awWom += 4; } },
          { id: 'match', label: 'Price match', desc: 'All prices 10% lower for the first 4 weeks after they open.',
            apply(b, ctx, d) { ctx.addMod('price', 0.9, 4, 'Price match', { from: d.at }); } },
          { id: 'ignore', label: 'Ignore them', desc: 'Trust your quality.', default: true, apply() {} },
        ],
        bot: (b, d, s) => (s.player.cash > 8000 ? 'loyalty' : 'ignore'),
      },
    },
    {
      id: 'pricewar', cat: 'competition', kind: 'decision', cooldown: 20,
      when: (b) => b.modifiers.some((m) => m.label === 'Competitor nearby'),
      weight: 3,
      title: 'The chain started a price war',
      text: 'The new competitor sells coffee 20% below your prices for the next 4 weeks.',
      options: [
        { id: 'match', label: 'Match their prices', desc: 'Prices 15% lower for 4 weeks. You keep your customers but earn less per cup.',
          apply(b, ctx) { ctx.addMod('price', 0.85, 4, 'Price war'); } },
        { id: 'hold', label: 'Hold your prices', desc: 'Lose about 15% of customers for 4 weeks.', default: true,
          apply(b, ctx) { ctx.addMod('demand', 1 - 0.15 * ctx.sev, 4, 'Losing the price war', { bad: true }); } },
        { id: 'quality', label: 'Quality campaign', desc: 'Tastings and a campaign about your beans: reputation +5, lose only 5% of customers.', cost: (b) => 600 + 300 * b.locationLvl,
          apply(b, ctx) { b.reputation = clamp(b.reputation + 5, 0, 100); ctx.addMod('demand', 0.95, 4, 'Price war (holding)', { bad: true }); } },
      ],
      bot: (b, d, s) => (s.player.cash > 5000 ? 'quality' : 'hold'),
    },
    {
      id: 'rivalcloses', cat: 'competition', kind: 'minor', weight: 1, cooldown: 30, lead: 0,
      when: (b) => b.modifiers.some((m) => m.label === 'Competitor nearby'),
      apply(b) { b.modifiers = b.modifiers.filter((m) => m.label !== 'Competitor nearby'); b.awWom += 3; return { title: 'Rival closes early', text: 'The chain coffee bar down the street closed. Its customers are coming your way.', tone: 'good' }; },
    },
    // ---------- staff (more staff, more staff issues; overwork makes it worse)
    {
      id: 'quit', cat: 'staff', kind: 'minor', bad: true, cooldown: 4, lead: 0,
      weight: (b, k) => totalStaff(b) * 0.4 * (1 + Math.min(2, b.overwork / 3)) * (b.flags.raiseDeclinedUntil > k.week ? 2 : 1),
      when: (b) => totalStaff(b) > 0,
      apply(b, ctx) {
        const t = getTheme(b);
        const pool = t.roles.filter((r) => b.staff[r.id] > 0);
        const role = pool[Math.floor(ctx.rand() * pool.length)];
        b.staff[role.id] -= 1;
        const why = b.overwork >= 3 ? ' They said the queues were exhausting.' : '';
        return { title: 'Staff member quits', text: `One of your ${role.plural.toLowerCase()} quit without notice.${why}`, tone: 'bad' };
      },
    },
    {
      id: 'flu', cat: 'staff', kind: 'minor', bad: true, cooldown: 8, lead: 0,
      weight: (b, k) => (totalStaff(b) >= 2 ? 1 : 0) * (k.season === 'Winter' ? 3 : 1),
      apply(b, ctx) { ctx.addMod('barCap', 0.8, 1, 'Staff off sick', { bad: true }); return { title: 'Flu in the team', text: 'Part of your team is off sick this week: the bar is 20% slower.', tone: 'bad' }; },
    },
    {
      id: 'raise', cat: 'staff', kind: 'decision', cooldown: 45,
      // Staff only ask when their pay is not already above the town average, and more often when overworked
      when: (b) => totalStaff(b) >= 2 && b.wageBonus < 1.12,
      weight: (b) => (1 + totalStaff(b) * 0.2) * (1 + Math.min(2, b.overwork / 3)),
      title: 'Your team asks for a raise',
      text: 'Your staff say they work hard and ask for 4% more pay.',
      options: [
        { id: 'pay', label: 'Give the raise', desc: 'All wages +4% from now on. The team is happy and loyal.',
          apply(b) { b.wageBonus = Math.round(b.wageBonus * 1.04 * 1000) / 1000; b.flags.raiseDeclinedUntil = 0; } },
        { id: 'bonus', label: 'One-off bonus', desc: 'A bonus of one week\'s wages now; they will ask again later.', cost: (b) => Math.round(weeklyWages(b)),
          apply(b, ctx) { b.flags.raiseDeclinedUntil = ctx.week + 6; } },
        { id: 'no', label: 'Say no', desc: 'Keep wages as they are. For 12 weeks, staff are twice as likely to quit.', default: true,
          apply(b, ctx) { b.flags.raiseDeclinedUntil = ctx.week + 12; } },
      ],
      bot: (b, d, s) => (s.player.cash > 6000 ? 'pay' : 'bonus'),
    },
    // ---------- equipment (old machines break more; a maintenance contract helps)
    {
      id: 'breakdown', cat: 'equipment', kind: 'minor', bad: true, cooldown: 6, lead: 0,
      weight: (b, k) => (1 + (k.week - b.machineSince) / 52) * (b.systems.maint ? 0.3 : 1),
      apply(b, ctx) {
        if (b.systems.maint) return { title: 'Machine hiccup', text: 'Your espresso machine broke down, but the technician fixed it the same day at no cost.', tone: 'good' };
        const cost = Math.round(300 * (b.machineLvl + 1) * ctx.sev);
        ctx.extraCosts.push({ label: 'Machine repair', amount: cost });
        ctx.addMod('barCap', 0.7, 1, 'Machine being repaired', { bad: true });
        return { title: 'Espresso machine breaks down', text: `Repair: €${cost.toLocaleString('en')}, and the bar ran 30% slower this week.`, tone: 'bad' };
      },
    },
    // ---------- inspections
    {
      id: 'inspection', cat: 'inspection', kind: 'minor', weight: (b) => (b.cleanliness < 0.7 ? 3 : 1.5), cooldown: 8, lead: 0,
      apply(b, ctx) {
        if (b.cleanliness < 0.7) {
          const fine = Math.round(500 * (b.locationLvl + 2) * ctx.sev);
          ctx.extraCosts.push({ label: 'Hygiene fine', amount: fine });
          b.reputation = clamp(b.reputation - 10 * ctx.sev, 0, 100);
          return { title: 'Inspector finds a dirty shop', text: `Surprise health inspection: €${fine.toLocaleString('en')} fine and reputation −${Math.round(10 * ctx.sev)}.`, tone: 'bad' };
        }
        b.reputation = clamp(b.reputation + 3, 0, 100);
        return { title: 'Spotless inspection', text: 'Surprise health inspection: spotless! Reputation +3.', tone: 'good' };
      },
    },
    // ---------- press and social media
    {
      id: 'review', cat: 'press', kind: 'minor', weight: 2.5, cooldown: 6, lead: 0,
      apply(b, ctx) {
        const good = ctx.quality >= 60 && b.cleanliness >= 0.8;
        if (good) { b.reputation = clamp(b.reputation + 8, 0, 100); b.awSocial += 5; return { title: 'Glowing review', text: 'A food blogger raved about your coffee. Reputation +8.', tone: 'good' }; }
        b.reputation = clamp(b.reputation - 8 * ctx.sev, 0, 100);
        return { title: 'Harsh review', text: `A food blogger called your coffee "burnt dishwater". Reputation −${Math.round(8 * ctx.sev)}.`, tone: 'bad' };
      },
    },
    {
      id: 'viralbad', cat: 'press', kind: 'minor', bad: true, cooldown: 20, lead: 0,
      weight: (b) => ((b.lastReport && b.lastReport.lost > b.lastReport.demand * 0.2) ? 1.5 : 0) + (b.cleanliness < 0.75 ? 1.5 : 0),
      apply(b, ctx) { b.reputation = clamp(b.reputation - 6 * ctx.sev, 0, 100); b.awSocial = Math.max(0, b.awSocial - 4); return { title: 'Angry post goes viral', text: 'A customer posted about the long queue and messy tables. It was shared thousands of times.', tone: 'bad' }; },
    },
    {
      id: 'influencer', cat: 'press', kind: 'minor', weight: (b) => (b.reputation > 60 ? 2 : 0.8), cooldown: 8, lead: 0,
      apply(b) { b.awSocial += 12; return { title: 'Influencer visit', text: 'A local influencer posted your latte art. Lots of new followers.', tone: 'good' }; },
    },
    // ---------- opportunities (decisions)
    {
      id: 'catering', cat: 'opportunity', kind: 'decision', cooldown: 12, weight: 2,
      when: (b) => b.locationLvl >= 1,
      title: 'Catering request',
      text: 'An office down the road wants coffee for a big meeting next week.',
      setup: (b) => { const n = 200 + 150 * b.locationLvl; return { cups: n, pay: Math.round(n * 2.3) }; },
      describe: (b, d) => `An office wants ${d.cups} coffees delivered next week and pays €${d.pay.toLocaleString('en')}. Your bar will be busy making them.`,
      options: [
        { id: 'accept', label: 'Accept the order', desc: 'Extra income, but the bar has less time for walk-in customers next week.',
          apply(b, ctx, d) { ctx.addMod('contract', 1, 1, 'Catering order', { from: ctx.week + 1, cups: d.cups, pay: d.pay }); } },
        { id: 'decline', label: 'Decline politely', desc: 'Keep the bar free for your regulars.', default: true, apply() {} },
      ],
      bot: (b) => { const r = b.lastReport; return r && !r.bottleneck ? 'accept' : 'decline'; },
    },
    {
      id: 'officedeal', cat: 'opportunity', kind: 'decision', cooldown: 40, weight: 1,
      when: (b) => b.locationLvl >= 2 && !hasMod(b, 'contract'),
      title: 'Office contract offered',
      text: 'A company nearby wants a standing coffee order for its staff.',
      setup: (b) => { const n = 120 + 80 * b.locationLvl; return { cups: n, pay: Math.round(n * 2.0) }; },
      describe: (b, d) => `${d.cups} coffees every week for 12 weeks at €${d.pay.toLocaleString('en')} a week. Steady money, but it takes bar time every week.`,
      options: [
        { id: 'sign', label: 'Sign for 12 weeks', desc: 'Guaranteed weekly income; less bar time for walk-ins.',
          apply(b, ctx, d) { ctx.addMod('contract', 1, 12, 'Office contract', { from: ctx.week + 1, cups: d.cups, pay: d.pay }); } },
        { id: 'pass', label: 'Pass', desc: 'Keep full flexibility.', default: true, apply() {} },
      ],
      bot: (b) => { const r = b.lastReport; return r && !r.bottleneck ? 'sign' : 'pass'; },
    },
    {
      id: 'magazine', cat: 'opportunity', kind: 'decision', cooldown: 16, weight: 1.5,
      title: 'Advert in the town magazine',
      text: 'The town magazine offers you a full-page advert in its next issue.',
      setup: (b) => ({ price: 400 + 400 * b.locationLvl }),
      describe: (b, d) => `A full-page advert costs €${d.price.toLocaleString('en')} and reaches most households in town.`,
      options: [
        { id: 'buy', label: 'Buy the advert', desc: 'Marketing awareness +10 (it fades over the following weeks).', cost: (b, d) => d.price,
          apply(b) { b.awMkt += 10; } },
        { id: 'skip', label: 'No thanks', desc: 'Save the money.', default: true, apply() {} },
      ],
      bot: (b, d, s) => (s.player.cash > d.price + 6000 && b.awareness < 70 ? 'buy' : 'skip'),
    },
    {
      id: 'charity', cat: 'opportunity', kind: 'decision', cooldown: 26, weight: 1,
      title: 'Charity run sponsorship',
      text: 'The organisers of the town charity run ask if you would sponsor the water stations.',
      setup: () => ({ price: 300 }),
      describe: () => 'Sponsoring costs €300. Your name will be on every water station along the route.',
      options: [
        { id: 'sponsor', label: 'Sponsor the run', desc: 'Reputation +4, word of mouth +3.', cost: () => 300,
          apply(b) { b.reputation = clamp(b.reputation + 4, 0, 100); b.awWom += 3; } },
        { id: 'decline', label: 'Decline', desc: 'Keep the money.', default: true, apply() {} },
      ],
      bot: (b, d, s) => (s.player.cash > 4000 ? 'sponsor' : 'decline'),
    },
  ];
  // helpers used by the cards
  function beanUse(b) {
    const t = THEMES[b.themeId], r = b.lastReport, sup = t.supplies[b.supplyIdx];
    const cups = r ? r.served : 300;
    return cups * 1.1 * sup.costPerUnit * ((b.econ && b.econ.supply) || 1);
  }
  function weeklyWages(b) {
    const t = THEMES[b.themeId];
    return sum(t.roles, (r) => b.staff[r.id] * r.wage) * ((b.econ && b.econ.wage) || 1) * (b.wageBonus || 1);
  }
  function avgProfit(b) {
    const h = b.history.slice(-8);
    return h.length ? sum(h, (x) => x.profit) / h.length : 0;
  }

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
        { id: 'cappuccino', name: 'Cappuccino', icon: '☕', kind: 'drink', milk: true, fairBase: 2.4, cost: 0.35, beans: 1.0, prep: 1.4, popularity: 1.4, startPrice: 3.2, startOn: true },
        { id: 'latte',      name: 'Latte',      icon: '🥛', kind: 'drink', milk: true, fairBase: 2.6, cost: 0.45, beans: 1.0, prep: 1.5, popularity: 1.2, startPrice: 3.4, startOn: false },
        { id: 'flatwhite',  name: 'Flat white', icon: '☕', kind: 'drink', milk: true, fairBase: 2.9, cost: 0.45, beans: 1.3, prep: 1.7, popularity: 1.0, startPrice: 3.9,
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
        { id: 'maint', name: 'Maintenance contract', icon: '🔧', cost: 0, weekly: 35, registerBonus: 0,
          desc: 'A technician services your machine every month. Breakdowns become rare and are repaired for free.' },
      ],
      events: COFFEE_EVENTS,
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

  // Multi-week effects ("modifiers"): { kind, mult, weeks, label, from?, bad?, add? }. Active from week `from`.
  const isActive = (m, week) => (m.from || 0) <= week;
  function modMult(b, kind, week) {
    return b.modifiers.filter((m) => m.kind === kind && isActive(m, week)).reduce((p, m) => p * m.mult, 1);
  }
  function modAdd(b, kind, week) {
    return b.modifiers.filter((m) => m.kind === kind && isActive(m, week)).reduce((p, m) => p + m.mult, 0);
  }
  const econ = (b) => b.econ || { wage: 1, supply: 1, fair: 1, rent: 1 };

  function fairPriceOf(b, p) {
    const t = getTheme(b);
    const q = t.supplies[b.supplyIdx].quality;
    return (p.fairBase + (p.kind === 'food' ? 0 : (q / 100) * t.qualityPriceBonus) + (b.reputation / 100) * t.repPriceBonus) * econ(b).fair;
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
    const priceMult = modMult(b, 'price', week);   // temporary discounts (roadworks, price war)
    const drinks = items.filter((p) => p.kind !== 'food').map((p) => {
      const fair = fairPriceOf(b, p), price = b.menu[p.id].price * priceMult, pf = priceFactor(price / fair);
      const w = p.popularity * (p.summer ? (1 - 0.6 * sc) * coldBoost : 1);
      return { p, fair, price, pf, a: w * pf };
    });
    const totalA = sum(drinks, (r) => r.a);
    drinks.forEach((r) => (r.share = totalA > 0 ? r.a / totalA : 0));
    const food = items.filter((p) => p.kind === 'food').map((p) => {
      const fair = fairPriceOf(b, p), price = b.menu[p.id].price * priceMult, pf = priceFactor(price / fair);
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
    const bar = Math.round(((b.staff.barista + t.owner.barista) * t.machines[b.machineLvl].perStaff * mix.efficiency * modMult(b, 'barCap', week)) / mix.load);
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
      modifiers: [], forecast: null, history: [], lastReport: null,
      // event system (v4)
      scheduled: [],          // announced events: { id, at (week), chance?, data? }
      cooldowns: {},          // event id -> week it last happened
      calm: 2,                // weeks since the last major event (the director's tension)
      lastDecision: 0,        // week the last decision was offered
      decision: null,         // open decision the player must answer before the next week
      weatherNext: null,      // forecast for next week: { kind, chance }
      paper: null,            // this week's newspaper (The Courier)
      econ: { wage: 1, supply: 1, fair: 1, rent: 1 },   // yearly price rises
      wageBonus: 1,           // raises given to staff
      leaseUntil: 0,          // rent fixed until this week (signed lease)
      machineSince: 0,        // week the current machine was bought (old machines break more)
      overwork: 0,            // weeks in a row with long queues (staff get tired and quit)
      flags: {},
    };
  }
  // Goals the player can pick on the start screen (company value to reach within maxWeeks)
  const GOALS = [250000, 500000, 1000000, 2000000, 5000000];

  function newGame(shopName, themeId = 'coffee', opts = {}) {
    const t = THEMES[themeId];
    const difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    const s = {
      version: 4,
      week: 0,
      maxWeeks: 260,          // 5 years
      goal: GOALS.includes(opts.goal) ? opts.goal : 1000000,   // target valuation
      difficulty,
      status: 'playing',      // playing | won | bankrupt | timeup
      endless: false,         // true after "keep playing": no goal check, no time limit
      goalReachedWeek: null,  // week the goal was reached (stays set when playing on)
      player: { cash: DIFFICULTY[difficulty].startCash || t.startCash, loan: 0, maxLoan: 30000, interestRate: 0.005 },
      businesses: [newBusiness('b1', shopName || 'My Coffee', themeId)],
      log: [],
      valuationHistory: [],
    };
    for (const b of s.businesses) planWeather(s, b, 0, Math.random);
    return s;
  }
  // Bring saves from older versions up to date
  function migrate(state) {
    if (!state) return state;
    for (const b of state.businesses) {
      const t = getTheme(b);
      if (b.awMkt === undefined) { b.awMkt = 0; b.awWom = b.awareness / 2; b.awSocial = b.awareness / 2; }
      if (!b.systems) b.systems = {};
      if (!b.equipment) b.equipment = {};
      if (b.cleanliness === undefined) b.cleanliness = 1;
      if (typeof b.staff === 'number') { const n = b.staff; b.staff = {}; t.roles.forEach((r) => (b.staff[r.id] = 0)); b.staff.barista = n; }
      if (!b.menu) {
        b.menu = {};
        for (const p of t.products) b.menu[p.id] = { on: !!p.startOn || (isUnlocked(b, p) && p.kind === 'drink'), price: p.startPrice };
        delete b.price;
      }
      // v4: event system
      if (!b.scheduled) { b.scheduled = []; delete b.upcoming; }
      if (!b.cooldowns) b.cooldowns = {};
      if (b.calm === undefined) b.calm = 2;
      if (b.lastDecision === undefined) b.lastDecision = state.week;
      if (b.decision === undefined) b.decision = null;
      if (!b.econ) b.econ = { wage: 1, supply: 1, fair: 1, rent: 1 };
      if (!b.wageBonus) b.wageBonus = 1;
      if (b.leaseUntil === undefined) b.leaseUntil = 0;
      if (b.machineSince === undefined) b.machineSince = state.week;
      if (b.overwork === undefined) b.overwork = 0;
      if (!b.flags) b.flags = {};
      if (b.weatherNext === undefined) planWeather(state, b, state.week, Math.random);
      if (b.paper === undefined) b.paper = null;
    }
    if (state.endless === undefined) state.endless = false;
    if (state.goalReachedWeek === undefined) state.goalReachedWeek = null;
    if (!state.difficulty) state.difficulty = 'normal';
    state.version = 4;
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
    const total = sum(list, (e) => e.w);
    if (total <= 0) return null;
    let x = rand() * total;
    for (const e of list) { x -= e.w; if (x <= 0) return e; }
    return list[list.length - 1];
  }
  const diffOf = (state) => DIFFICULTY[state.difficulty] || DIFFICULTY.normal;
  const fmtEUR = (v) => '€' + Math.round(v).toLocaleString('en');

  // Weather: pick next week's weather now, and how sure the forecast is.
  function planWeather(state, b, week, rand) {
    const odds = weatherOdds(week + 1);
    const kinds = Object.keys(odds);
    const pick = pickWeighted(kinds.map((k) => ({ k, w: odds[k] })), rand).k;
    const acc = diffOf(state).forecastAcc;
    b.weatherNext = { kind: pick, chance: Math.round((acc - 0.05 + rand() * 0.1) * 100) };
  }
  function actualWeather(state, b, week, rand) {
    const f = b.weatherNext;
    if (!f) return 'normal';
    if (rand() < diffOf(state).forecastAcc) return f.kind;
    const odds = weatherOdds(week);
    const others = Object.keys(odds).filter((k) => k !== f.kind);
    return pickWeighted(others.map((k) => ({ k, w: odds[k] })), rand).k;
  }

  // Context passed to event cards and decision options
  function makeCtx(state, b, week, rand) {
    const d = diffOf(state);
    const ctx = {
      week, rand, sev: d.severity, quality: getTheme(b).supplies[b.supplyIdx].quality,
      demandMult: 1, coldBoost: 1, extraCosts: [],
      addMod(kind, mult, weeks, label, opts = {}) {
        b.modifiers.push({ kind, mult, weeks, label, from: opts.from || week, bad: !!opts.bad, ...(opts.cups ? { cups: opts.cups, pay: opts.pay } : {}) });
      },
    };
    return ctx;
  }
  const cardWeight = (card, b, k) => (typeof card.weight === 'function' ? card.weight(b, k) : card.weight);
  const activeBad = (b, week) => b.modifiers.filter((m) => m.bad && isActive(m, week)).length + b.scheduled.filter((x) => x.bad).length;

  // Turn a decision card into the open decision object stored in the save (data only, no functions).
  function openDecision(card, b, state, extra = {}) {
    const data = { ...(card.setup ? card.setup(b) : {}), ...extra };
    const dec = card.decision || card;
    const text = card.describe ? card.describe(b, data) : (extra.text || card.text || '');
    b.decision = {
      card: card.id, title: dec.title || card.title, text, data,
      options: dec.options.map((o) => ({ id: o.id, label: o.label, desc: o.desc, cost: o.cost ? Math.round(o.cost(b, data)) : 0, default: !!o.default })),
    };
    b.lastDecision = state.week;
  }

  // The director: decides what happens this week, paced by "calm" (weeks since the last big event).
  function runDirector(state, b, week, ctx, rand, paper) {
    const t = getTheme(b), d = diffOf(state);
    const k = { week, sev: d.severity, season: seasonName(week) };
    const fired = [];
    const happen = (card, data) => {
      const res = card.apply(b, ctx, data);
      b.cooldowns[card.id] = week;
      if (res) { res.cat = card.cat; fired.push(res); }
      return res;
    };
    // 1) Announced events that are due this week
    for (const x of b.scheduled.filter((y) => y.at === week)) {
      const card = t.events.find((c) => c.id === x.id);
      if (!card) continue;
      if (x.chance != null && rand() > x.chance) { if (card.miss) fired.push({ ...card.miss, cat: card.cat }); continue; }
      happen(card, x);
      if (card.kind === 'major') b.calm = 0;
    }
    b.scheduled = b.scheduled.filter((y) => y.at > week);

    const eligible = (kind) => t.events.filter((c) => c.kind === kind
      && (!c.when || c.when(b, k))
      && (b.cooldowns[c.id] == null || week - b.cooldowns[c.id] >= (c.cooldown || 0))
      && !b.scheduled.some((y) => y.id === c.id)
      && !(c.bad && activeBad(b, week) >= d.maxActiveBad))
      .map((c) => ({ c, w: cardWeight(c, b, k) })).filter((e) => e.w > 0);
    const startOrSchedule = (card) => {
      if (card.lead > 0) {
        const at = week + card.lead;
        b.scheduled.push({ id: card.id, at, chance: card.chance, bad: !!card.bad });
        b.cooldowns[card.id] = week;
        const ann = card.announce(b, { ...k, at });
        paper.announced.push({ ...ann, cat: card.cat, at });
        if (card.decision && !b.decision) openDecision(card, b, state, { at, text: ann.text });
      } else happen(card);
    };

    // 2) Major event: never right after the last one (breather), likelier the longer it stays calm
    b.calm += 1;
    const pMajor = b.calm < 3 ? 0 : clamp((0.08 + 0.04 * (b.calm - 3)) * d.eventRate, 0, 0.6);
    if (rand() < pMajor) {
      const pick = pickWeighted(eligible('major'), rand);
      if (pick) { startOrSchedule(pick.c); b.calm = pick.c.lead > 0 ? -pick.c.lead : 0; }
    }
    // 3) Minor event
    if (rand() < 0.3 * d.eventRate) {
      const pick = pickWeighted(eligible('minor'), rand);
      if (pick) startOrSchedule(pick.c);
    }
    // 4) A decision, every few weeks, one at a time
    if (!b.decision && week - b.lastDecision >= d.decisionGap && rand() < 0.35) {
      const pick = pickWeighted(eligible('decision'), rand);
      if (pick) { openDecision(pick.c, b, state); b.cooldowns[pick.c.id] = week; }
    }
    return fired;
  }

  // Once a year: wages, supplier prices and customers' price expectations rise; rent is reviewed.
  function yearlyEconomy(state, b, week, paper) {
    const d = diffOf(state);
    if (week % 52 === 48 && d.rentRise > 0 && b.leaseUntil <= week + 4) {
      const at = week + 4, pct = Math.round(d.rentRise * 100);
      paper.announced.push({ title: 'Landlord announces rent review', text: `Your rent goes up ${pct}% in week ${at} unless you negotiate.`, tone: 'bad', cat: 'city', at });
      if (!b.decision) {
        b.decision = {
          card: 'rentreview', title: 'Rent review: your landlord wants more', data: { at, pct },
          text: `Your landlord raises the rent by ${pct}% from week ${at}.`,
          options: [
            { id: 'accept', label: `Accept +${pct}%`, desc: 'No fuss; rent rises as announced.', cost: 0, default: true },
            { id: 'negotiate', label: 'Negotiate', desc: 'A coin flip: half the rise, or the full rise plus €300 legal costs.', cost: 0 },
            { id: 'lease', label: 'Sign a 3-year lease', desc: `Pay a one-off fee of 4 weeks' rent; the rent rises ${Math.round(pct / 2)}% now and then stays fixed for 3 years.`, cost: Math.round(rentNow(b) * 4) },
          ],
        };
        b.lastDecision = week;
      }
    }
    if (week > 0 && week % 52 === 0) {
      b.econ.wage *= 1 + d.wageRise; b.econ.supply *= 1 + d.supplyRise; b.econ.fair *= 1 + d.priceRise;
      if (b.flags.rentRiseAt == null && b.leaseUntil <= week && d.rentRise > 0) b.econ.rent *= 1 + d.rentRise;
      if (d.wageRise || d.supplyRise) paper.items.push({ title: 'New year, new prices', tone: 'bad', cat: 'economy',
        text: `Wages rise ${Math.round(d.wageRise * 100)}% and suppliers charge ${Math.round(d.supplyRise * 100)}% more. Customers accept about ${Math.round(d.priceRise * 100)}% higher prices.` });
    }
    if (b.flags.rentRiseAt === week) {
      b.econ.rent *= 1 + b.flags.rentRisePct; delete b.flags.rentRiseAt; delete b.flags.rentRisePct;
    }
  }
  function rentNow(b) { return getTheme(b).locations[b.locationLvl].rent * econ(b).rent; }
  const DECISION_EXTRA = {
    // Rent review is a calendar event, not a card; its options are handled here.
    rentreview(state, b, opt, data, rand) {
      const pct = data.pct / 100;
      if (opt === 'accept') { b.flags.rentRiseAt = data.at; b.flags.rentRisePct = pct; return 'You accepted the rent rise.'; }
      if (opt === 'negotiate') {
        if (rand() < 0.5) { b.flags.rentRiseAt = data.at; b.flags.rentRisePct = pct / 2; return 'Negotiation worked: the rent rises only half as much.'; }
        b.flags.rentRiseAt = data.at; b.flags.rentRisePct = pct; state.player.cash -= 300; return 'The landlord would not budge: full rise, and €300 in legal costs.';
      }
      if (opt === 'lease') { b.econ.rent *= 1 + pct / 2; b.leaseUntil = state.week + 156; return 'You signed a 3-year lease: rent fixed until then.'; }
      return '';
    },
  };

  function simulateBusiness(state, b, week, rand) {
    const t = getTheme(b);
    const supply = t.supplies[b.supplyIdx];
    const ctx = makeCtx(state, b, week, rand);
    const paper = { week, items: [], announced: [], weather: null, flavor: [] };

    // 0) Weather this week (forecast last week, may differ)
    const wk = actualWeather(state, b, week, rand);
    const W = WEATHER[wk];
    ctx.demandMult *= W.demand; if (W.cold) ctx.coldBoost = W.cold;

    // 1) Yearly economy + the event director
    yearlyEconomy(state, b, week, paper);
    const events = runDirector(state, b, week, ctx, rand, paper);

    const mod = (kind) => modMult(b, kind, week);
    const loc = t.locations[b.locationLvl];
    const E = econ(b);

    // 2) Demand
    sumAwareness(b);
    const mix = computeMix(b, week, ctx.coldBoost);
    const cap = capacities(b, week, mix);
    // contracts and catering orders use bar time first
    const contracts = b.modifiers.filter((m) => m.kind === 'contract' && isActive(m, week));
    const contractCups = sum(contracts, (m) => m.cups), contractPay = sum(contracts, (m) => m.pay);
    const barForWalkIns = Math.max(0, cap.bar - Math.round(contractCups * 1.2 / mix.load));
    const trafficMult = 0.6 + (b.awareness / 100) * 0.9;
    const season = 1 + t.seasonality * seasonCos(week);
    const conversion = t.baseConversion * (0.5 + b.reputation / 100) * mix.appeal * (0.75 + 0.25 * b.cleanliness); // a dirty shop scares people off
    const noise = 0.9 + rand() * 0.2;
    const demand = Math.max(0, Math.round(
      loc.traffic * mod('traffic') * trafficMult * season * conversion * ctx.demandMult * mod('demand') * noise
    ));
    const served = Math.min(demand, barForWalkIns, cap.register);
    const bottleneck = served < demand ? (barForWalkIns <= cap.register ? 'bar' : 'register') : null;
    b.overwork = bottleneck && demand - served > demand * 0.1 && totalStaff(b) > 0 ? b.overwork + 1 : Math.max(0, b.overwork - 1);

    // 3) Sales per item
    const beanMult = mod('supplyCost') * modMult(b, 'beansPrepaid', week) * E.supply;
    const milkExtra = modAdd(b, 'milkCost', week);
    const unitCostOf = (p) => (p.cost + (p.milk ? milkExtra : 0)) * E.supply + p.beans * supply.costPerUnit * beanMult;
    const priceMult = mod('price');
    const sales = [
      ...mix.drinks.map((r) => ({ id: r.p.id, name: r.p.name, icon: r.p.icon, qty: Math.round(served * r.share), price: r.price, fair: r1(r.fair), unitCost: unitCostOf(r.p) })),
      ...mix.food.map((f) => ({ id: f.p.id, name: f.p.name, icon: f.p.icon, qty: Math.round(served * f.attach), price: f.price, fair: r1(f.fair), unitCost: unitCostOf(f.p) })),
    ];
    sales.forEach((x) => { x.revenue = x.qty * x.price; x.margin = x.qty * (x.price - x.unitCost); });

    const contractCost = contractCups * unitCostOf(t.products[0]);
    const revenue = sum(sales, (x) => x.revenue) + contractPay;
    const supplies = sum(sales, (x) => x.qty * x.unitCost) + contractCost;
    const wages = sum(t.roles, (r) => b.staff[r.id] * r.wage) * E.wage * b.wageBonus;
    const rent = loc.rent * E.rent;
    const marketing = b.marketing;
    const other = sum(ctx.extraCosts, (c) => c.amount);
    const systems = sum(t.systems, (x) => (b.systems[x.id] ? x.weekly : 0));
    const costs = supplies + wages + rent + marketing + other + systems;
    const profit = revenue - costs;

    // 4) Where did customers come from? (shares of the traffic multiplier)
    const k = 0.9 / 100 / trafficMult;
    const share = { passersby: 0.6 / trafficMult, wordOfMouth: b.awWom * k, marketing: b.awMkt * k, social: b.awSocial * k };
    const sources = {};
    for (const key in share) sources[key] = Math.round(served * share[key]);
    const walkInRevenue = revenue - contractPay;
    const marginPerCustomer = served > 0 ? (walkInRevenue - (supplies - contractCost)) / served : 0;
    const marketingReturn = Math.round(sources.marketing * marginPerCustomer - marketing);

    // 5) Reputation: quality, service (queues), value for money, cleanliness
    const service = demand > 0 ? served / demand : 1;
    const soldQty = sum(sales, (x) => x.qty);
    const value = soldQty > 0 ? sum(sales, (x) => x.qty * clamp(50 + ((x.fair - x.price) / x.fair) * 150, 0, 100)) / soldQty : 50;
    b.cleanliness = clamp(cleaningCapacity(b) / Math.max(served + contractCups * 0.3, 1), 0, 1);
    const target = supply.quality * 0.45 + service * 100 * 0.2 + value * 0.15 + b.cleanliness * 100 * 0.2;
    b.reputation = clamp(b.reputation + (target - b.reputation) * 0.15, 0, 100);

    // 6) Awareness: marketing + word of mouth + social − forgetting
    const decay = 0.06;
    b.awMkt += 1.5 * Math.sqrt(b.marketing / 100) - decay * b.awMkt;
    b.awWom += b.reputation / 55 - decay * b.awWom;
    b.awSocial += Math.max(0, b.reputation - 60) / 40 - decay * b.awSocial;
    sumAwareness(b);

    // effects run down (only once they have started)
    b.modifiers = b.modifiers.map((m) => (isActive(m, week) ? { ...m, weeks: m.weeks - 1 } : m)).filter((m) => m.weeks > 0);

    // 7) The paper: this week's news, next week's weather and what is announced
    paper.items.unshift(...events);
    planWeather(state, b, week, rand);
    paper.weather = { now: wk, nowText: W.text, next: b.weatherNext.kind, nextName: WEATHER[b.weatherNext.kind].name, chance: b.weatherNext.chance };
    paper.upcoming = b.scheduled.map((x) => { const c = t.events.find((e) => e.id === x.id); return { id: x.id, at: x.at, likely: x.chance != null, title: c && c.announce ? c.announce(b, { week, sev: diffOf(state).severity, season: seasonName(week), at: x.at }).title : x.id }; });
    const fl = FLAVOR.slice().sort(() => rand() - 0.5);
    paper.flavor = fl.slice(0, 1 + Math.floor(rand() * 2));
    b.paper = paper;

    // Short "next week" line for the UI: weather + anything announced for next week
    const nextUp = b.scheduled.filter((x) => x.at === week + 1).map((x) => (paper.upcoming.find((u) => u.id === x.id) || {}).title).filter(Boolean);
    const wn = WEATHER[b.weatherNext.kind];
    b.forecast = { text: `Weather: ${b.weatherNext.chance}% chance of ${wn.name}.${nextUp.length ? ' Also: ' + nextUp.join('; ') + '.' : ''}`,
      tone: wn.demand < 0.95 || nextUp.length && paper.announced.some((a) => a.at === week + 1 && a.tone === 'bad') ? 'bad' : wn.demand > 1.02 ? 'good' : 'none' };

    const report = {
      week, demand, served, lost: demand - served, bottleneck, barCap: barForWalkIns, registerCap: cap.register,
      sales, avgTicket: served > 0 ? walkInRevenue / served : 0, cleanliness: b.cleanliness,
      revenue, costs: { supplies, wages, rent, marketing, other, systems }, totalCosts: costs, profit, events,
      service: Math.round(service * 100), sources, marketingReturn, weather: wk,
      contract: contractCups ? { cups: contractCups, pay: contractPay } : null,
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

  // Apply a decision option. Used by Actions.decide and, if the player did not choose, by tick (default option).
  function resolveDecision(state, b, optId, rand, auto = false) {
    const dec = b.decision;
    if (!dec) return 'There is nothing to decide.';
    const opt = dec.options.find((o) => o.id === optId);
    if (!opt) return 'Unknown option.';
    if (opt.cost > state.player.cash) return `You need €${opt.cost.toLocaleString('en')} for that.`;
    state.player.cash -= opt.cost;
    let note = '';
    if (DECISION_EXTRA[dec.card]) note = DECISION_EXTRA[dec.card](state, b, optId, dec.data, rand);
    else {
      const card = getTheme(b).events.find((c) => c.id === dec.card);
      const def = (card.decision || card).options.find((o) => o.id === optId);
      const ctx = makeCtx(state, b, state.week, rand);
      def.apply(b, ctx, dec.data);
      // one-off costs from an option are paid now
      for (const c of ctx.extraCosts) state.player.cash -= c.amount;
    }
    state.log.unshift({ week: state.week, text: `${dec.title} → ${opt.label}${auto ? ' (no answer, default)' : ''}.${note ? ' ' + note : ''}`, tone: 'none' });
    b.decision = null;
    return null;
  }

  // What a sensible player would pick (used by the simulator bots, and later maybe as an advisor hint)
  function suggestDecision(state, b) {
    const dec = b.decision;
    if (!dec) return null;
    if (dec.card === 'rentreview') return state.player.cash > dec.options.find((o) => o.id === 'lease').cost + 8000 ? 'lease' : 'accept';
    const card = getTheme(b).events.find((c) => c.id === dec.card);
    const def = card && (card.decision || card);
    const pick = def && def.bot ? def.bot(b, dec.data, state) : null;
    const opt = dec.options.find((o) => o.id === pick);
    return opt && opt.cost <= state.player.cash ? pick : (dec.options.find((o) => o.default) || dec.options[0]).id;
  }

  function tick(state, rand = Math.random) {
    if (state.status !== 'playing') return state;
    const s = clone(state);
    // An open decision must be answered first; if it wasn't (e.g. old UI), take the default.
    for (const b of s.businesses) if (b.decision) {
      const def = b.decision.options.find((o) => o.default) || b.decision.options[0];
      resolveDecision(s, b, def.id, rand, true);
    }
    s.week += 1;

    let totalProfit = 0;
    for (const b of s.businesses) {
      const rep = simulateBusiness(s, b, s.week, rand);
      totalProfit += rep.profit;
      for (const e of rep.events) s.log.unshift({ week: s.week, text: e.text, tone: e.tone });
      for (const a of b.paper.announced) s.log.unshift({ week: s.week, text: a.text, tone: a.tone });
      for (const it of b.paper.items.filter((x) => x.cat === 'economy')) s.log.unshift({ week: s.week, text: it.text, tone: it.tone });
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
    s.log = s.log.slice(0, 60);
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
      s.player.cash -= next.cost; b.machineLvl += 1; b.machineSince = s.week;
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
    // Answer the open decision (must happen before the next week)
    decide: (state, bid, optionId) => act(state, bid, (s, b) => resolveDecision(s, b, optionId, Math.random)),
    // After winning (or when time is up): keep going with no goal check and no time limit
    keepPlaying: (state) => act(state, null, (s) => {
      if (s.status !== 'won' && s.status !== 'timeup') return 'You can only play on after reaching the goal or the time limit.';
      s.status = 'playing'; s.endless = true;
      s.log.unshift({ week: s.week, text: 'You decided to keep building. No goal, no time limit.', tone: 'good' });
    }),
  };

  const api = {
    THEMES, GOALS, DIFFICULTY, WEATHER, newGame, tick, migrate, Actions, getTheme, suggestDecision,
    fairPriceOf, isUnlocked, meets, capacities, cleaningCapacity, computeMix, totalStaff,
    valuation, businessValue, seasonName,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TycoonEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
