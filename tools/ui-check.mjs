// Browser check for the UI: drives headless Chrome, presses real keys, plays weeks, answers decisions,
// checks the page never scrolls on desktop, and saves screenshots.
//   npm run dev            (in another terminal)
//   node tools/ui-check.mjs [url] [screenshot-dir]
// Needs Google Chrome (macOS path below, or set CHROME=/path/to/chrome).
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.argv[2] || 'http://localhost:5173/';
const OUT = process.argv[3] || join(tmpdir(), 'tycoon-ui-check');
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9335;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'tycoon-'))}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- DevTools protocol plumbing
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(JSON.stringify(d.params.args));
  if (d.method === 'Network.loadingFailed') errors.push('load failed: ' + d.params.errorText);
};
const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const KEYS = { ' ': ['Space', 32], Enter: ['Enter', 13], Escape: ['Escape', 27], '?': ['Slash', 191] };
for (const c of 'mtibpscn') KEYS[c] = ['Key' + c.toUpperCase(), c.toUpperCase().charCodeAt(0)];
async function press(key, opts = {}) {
  const [code, vk] = KEYS[key];
  const text = key.length === 1 ? key : (key === 'Enter' ? '\r' : undefined);
  const modifiers = key === '?' ? 8 : 0;
  await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, text, modifiers, autoRepeat: !!opts.repeat });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers });
  await sleep(150);
}
let fails = 0;
const check = (name, ok, info = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`); if (!ok) fails++; };
const save = () => ev(`JSON.parse(localStorage.getItem('business-tycoon-save-v1'))`);
const overlayOpen = () => ev(`!document.getElementById('overlay').classList.contains('hidden')`);
const hideToast = () => ev(`document.getElementById('toast').classList.add('hidden')`);
async function shot(name) {
  await sleep(450);
  writeFileSync(join(OUT, name), Buffer.from((await cmd('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const ov = await ev(`(() => 'page ' + (document.documentElement.scrollHeight - innerHeight) + ' | ' + [...document.querySelectorAll('.pane')].map(p => p.className.replace('pane ', '') + ':' + (p.scrollHeight - p.clientHeight)).join(' '))()`);
  console.log('shot ', name.padEnd(30), ov);
}
const size = async (w, h, mobile = false) => { await cmd('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await sleep(300); };
const theme = async (mode) => ev(`(() => { const b = [...document.querySelectorAll('.theme-btn')].find(x => x.offsetParent); for (let i = 0; i < 3 && !b.textContent.endsWith('${mode}'); i++) b.click(); })()`);
async function answerDecisionIfAny() {
  const s = await save();
  if (!s.businesses[0].decision) return false;
  await ev(`document.querySelector('#decisionCard .opt:not([disabled])').click()`); await sleep(100);
  return true;
}

await cmd('Runtime.enable'); await cmd('Page.enable'); await cmd('Network.enable');
await size(1440, 900);
await cmd('Page.navigate', { url: URL }); await sleep(1200);
await ev('localStorage.clear()'); await cmd('Page.reload'); await sleep(1200);

// --- start screen
await ev(`document.getElementById('shopName').focus()`);
await cmd('Input.insertText', { text: 'Bean There' });
await press('Enter');
check('Enter in the name field starts the game', await ev(`!document.getElementById('game').classList.contains('hidden')`));

// --- Space and its safety rules
const w0 = (await save()).week;
await press(' ');
check('Space opens next week', (await save()).week === w0 + 1);
await press(' ', { repeat: true });
check('held Space does not fast-forward', (await save()).week === w0 + 1);
await answerDecisionIfAny();
const p0 = (await save()).businesses[0].menu.espresso.price;
await ev(`(() => { const b = document.querySelector('[data-act="iprice"][data-d="0.1"]'); b.focus(); b.click(); })()`); await sleep(100);
const p1 = (await save()).businesses[0].menu.espresso.price;
await press(' ');
const p2 = (await save()).businesses[0].menu.espresso.price;
check('Space after clicking + does not press + again', Math.abs(p2 - p1) < 1e-9 && p1 !== p0, `${p0} -> ${p1} -> ${p2}`);

// --- tabs
for (const [k, cid] of [['b', 'cardBank'], ['p', 'cardProgress'], ['t', 'cardTeam'], ['i', 'cardInvest'], ['s', 'cardSales'], ['c', 'cardSources'], ['n', 'cardNews'], ['m', 'cardMenu']]) {
  await press(k);
  check(`"${k}" shows the ${cid} tab`, await ev(`(() => { const p = document.getElementById('${cid}'); const r = p.getBoundingClientRect(); return !p.hidden && r.height > 0 && document.querySelector('[data-tab="${cid}"]').getAttribute('aria-selected') === 'true'; })()`));
}
await press('?');
check('"?" opens the shortcut list', (await overlayOpen()) && (await ev(`document.getElementById('modal').textContent.includes('Keyboard shortcuts')`)));
await press('Escape');
check('Esc closes it', !(await overlayOpen()));
await ev(`document.getElementById('newGameBtn').click()`);
check('"Start over?" focuses Cancel', (await ev(`document.activeElement.textContent`)) === 'Cancel');
await press(' ');
await press('Enter');
check('Enter in "Start over?" = Cancel (game kept)', !(await overlayOpen()) && (await ev(`!document.getElementById('game').classList.contains('hidden')`)));

// --- play until a decision appears, test that it blocks the week
let decisionTested = false, answered = 0;
for (let i = 0; i < 70; i++) {
  const s = await save();
  if (s.status !== 'playing') break;
  if (s.businesses[0].decision) {
    if (!decisionTested) {
      decisionTested = true;
      const wk = s.week;
      check('decision card is shown', await ev(`!document.getElementById('decisionCard').classList.contains('hidden')`), s.businesses[0].decision.title);
      check('week button says "decide first"', (await ev(`document.querySelector('#nextBtn span').textContent`)) === 'Decide first');
      await press(' ');
      check('Space does not open the week while a decision is open', (await save()).week === wk);
      await hideToast();
      await shot('decision-dark-1440.png');
      await theme('light'); await shot('decision-light-1440.png'); await theme('dark');
      await size(1180, 820, true); await shot('decision-ipad-landscape.png'); await size(1440, 900);
      await answerDecisionIfAny();
      const after = await save();
      check('answering clears the decision', !after.businesses[0].decision, after.log[0].text);
      check('week button is back to "open next week"', (await ev(`document.querySelector('#nextBtn span').textContent`)) === 'Open next week');
    } else await answerDecisionIfAny();
    answered++;
  }
  await ev(`document.getElementById('nextBtn').click()`); await sleep(40);
  await ev(`document.getElementById('overlay').classList.add('hidden')`);
}
check('a decision appeared within 70 weeks', decisionTested, `${answered} answered`);
await answerDecisionIfAny(); await hideToast();

// --- screenshots at the standard sizes
check('no page scrolling at 1440x900', (await ev('document.documentElement.scrollHeight - innerHeight')) <= 1);
await ev(`document.querySelector('[data-tab="cardNews"]').click()`);
await shot('courier-dark-1440.png');
await theme('light'); await shot('courier-light-1440.png'); await theme('dark');
await ev(`document.querySelector('[data-tab="cardProgress"]').click()`);
await shot('game-dark-1440.png');
await size(1920, 1080); await shot('game-dark-1920.png');
await size(1180, 820, true); await shot('game-dark-ipad-landscape.png');
await size(820, 1180, true); await theme('light'); await shot('game-light-ipad-portrait.png');
await cmd('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
check('keyboard hints hidden on touch devices', (await ev(`getComputedStyle(document.getElementById('keysBtn')).display`)) === 'none');

check('no JavaScript errors', errors.length === 0, errors.join(' | '));
console.log(fails ? `${fails} FAILED` : 'ALL PASSED', '| screenshots in', OUT);
ws.close(); chrome.kill(); process.exit(fails ? 1 : 0);
