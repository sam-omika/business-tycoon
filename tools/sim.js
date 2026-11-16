// Headless balance test: npm run sim  (or: node tools/sim.js)
// Plays many games automatically with simple strategies and reports win rates.
const E = require('../engine.js');

function strategy(s, o) {
  let st = s;
  const b = () => st.businesses[0];
  const t = E.getTheme(b());
  const go = (r) => { if (!r.error) st = r.state; return !r.error; };

  // Beans
  go(E.Actions.setSupply(st, 'b1', b().locationLvl >= o.premiumAt ? 2 : o.startSupply));
  // Menu: everything unlocked on (if o.fullMenu), priced at fair × markup
  for (const p of t.products) {
    if (!E.isUnlocked(b(), p)) continue;
    const want = o.fullMenu || p.startOn;
    if (b().menu[p.id].on !== want) go(E.Actions.toggleItem(st, 'b1', p.id));
    const target = Math.round(E.fairPriceOf(b(), p) * o.markup * 10) / 10;
    if (Math.abs(b().menu[p.id].price - target) >= 0.1) go(E.Actions.setItemPrice(st, 'b1', p.id, target));
  }
  // Team: fix the bottleneck
  const rep = b().lastReport;
  if (rep) {
    const cash = () => st.player.cash;
    if (rep.lost > rep.demand * 0.05 && cash() > 2500) go(E.Actions.hire(st, 'b1', rep.bottleneck === 'bar' ? 'barista' : 'cashier'));
    if (rep.cleanliness < o.cleanTarget && cash() > 2500) go(E.Actions.hire(st, 'b1', 'cleaner'));
    const cap = E.capacities(b(), st.week);
    const perBarista = cap.bar / (b().staff.barista + 1);
    if (!rep.bottleneck && b().staff.barista > 0 && rep.served < cap.bar - perBarista * 1.1) go(E.Actions.fire(st, 'b1', 'barista'));
    if (!rep.bottleneck && b().staff.cashier > 0 && rep.served < cap.register - 900 * 1.1) go(E.Actions.fire(st, 'b1', 'cashier'));
    go(E.Actions.setMarketing(st, 'b1', Math.min(o.mktCap, rep.revenue * o.mktShare)));
  }
  // Decisions: smart bots pick what a sensible player would; others take the default
  if (b().decision) go(E.Actions.decide(st, 'b1', o.smart ? E.suggestDecision(st, b()) : b().decision.options.find((x) => x.default).id));
  if (o.maint && !b().systems.maint && st.week - b().machineSince > 40 && st.player.cash > 3000) go(E.Actions.buySystem(st, 'b1', 'maint'));
  // Investments
  const nextLoc = t.locations[b().locationLvl + 1];
  if (nextLoc && st.player.cash > nextLoc.cost + 5000) go(E.Actions.upgradeLocation(st, 'b1'));
  const nextM = t.machines[b().machineLvl + 1];
  if (nextM && st.player.cash > nextM.cost + 3000) go(E.Actions.upgradeMachine(st, 'b1'));
  if (o.equipment) for (const e of t.equipment) if (st.player.cash > e.cost + 4000) go(E.Actions.buyEquipment(st, 'b1', e.id));
  if (o.pos && b().locationLvl >= 1 && st.player.cash > 6000) go(E.Actions.buySystem(st, 'b1', 'pos'));
  return st;
}

const DIFF = process.argv[2] || 'normal';
function run(o, n = 150) {
  let won = 0, bankrupt = 0, timeup = 0; const winWeeks = []; const finals = [];
  for (let i = 0; i < n; i++) {
    let s = E.newGame('Test', 'coffee', { difficulty: DIFF });
    while (s.status === 'playing') { s = strategy(s, o); s = E.tick(s); }
    if (s.status === 'won') { won++; winWeeks.push(s.week); }
    if (s.status === 'bankrupt') bankrupt++;
    if (s.status === 'timeup') timeup++;
    finals.push(E.valuation(s));
  }
  winWeeks.sort((a, b) => a - b); finals.sort((a, b) => a - b);
  const med = (a) => a.length ? a[Math.floor(a.length / 2)] : '-';
  console.log(`${o.label.padEnd(30)} win ${(won / n * 100).toFixed(0).padStart(3)}%  bankrupt ${(bankrupt / n * 100).toFixed(0).padStart(3)}%  timeup ${(timeup / n * 100).toFixed(0).padStart(3)}%  median win wk ${String(med(winWeeks)).padStart(3)}  median value €${Math.round(med(finals)).toLocaleString('en')}`);
}

console.log(`Difficulty: ${DIFF}`);
const base = { markup: 1.0, startSupply: 1, premiumAt: 2, mktShare: 0.06, mktCap: 1500, fullMenu: true, equipment: true, pos: true, cleanTarget: 0.85, smart: true, maint: true };
run({ ...base, label: 'Specialty from café on' });
run({ ...base, label: 'Basic menu, no extras', fullMenu: false, equipment: false, pos: false, smart: false, maint: false });
run({ ...base, label: 'Premium pricing', markup: 1.12, startSupply: 2, premiumAt: 0 });
run({ ...base, label: 'Ignore cleaning', cleanTarget: 0 });
run({ ...base, label: 'Cheap & cheerful', markup: 0.85, startSupply: 0, premiumAt: 9, smart: false });
run({ ...base, label: 'Heavy marketing', mktShare: 0.2, mktCap: 4000 });
run({ ...base, label: 'Good beans throughout', premiumAt: 9 });
run({ ...base, label: 'Good beans, +8% price', premiumAt: 9, markup: 1.08 });
run({ ...base, label: 'Ignores decisions (defaults)', premiumAt: 9, markup: 1.08, smart: false, maint: false });
