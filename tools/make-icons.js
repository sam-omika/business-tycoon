// Renders icons/icon.svg into the PNG sizes browsers and iPads need.
// Run once after changing the icon: `node tools/make-icons.js` (needs Google Chrome installed, macOS path below).
// - icon-192.png / icon-512.png: rounded icon, used by Chrome/Edge when installing the app
// - icon-maskable-512.png / apple-touch-icon.png: full square background (the OS rounds the corners itself)

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dir = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));

const outputs = [
  { file: 'icon-192.png', size: 192, square: false },
  { file: 'icon-512.png', size: 512, square: false },
  { file: 'icon-maskable-512.png', size: 512, square: true },
  { file: 'apple-touch-icon.png', size: 180, square: true },
];

for (const o of outputs) {
  // Square variants: fill the whole canvas and shrink the artwork into the safe zone.
  const inner = o.square ? Math.round(o.size * 0.86) : o.size;
  const html = `<!DOCTYPE html><html><body style="margin:0;background:${o.square ? '#B8692E' : 'transparent'}">
    <div style="width:${o.size}px;height:${o.size}px;display:flex;align-items:center;justify-content:center">
    <img style="width:${inner}px;height:${inner}px" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">
    </div></body></html>`;
  const page = path.join(tmp, o.file + '.html');
  fs.writeFileSync(page, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    `--window-size=${o.size},${o.size}`, `--screenshot=${path.join(dir, o.file)}`, 'file://' + page,
  ], { stdio: 'ignore' });
  console.log('wrote icons/' + o.file);
}
fs.rmSync(tmp, { recursive: true, force: true });
