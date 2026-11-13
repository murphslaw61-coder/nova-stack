// Renders the Nova Stack logo set into assets/brand/ from the app icon art
// and the game's display font:  node scripts/render-logo.js
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const dataUri = (f, mime) => `data:${mime};base64,${fs.readFileSync(path.join(root, f)).toString('base64')}`;
const ORBITRON = dataUri('node_modules/@expo-google-fonts/orbitron/800ExtraBold/Orbitron_800ExtraBold.ttf', 'font/ttf');
const EXO = dataUri('node_modules/@expo-google-fonts/exo-2/700Bold/Exo2_700Bold.ttf', 'font/ttf');
const MARK = dataUri('assets/splash-icon.png', 'image/png'); // planet on transparent background

const page = ({ w, h, bg, ink, tag, glow }) => `<!doctype html><html><head><style>
@font-face { font-family: Orbitron; src: url(${ORBITRON}); }
@font-face { font-family: Exo; src: url(${EXO}); }
html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${bg}; }
.wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; gap: ${h * 0.06}px; }
.mark { width: ${h * 0.82}px; height: ${h * 0.82}px; }
.name { font-family: Orbitron; font-size: ${h * 0.2}px; color: ${ink}; letter-spacing: ${h * 0.012}px; line-height: 1;
        ${glow ? `text-shadow: 0 0 ${h * 0.05}px rgba(124,92,255,0.75);` : ''} }
.tag { font-family: Exo; font-size: ${h * 0.055}px; color: ${tag}; letter-spacing: ${h * 0.012}px; margin-top: ${h * 0.04}px; text-transform: uppercase; }
</style></head><body><div class="wrap">
<img class="mark" src="${MARK}"><div><div class="name">NOVA<br>STACK</div><div class="tag">Merge the cosmos</div></div>
</div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const out = (f) => path.join(root, 'assets/brand', f);
  const shot = async (file, opts) => {
    await p.setViewportSize({ width: opts.w, height: opts.h });
    await p.setContent(page(opts));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    await p.screenshot({ path: out(file), omitBackground: opts.bg === 'transparent' });
  };
  const W = 1800, H = 600;
  await shot('nova-stack-logo-dark.png', { w: W, h: H, bg: 'radial-gradient(ellipse at 30% 40%, #2A1F6E 0%, #0E1035 55%, #04050C 100%)', ink: '#F3F5FF', tag: '#3EE6F2', glow: true });
  await shot('nova-stack-logo-light.png', { w: W, h: H, bg: '#FFFFFF', ink: '#12163A', tag: '#5B3FD6', glow: false });
  await shot('nova-stack-logo-transparent-white-text.png', { w: W, h: H, bg: 'transparent', ink: '#FFFFFF', tag: '#3EE6F2', glow: false });
  await shot('nova-stack-logo-transparent-dark-text.png', { w: W, h: H, bg: 'transparent', ink: '#12163A', tag: '#5B3FD6', glow: false });
  await b.close();
  fs.copyFileSync(path.join(root, 'assets/icon.png'), out('nova-stack-app-icon-1024.png'));
  fs.copyFileSync(path.join(root, 'assets/splash-icon.png'), out('nova-stack-mark-transparent-1024.png'));
  console.log('logo set rendered');
})();
